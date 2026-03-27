// src/components/QueryBuilder/RuleGroup.jsx
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import Rule from './Rule';
import { useSchemaConfig } from '../../config/SchemaConfig';

export default function RuleGroup({ ruleGroup, onUpdate, options = {}, isRoot = false, availableTables = [] }) {
  const { schemaConfig } = useSchemaConfig();
  const allTables = schemaConfig?.Tables || [];

  const allowSubqueries = options.subquery !== false;

  const validTableDefs = allTables.filter(t => availableTables.includes(t.Id));

  const addRule = () => {
    onUpdate({ ...ruleGroup, rules: [...ruleGroup.rules, { 
      id: uuidv4(), type: 'rule', table: '', column: '', operator: '', value: '', condition: 'and', timestamp: Date.now() 
    }]});
  };

  const addGroup = () => {
    const now = Date.now();
    onUpdate({ ...ruleGroup, rules: [...ruleGroup.rules, { 
      id: uuidv4(), type: 'group', condition: 'and', timestamp: now,
      rules: [{ id: uuidv4(), type: 'rule', table: '', column: '', operator: '', value: '', condition: 'and', timestamp: now + 1 }] 
    }]});
  };

  const updateChild = (index, updatedChild) => {
    const newRules = [...ruleGroup.rules];
    newRules[index] = updatedChild;
    onUpdate({ ...ruleGroup, rules: newRules });
  };

  const removeChild = (index) => {
    const newRules = [...ruleGroup.rules];
    newRules.splice(index, 1);
    onUpdate({ ...ruleGroup, rules: newRules });
  };

  return (
    <div className="sql-clause">
      {!isRoot && <div className="sql-paren">(</div>}
      
      <div className={!isRoot ? "sql-indent-2" : ""}>
        {ruleGroup.rules.map((child, index) => {
          return (
            <div key={child.id} className="sql-row" style={{ alignItems: child.type === 'group' ? 'flex-start' : 'center' }}>
              
              {/* Inline AND/OR logic block */}
              {index > 0 && (
                <select 
                  className="sql-input sql-logic-select" 
                  value={child.condition || 'and'}
                  onChange={(e) => updateChild(index, { ...child, condition: e.target.value })}
                >
                  <option value="and">AND</option>
                  <option value="or">OR</option>
                </select>
              )}
              {index === 0 && !isRoot && <div style={{width: '65px'}}></div>} {/* Spacer for alignment */}

              {/* Recursive Group or Standard Rule */}
              {child.type === 'group' ? (
                <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
                  <RuleGroup 
                    ruleGroup={child} 
                    onUpdate={(u) => updateChild(index, u)} 
                    options={options}
                    availableTables={availableTables}
                  />
                  <button className="btn-sql-remove" onClick={() => removeChild(index)}>✕</button>
                </div>
              ) : (
                <Rule 
                  rule={child}
                  onUpdate={(u) => updateChild(index, u)} 
                  onDelete={() => removeChild(index)}
                  tables={validTableDefs.length > 0 ? validTableDefs : allTables} 
                />
              )}
            </div>
          );
        })}

        <div className="sql-row" style={{ marginTop: '8px' }}>
          <button className="btn-sql-action" onClick={addRule}>+ Condition</button>
          {allowSubqueries && <button className="btn-sql-action" onClick={addGroup}>+ Nested (Group)</button>}
        </div>
      </div>

      {!isRoot && <div className="sql-paren">)</div>}
    </div>
  );
}