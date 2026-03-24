// frontend/src/utils/sqlGenerator.js
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
  const quoted_value = `'${escapeSQL(value)}'`;
  
  return { 
    value: quoted_value, 
    raw_value: isNaN(raw_value) ? raw_value : raw_value 
  };
};

/**
 * CRITICAL FIX: Flattens rules and sorts them chronologically by timestamp.
 * This guarantees the Base Table and JOIN structure remains identical 
 * even if rules are violently dragged-and-dropped in the UI.
 */
const extractUniqueTables = (group) => {
  const allRules = [];

  const flatten = (g) => {
    if (!g || !g.rules) return;
    g.rules.forEach(rule => {
      if (rule.type === 'group') {
        flatten(rule);
      } else if (rule.table) {
        allRules.push(rule);
      }
    });
  };

  flatten(group);

  // Stable sort by chronological creation time.
  // The first rule ever created defaults to 0, locking it safely as the Base Table forever.
  allRules.sort((a, b) => {
    const timeA = a.timestamp || 0;
    const timeB = b.timestamp || 0;
    return timeA - timeB;
  });

  const set = new Set();
  allRules.forEach(r => set.add(r.table));
  return set;
};

const getColumnNameOnly = (fullColumnId) => {
  if (!fullColumnId) return '';
  const parts = fullColumnId.split('.');
  return parts.length > 0 ? parts[parts.length - 1] : fullColumnId;
};

// Generates the WHERE clause based STRICTLY on the visual UI order (Drag-and-Drop sequence)
const processGroup = (group, aliasMap, level = 0) => {
  if (!group || !group.rules || group.rules.length === 0) return '';

  const indent = '  '.repeat(level);
  const clauses = [];

  group.rules.forEach((item) => {
    let itemSQL = '';

    if (item.type === 'group') {
      const innerSQL = processGroup(item, aliasMap, level + 1);
      if (innerSQL) itemSQL = `(\n${innerSQL}\n${indent})`; 
    } 
    else if (item.table && item.column && item.operator) {
      const template = SQL_TEMPLATES[item.operator];
      if (template) {
        const params = formatParams(item.operator, item.value);
        const tableAlias = aliasMap[item.table] || item.table;
        const colName = getColumnNameOnly(item.column);
        const fieldName = `${tableAlias}.${colName}`;
        
        let sql = template.replace(/{field}/g, fieldName);
        Object.keys(params).forEach(key => {
          sql = sql.replace(new RegExp(`{${key}}`, 'g'), params[key]);
        });
        itemSQL = sql;
      } else {
        itemSQL = `-- Unknown Operator: ${item.operator}`;
      }
    }

    if (itemSQL) {
      if (clauses.length > 0) {
        const condition = (item.condition || 'AND').toUpperCase();
        clauses.push(`${indent}${condition} ${itemSQL}`);
      } else {
        clauses.push(`${indent}${itemSQL}`);
      }
    }
  });

  return clauses.join('\n');
};

const generateFromClause = (uniqueTables, schemaConfig) => {
  const tables = Array.from(uniqueTables);
  if (tables.length === 0) return { sql: '', aliasMap: {} };

  const aliasMap = {};
  
  tables.forEach((t, index) => {
    aliasMap[t] = `t${index + 1}`;
  });

  const baseTableId = tables[0];
  const baseTableDef = schemaConfig?.Tables?.find(t => t.Id === baseTableId);
  const baseTableName = baseTableDef ? `${baseTableDef.Schema}.${baseTableDef.TableName}` : baseTableId;

  let sql = `FROM ${baseTableName} t1`;
  const joinedSet = new Set([baseTableId]);

  const remaining = tables.slice(1);
  let loops = 0;
  
  while (remaining.length > 0 && loops < 10) {
    loops++;
    
    for (let i = 0; i < remaining.length; i++) {
      const targetId = remaining[i];
      const targetAlias = aliasMap[targetId];
      const targetDef = schemaConfig?.Tables?.find(t => t.Id === targetId);

      if (!targetDef) {
        sql += `\nCROSS JOIN ${targetId} ${targetAlias} -- Warning: Metadata missing`;
        joinedSet.add(targetId);
        remaining.splice(i, 1);
        i--;
        continue;
      }

      let joinFound = false;

      if (targetDef.Joins) {
        for (const join of targetDef.Joins) {
          if (joinedSet.has(join.ChildTableId)) {
            const childAlias = aliasMap[join.ChildTableId];
            const parentAlias = targetAlias; 
            const targetTableName = `${targetDef.Schema}.${targetDef.TableName}`;
            
            const childCol = getColumnNameOnly(join.ChildColumnId);
            const parentCol = getColumnNameOnly(join.ParentColumnId);

            sql += `\nJOIN ${targetTableName} ${targetAlias} ON ${childAlias}.${childCol} = ${parentAlias}.${parentCol}`;
            joinedSet.add(targetId);
            joinFound = true;
            break;
          }
        }
      }

      if (!joinFound) {
        for (const joinedId of joinedSet) {
          const joinedDef = schemaConfig?.Tables?.find(t => t.Id === joinedId);
          if (joinedDef && joinedDef.Joins) {
            for (const join of joinedDef.Joins) {
               if (join.ChildTableId === targetId) {
                  const parentAlias = aliasMap[joinedId]; 
                  const childAlias = targetAlias; 
                  const targetTableName = `${targetDef.Schema}.${targetDef.TableName}`;
                  
                  const childCol = getColumnNameOnly(join.ChildColumnId);
                  const parentCol = getColumnNameOnly(join.ParentColumnId);

                  sql += `\nJOIN ${targetTableName} ${targetAlias} ON ${childAlias}.${childCol} = ${parentAlias}.${parentCol}`;
                  joinedSet.add(targetId);
                  joinFound = true;
                  break;
               }
            }
          }
          if (joinFound) break;
        }
      }

      if (joinFound) {
        remaining.splice(i, 1);
        i--;
      }
    }
  }

  if (remaining.length > 0) {
    remaining.forEach(t => {
      sql += `\nCROSS JOIN ${t} ${aliasMap[t]} -- Warning: No join path found`;
    });
  }

  return { sql, aliasMap };
};

export const generatePostgresQuery = (query, schemaConfig) => {
  if (!query || !query.rules || query.rules.length === 0) return '-- No rules defined';
  
  const uniqueTables = extractUniqueTables(query);
  if (uniqueTables.size === 0) return '-- No tables selected';

  const { sql: fromClause, aliasMap } = generateFromClause(uniqueTables, schemaConfig);

  const selectColumns = Object.values(aliasMap).map(a => `${a}.*`).join(', ');
  const whereBody = processGroup(query, aliasMap, 1);

  let finalSQL = `SELECT ${selectColumns}\n${fromClause}`;
  
  if (whereBody) {
    finalSQL += `\nWHERE\n${whereBody};`;
  } else {
    finalSQL += `;`;
  }

  return finalSQL;
};