// src/components/QueryBuilder/Rule.jsx
import React, { useMemo } from 'react';
import { useSchemaConfig } from '../../config/SchemaConfig';
import { 
  getApplicableOperatorGroups, 
  OPERATOR_GROUPS 
} from '../../config/datatypemapper';

export default function Rule({ rule, onUpdate, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, options = {}, tables }) {
  const { schemaConfig } = useSchemaConfig();

  // Strict Feature Flags
  const selectEnabled = options.select !== false;
  const whereEnabled = options.where !== false;
  const allowDragDrop = options.dragDrop === true;

  // 1. Get Tables List
  const availableTables = tables || schemaConfig?.Tables || [];

  // 2. Get Columns for selected table
  const columns = useMemo(() => {
    if (!rule.table) return [];
    const fullTableList = schemaConfig?.Tables || [];
    const tableObj = fullTableList.find(t => t.Id === rule.table);
    return tableObj ? tableObj.Columns : [];
  }, [schemaConfig, rule.table]);

  // 3. Get Operators & Logic
  const { groupedOperators, requiresValue } = useMemo(() => {
    if (!rule.column || !columns.length) {
      return { groupedOperators: {}, requiresValue: false };
    }

    const colObj = columns.find(c => c.Id === rule.column);
    if (!colObj) return { groupedOperators: {}, requiresValue: false };

    const applicableGroups = getApplicableOperatorGroups(colObj.DataType);
    
    let reqVal = false;
    const groupMap = {};

    applicableGroups.forEach(groupKey => {
      const groupDef = OPERATOR_GROUPS[groupKey];
      if (groupDef) {
        groupMap[groupDef.name] = groupDef.operators;
        if (groupDef.operators.includes(rule.operator)) {
          reqVal = groupDef.requiresValue;
        }
      }
    });

    return { groupedOperators: groupMap, requiresValue: reqVal };
  }, [rule.column, rule.operator, columns]);

  // Handle table change: reset column, operator, value immediately
  const handleTableChange = (e) => {
    onUpdate({ ...rule, table: e.target.value, column: '', operator: '', value: '' });
  };

  return (
    <div className="rule-item" style={{ 
      display: 'grid', 
      // --- CRITICAL FIX ---
      // Dynamically shrink the grid if WHERE is disabled so it only shows the Table picker
      gridTemplateColumns: whereEnabled ? '1.5fr 1.5fr 1.25fr 1.5fr auto' : '1fr auto', 
      gap: '10px', 
      alignItems: 'center' 
    }}>
      {/* TABLE SELECTOR */}
      <select className="input-field m-0" value={rule.table} onChange={handleTableChange}>
        <option value="">-- Select Table --</option>
        {availableTables.map(t => (
          <option key={t.Id} value={t.Id}>{t.TableName}</option>
        ))}
      </select>

      {/* --- CRITICAL FIX --- Only show Column/Operator logic if WHERE is allowed */}
      {whereEnabled && (
        <>
          {/* COLUMN SELECTOR */}
          <select 
            className="input-field m-0" 
            value={rule.column} 
            onChange={(e) => onUpdate({ ...rule, column: e.target.value, operator: '', value: '' })}
            disabled={!rule.table}
          >
            <option value="">-- Select Column --</option>
            {columns.map(c => (
              <option key={c.Id} value={c.Id}>{c.ColumnName}</option>
            ))}
          </select>

          {/* OPERATOR SELECTOR */}
          <select 
            className="input-field m-0" 
            value={rule.operator} 
            onChange={(e) => onUpdate({ ...rule, operator: e.target.value, value: '' })}
            disabled={!rule.column}
          >
            <option value="">-- Operator --</option>
            {Object.entries(groupedOperators).map(([groupName, ops]) => (
              <optgroup key={groupName} label={groupName}>
                {ops.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* VALUE INPUT */}
          {requiresValue ? (
            <input 
              type="text" 
              className="input-field m-0" 
              placeholder="Value..." 
              value={rule.value} 
              onChange={(e) => onUpdate({ ...rule, value: e.target.value })}
              disabled={!rule.operator}
            />
          ) : (
            <div style={{
              color: '#94a3b8', 
              fontSize: '0.8rem', 
              fontStyle: 'italic', 
              textAlign: 'center'
            }}>
              {rule.operator ? 'No value required' : ''}
            </div>
          )}
        </>
      )}

      {/* RULE ACTION CONTROLS */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {allowDragDrop && (
          <>
            <button 
              onClick={onMoveUp} 
              disabled={!canMoveUp}
              title="Move Rule Up"
              style={{ cursor: !canMoveUp ? 'not-allowed' : 'pointer', opacity: !canMoveUp ? 0.4 : 1, padding: '4px 8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#64748b' }}
            >
              ↑
            </button>
            <button 
              onClick={onMoveDown} 
              disabled={!canMoveDown}
              title="Move Rule Down"
              style={{ cursor: !canMoveDown ? 'not-allowed' : 'pointer', opacity: !canMoveDown ? 0.4 : 1, padding: '4px 8px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#64748b' }}
            >
              ↓
            </button>
          </>
        )}
        <button 
          onClick={onDelete}
          title="Remove"
          style={{ cursor: 'pointer', padding: '4px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#ef4444' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}