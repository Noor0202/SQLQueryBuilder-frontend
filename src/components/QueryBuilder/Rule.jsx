// src/components/QueryBuilder/Rule.jsx
import React, { useMemo } from 'react';
import { useSchemaConfig } from '../../config/SchemaConfig';
import { getApplicableOperatorGroups, OPERATOR_GROUPS } from '../../config/datatypemapper';

export default function Rule({ rule, index, isFirstInRoot, onUpdate, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, canDelete, options = {}, tables }) {
  const { schemaConfig } = useSchemaConfig();

  const whereEnabled = options.where !== false;
  const allowDragDrop = options.dragDrop === true;

  const availableTables = tables || schemaConfig?.Tables || [];

  const columns = useMemo(() => {
    if (!rule.table) return [];
    const tableObj = (schemaConfig?.Tables || []).find(t => t.Id === rule.table);
    return tableObj ? tableObj.Columns : [];
  }, [schemaConfig, rule.table]);

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

  const handleTableChange = (e) => {
    onUpdate({ ...rule, table: e.target.value, column: '', operator: '', value: '' });
  };

  return (
    <div className="rule-row-compact">
      
      {/* INLINE LOGIC SELECTOR (Fixed Width for Alignment) */}
      <div className="logic-indicator">
        {!isFirstInRoot ? (
          <select 
            className={`logic-pill ${rule.condition === 'or' ? 'is-or' : ''}`}
            value={rule.condition || 'and'}
            onChange={(e) => onUpdate({ ...rule, condition: e.target.value })}
          >
            <option value="and">AND</option>
            <option value="or">OR</option>
          </select>
        ) : (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>WHERE</span>
        )}
      </div>

      {/* TABLE SELECTOR */}
      <select className="modern-input" value={rule.table} onChange={handleTableChange}>
        <option value="">Table...</option>
        {availableTables.map(t => (
          <option key={t.Id} value={t.Id}>{t.TableName}</option>
        ))}
      </select>

      {whereEnabled && (
        <>
          <select 
            className="modern-input" 
            value={rule.column} 
            onChange={(e) => onUpdate({ ...rule, column: e.target.value, operator: '', value: '' })}
            disabled={!rule.table}
          >
            <option value="">Column...</option>
            {columns.map(c => (
              <option key={c.Id} value={c.Id}>{c.ColumnName}</option>
            ))}
          </select>

          <select 
            className="modern-input" 
            value={rule.operator} 
            onChange={(e) => onUpdate({ ...rule, operator: e.target.value, value: '' })}
            disabled={!rule.column}
          >
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
              className="modern-input" 
              placeholder="Value..." 
              value={rule.value} 
              onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
              disabled={!rule.operator}
            />
          ) : (
             <div className="modern-input" style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontStyle: 'italic', maxWidth: '120px' }}>
                {rule.operator ? 'No value' : ''}
             </div>
          )}
        </>
      )}

      {/* STRICT RIGHT-ALIGNED ACTIONS */}
      <div className="rule-actions">
        {allowDragDrop && (
          <>
            <button className="icon-btn" onClick={onMoveUp} disabled={!canMoveUp} title="Move Up">↑</button>
            <button className="icon-btn" onClick={onMoveDown} disabled={!canMoveDown} title="Move Down">↓</button>
          </>
        )}
        <button className="icon-btn danger" onClick={onDelete} disabled={!canDelete} title="Remove Rule">✕</button>
      </div>
    </div>
  );
}