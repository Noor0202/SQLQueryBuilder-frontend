import { SQL_TEMPLATES } from './operatorMapping';

const escapeSQL = (val) => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  return String(val).replace(/'/g, "''");
};

const formatParams = (operator, value) => {
  if (operator.includes('List') || operator.includes('Array')) {
    const parts = String(value).split(',').map(v => v.trim());
    const isNum = parts.every(p => !isNaN(p) && p !== '');
    if (isNum && parts.length > 0) return { list: parts.join(', ') };
    return { list: parts.map(p => `'${escapeSQL(p)}'`).join(', ') };
  }

  if (operator.includes('Between') || operator.includes('Range')) {
    const parts = String(value).split(',').map(v => v.trim());
    const min = parts[0] || '0';
    const max = parts[1] || '0';
    const isNum = !isNaN(min) && !isNaN(max);
    if (isNum) return { min, max };
    return { min: `'${escapeSQL(min)}'`, max: `'${escapeSQL(max)}'` };
  }

  const raw_value = value;
  return { value: `'${escapeSQL(value)}'`, raw_value: isNaN(raw_value) ? raw_value : raw_value };
};

const getColumnNameOnly = (fullColumnId) => {
  if (!fullColumnId) return '';
  const parts = fullColumnId.split('.');
  return parts.length > 0 ? parts[parts.length - 1] : fullColumnId;
};

const extractWhereColumns = (rules) => {
  let cols = [];
  if (!rules) return cols;
  rules.forEach(r => {
    if (r.type === 'group') {
      cols = cols.concat(extractWhereColumns(r.rules));
    } else if (r.table && r.column) {
      cols.push({ table: r.table, column: r.column });
    }
  });
  return cols;
};

// Recursively parses the unified CASE JSON into SQL
const generateCaseSQL = (caseNode, tableToAliasMap, level = 1) => {
  if (!caseNode) return 'NULL';

  const indent = '  '.repeat(level);
  const innerIndent = '  '.repeat(level + 1);
  let sql = `\n${indent}CASE`;

  const resolveValue = (targetNode, depth) => {
    if (!targetNode) return 'NULL';
    if (targetNode.type === 'scalar') {
      const val = targetNode.value.trim();
      if (!val) return 'NULL';
      // Allow raw numbers, otherwise quote strings
      return isNaN(val) ? `'${escapeSQL(val)}'` : val;
    }
    if (targetNode.type === 'case_node' && targetNode.node) {
      return generateCaseSQL(targetNode.node, tableToAliasMap, depth);
    }
    return 'NULL';
  };

  if (caseNode.type === 'case_simple') {
    // FIX: Split by pipe '|' to safely handle schema names with dots like 'public.film'
    const [tId, cId] = (caseNode.base_column || '').split('|');
    const alias = tableToAliasMap[tId] || tId;
    const colName = getColumnNameOnly(cId);
    if (alias && colName) sql += ` ${alias}.${colName}`;
    sql += '\n';

    (caseNode.rules || []).forEach(r => {
      const val = isNaN(r.when_simple) ? `'${escapeSQL(r.when_simple)}'` : r.when_simple;
      sql += `${innerIndent}WHEN ${val} THEN ${resolveValue(r.then, level + 2)}\n`;
    });
  } else {
    sql += '\n';
    (caseNode.rules || []).forEach(r => {
      // Reuse WHERE clause processor for searched conditions
      const conditionSQL = processGroup(r.when_searched, tableToAliasMap, 0).trim();
      const validCond = conditionSQL ? conditionSQL : '1=1 /* Warning: Empty Condition */';
      sql += `${innerIndent}WHEN ${validCond} THEN ${resolveValue(r.then, level + 2)}\n`;
    });
  }

  if (caseNode.else && caseNode.else.value !== '') {
    sql += `${innerIndent}ELSE ${resolveValue(caseNode.else, level + 2)}\n`;
  }

  sql += `${indent}END`;
  return sql;
};

const processGroup = (group, tableToAliasMap, level = 0) => {
  if (!group || !group.rules || group.rules.length === 0) return '';
  const indent = '  '.repeat(level);
  const clauses = [];

  group.rules.forEach((item) => {
    let itemSQL = '';
    if (item.type === 'group') {
      const innerSQL = processGroup(item, tableToAliasMap, level + 1);
      if (innerSQL) itemSQL = `(\n${innerSQL}\n${indent})`;
    } else if (item.table && item.column && item.operator) {
      const template = SQL_TEMPLATES[item.operator];
      if (template) {
        const params = formatParams(item.operator, item.value);
        const tableAlias = tableToAliasMap[item.table] || item.table.split('.').pop();
        const fieldName = `${tableAlias}.${getColumnNameOnly(item.column)}`;

        let sql = template.replace(/{field}/g, fieldName);
        Object.keys(params).forEach(key => { sql = sql.replace(new RegExp(`{${key}}`, 'g'), params[key]); });
        itemSQL = sql;
      }
    }

    if (itemSQL) {
      if (clauses.length > 0) {
        clauses.push(`${indent}${(item.condition || 'AND').toUpperCase()} ${itemSQL}`);
      } else {
        clauses.push(`${indent}${itemSQL}`);
      }
    }
  });
  return clauses.join('\n');
};

const generateFromClause = (query, schemaConfig) => {
  if (!query.baseTable) return { sql: '', aliasMap: {}, tableToAliasMap: {} };

  const aliasMap = {};
  const tableToAliasMap = {};
  let tCounter = 1;

  aliasMap['base'] = `t${tCounter++}`;
  tableToAliasMap[query.baseTable] = aliasMap['base'];

  (query.joins || []).forEach(j => {
    if (j.table) {
      const alias = `t${tCounter++}`;
      aliasMap[j.id] = alias;
      if (!tableToAliasMap[j.table]) tableToAliasMap[j.table] = alias;
    }
  });

  const baseDef = schemaConfig?.Tables?.find(t => t.Id === query.baseTable);
  const baseName = baseDef ? `${baseDef.Schema}.${baseDef.TableName}` : query.baseTable;
  let sql = `FROM ${baseName} ${aliasMap['base']}`;

  (query.joins || []).forEach(join => {
    if (!join.table) return;

    const targetDef = schemaConfig?.Tables?.find(t => t.Id === join.table);
    const targetName = targetDef ? `${targetDef.Schema}.${targetDef.TableName}` : join.table;
    const targetAlias = aliasMap[join.id];
    const joinType = (join.type || 'INNER JOIN').toUpperCase();

    if (joinType.includes('CROSS')) {
      sql += `\n${joinType} ${targetName} ${targetAlias}`;
    } else if (joinType.includes('SELF') || join.table === query.baseTable) {
      const leftCol = getColumnNameOnly(join.onLeft) || targetDef?.Columns[0]?.ColumnName;
      const rightCol = getColumnNameOnly(join.onRight) || targetDef?.Columns[0]?.ColumnName;
      sql += `\nJOIN ${targetName} ${targetAlias} ON ${aliasMap['base']}.${leftCol} = ${targetAlias}.${rightCol}`;
    } else if (join.onLeft && join.onRight) {
      const leftCol = getColumnNameOnly(join.onLeft);
      const rightCol = getColumnNameOnly(join.onRight);
      const leftTableId = join.onLeft.substring(0, join.onLeft.lastIndexOf('.'));

      const lAlias = tableToAliasMap[leftTableId] || leftTableId.split('.').pop();
      sql += `\n${joinType} ${targetName} ${targetAlias} ON ${lAlias}.${leftCol} = ${targetAlias}.${rightCol}`;
    }
  });

  return { sql, aliasMap, tableToAliasMap };
};

export const generatePostgresQuery = (query, schemaConfig, options = {}) => {
  if (!query || !query.baseTable) return '-- Select a FROM table to start building the query.';

  const { sql: fromClause, tableToAliasMap } = generateFromClause(query, schemaConfig);

  // --- Process SELECT Columns ---
  let selectColumns = '*';

  if (options.select_column && query.selectAll === false) {
    const colFragments = new Set();

    // 1. Add explicitly selected columns with unique AS aliases
    Object.keys(query.selectedColumns || {}).forEach(tableId => {
      const alias = tableToAliasMap[tableId];
      if (!alias) return;
      (query.selectedColumns[tableId] || []).forEach(colId => {
        const colName = getColumnNameOnly(colId);
        colFragments.add(`${alias}.${colName} AS "${alias}_${colName}"`);
      });
    });

    // 2. Auto-inject columns used in WHERE clause with unique AS aliases
    const whereCols = extractWhereColumns(query.rules);
    whereCols.forEach(wc => {
      const alias = tableToAliasMap[wc.table];
      if (alias) {
        const colName = getColumnNameOnly(wc.column);
        colFragments.add(`${alias}.${colName} AS "${alias}_${colName}"`);
      }
    });

    if (colFragments.size > 0) {
      selectColumns = Array.from(colFragments).join(', ');
    } else {
      selectColumns = Object.values(tableToAliasMap).map(a => `${a}.*`).join(', ');
    }
  } else if (!options.select_column || query.selectAll !== false) {
    selectColumns = Object.values(tableToAliasMap).map(a => `${a}.*`).join(', ');
  }

  // --- ADD THIS BLOCK TO INJECT CASE STATEMENTS ---
  const showCaseBuilder = options.case_builder || options.case_simple || options.case_searched || options.case_nested;
  
  if (showCaseBuilder && query.cases && query.cases.length > 0) {
    const caseFragments = query.cases.map(c => {
      const caseSql = generateCaseSQL(c.node, tableToAliasMap, 1);
      const safeAlias = escapeSQL(c.alias || 'custom_case_col');
      return `${caseSql} AS "${safeAlias}"`;
    });
    // Append to existing select columns safely
    selectColumns += selectColumns ? `, ${caseFragments.join(', ')}` : caseFragments.join(', ');
  }
  // ------------------------------------------------

  const distinctKeyword = options.distinct ? 'DISTINCT ' : '';
  let finalSql = `SELECT ${distinctKeyword}${selectColumns}\n${fromClause}`;

  const whereSql = processGroup(query, tableToAliasMap);
  if (whereSql) {
    finalSql += `\nWHERE ${whereSql}`;
  }

  // --- Process ORDER BY ---
  if (options.orderBy && query.orderBys && query.orderBys.length > 0) {
    const orderFragments = [];
    query.orderBys.forEach(ob => {
      if (ob.column) {
        // Split unique composite key 'tableId|colId'
        const [tId, cId] = ob.column.split('|');
        const alias = tableToAliasMap[tId] || tId.split('.').pop();
        // Safe fallback to ASC
        orderFragments.push(`${alias}.${getColumnNameOnly(cId)} ${ob.direction || 'ASC'}`);
      }
    });

    if (orderFragments.length > 0) {
      finalSql += `\nORDER BY ${orderFragments.join(', ')}`;
    }
  }

  // --- Process LIMIT ---
  if (options.limit && query.limit) {
    const limitValue = parseInt(query.limit, 10);
    if (!isNaN(limitValue) && limitValue > 0) {
      finalSql += `\nLIMIT ${limitValue}`;
    }
  }

  return finalSql;
};