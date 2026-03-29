import React, { useMemo } from 'react';
import { getApplicableOperatorGroups, OPERATOR_GROUPS } from '../../config/datatypemapper';

export default function Rule({ rule, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast, tables, options }) {

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
      <select className={`sql-input ${!rule.table ? 'invalid' : ''}`} value={rule.table} onChange={(e) => onUpdate({ ...rule, table: e.target.value, column: '', operator: '', value: '' })}>
        <option value="">Table...</option>
        {tables.map(t => <option key={t.Id} value={t.Id}>{t.TableName}</option>)}
      </select>
      
      <span style={{color: '#94a3b8', fontWeight: 'bold'}}>.</span>

      <select className={`sql-input ${!rule.column && rule.table ? 'invalid' : ''}`} value={rule.column} onChange={(e) => onUpdate({ ...rule, column: e.target.value, operator: '', value: '' })} disabled={!rule.table}>
        <option value="">Column...</option>
        {columns.map(c => <option key={c.Id} value={c.Id}>{c.ColumnName}</option>)}
      </select>

      <select className={`sql-input ${!rule.operator && rule.column ? 'invalid' : ''}`} style={{color: '#2563eb', fontWeight: '800'}} value={rule.operator} onChange={(e) => onUpdate({ ...rule, operator: e.target.value, value: '' })} disabled={!rule.column}>
        <option value="">Operator...</option>
        {Object.entries(groupedOperators).map(([groupName, ops]) => (
          <optgroup key={groupName} label={groupName}>
            {ops.map(op => <option key={op} value={op}>{op}</option>)}
          </optgroup>
        ))}
      </select>

      {requiresValue ? (
        <input type="text" className="sql-input" style={{ flex: 1, minWidth: '150px' }} placeholder="Value..." value={rule.value} onChange={(e) => onUpdate({ ...rule, value: e.target.value })} disabled={!rule.operator} />
      ) : (
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', flex: 1, paddingLeft: '8px' }}>
          {rule.operator ? '' : 'Waiting for operator...'}
        </span>
      )}

      <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px', marginLeft: '4px' }}>
        {/* FIX: Changed to dragDrop to match HistoryPanel state keys */}
        {options.dragDrop && (
          <>
            <button className="btn-sql-icon" onClick={onMoveUp} disabled={isFirst} title="Move Up">↑</button>
            <button className="btn-sql-icon" onClick={onMoveDown} disabled={isLast} title="Move Down">↓</button>
          </>
        )}
        <button className="btn-sql-remove" onClick={onDelete} title="Remove Rule">✕</button>
      </div>
    </>
  );
}