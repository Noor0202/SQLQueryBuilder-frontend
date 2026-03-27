// src/components/QueryBuilder/Rule.jsx
import React, { useMemo } from 'react';
import { useSchemaConfig } from '../../config/SchemaConfig';
import { getApplicableOperatorGroups, OPERATOR_GROUPS } from '../../config/datatypemapper';

export default function Rule({ rule, onUpdate, onDelete, tables }) {
  const { schemaConfig } = useSchemaConfig();

  const columns = useMemo(() => {
    if (!rule.table) return [];
    const tableObj = tables.find(t => t.Id === rule.table);
    return tableObj ? tableObj.Columns : [];
  }, [tables, rule.table]);

  const { groupedOperators, requiresValue } = useMemo(() => {
    if (!rule.column || !columns.length) return { groupedOperators: {}, requiresValue: false };
    const colObj = columns.find(c => c.Id === rule.column);
    if (!colObj) return { groupedOperators: {}, requiresValue: false };

    const applicableGroups = getApplicableOperatorGroups(colObj.DataType);
    let reqVal = false;
    const groupMap = {};

    applicableGroups.forEach(groupKey => {
      const groupDef = OPERATOR_GROUPS[groupKey];
      if (groupDef) {
        groupMap[groupDef.name] = groupDef.operators;
        if (groupDef.operators.includes(rule.operator)) reqVal = groupDef.requiresValue;
      }
    });
    return { groupedOperators: groupMap, requiresValue: reqVal };
  }, [rule.column, rule.operator, columns]);

  return (
    <>
      <select className="sql-input" value={rule.table} onChange={(e) => onUpdate({ ...rule, table: e.target.value, column: '', operator: '', value: '' })}>
        <option value="">Table...</option>
        {tables.map(t => <option key={t.Id} value={t.Id}>{t.TableName}</option>)}
      </select>
      
      <span style={{color: '#94a3b8', fontWeight: 'bold'}}>.</span>

      <select className="sql-input" value={rule.column} onChange={(e) => onUpdate({ ...rule, column: e.target.value, operator: '', value: '' })} disabled={!rule.table}>
        <option value="">Column...</option>
        {columns.map(c => <option key={c.Id} value={c.Id}>{c.ColumnName}</option>)}
      </select>

      <select className="sql-input" style={{color: '#9333ea', fontWeight: 'bold'}} value={rule.operator} onChange={(e) => onUpdate({ ...rule, operator: e.target.value, value: '' })} disabled={!rule.column}>
        <option value="">Operator...</option>
        {Object.entries(groupedOperators).map(([groupName, ops]) => (
          <optgroup key={groupName} label={groupName}>
            {ops.map(op => <option key={op} value={op}>{op}</option>)}
          </optgroup>
        ))}
      </select>

      {requiresValue ? (
        <input 
          type="text" 
          className="sql-input" 
          style={{ border: '1px solid #cbd5e1', background: '#fff' }}
          placeholder="Value..." 
          value={rule.value} 
          onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
          disabled={!rule.operator}
        />
      ) : (
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', minWidth: '100px' }}>
          {rule.operator ? '' : '...'}
        </span>
      )}

      <button className="btn-sql-remove" onClick={onDelete} title="Remove Rule">✕</button>
    </>
  );
}