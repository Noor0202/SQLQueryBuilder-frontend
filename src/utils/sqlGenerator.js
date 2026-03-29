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

  let selectColumns = '*';
  
  if (options.select_column && query.selectAll === false) {
    const colFragments = new Set();
    
    Object.keys(query.selectedColumns || {}).forEach(tableId => {
      const alias = tableToAliasMap[tableId];
      if (!alias) return;
      (query.selectedColumns[tableId] || []).forEach(colId => {
        colFragments.add(`${alias}.${getColumnNameOnly(colId)}`);
      });
    });

    const whereCols = extractWhereColumns(query.rules);
    whereCols.forEach(wc => {
      const alias = tableToAliasMap[wc.table];
      if (alias) colFragments.add(`${alias}.${getColumnNameOnly(wc.column)}`);
    });

    if (colFragments.size > 0) {
      selectColumns = Array.from(colFragments).join(', ');
    } else {
      selectColumns = Object.values(tableToAliasMap).map(a => `${a}.*`).join(', ');
    }
  } else if (!options.select_column || query.selectAll !== false) {
    selectColumns = Object.values(tableToAliasMap).map(a => `${a}.*`).join(', ');
  }

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
        orderFragments.push(`${alias}.${getColumnNameOnly(cId)} ${ob.direction}`);
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