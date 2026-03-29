import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import Rule from './Rule';
import { useSchemaConfig } from '../../config/SchemaConfig';

export default function RuleGroup({ ruleGroup, onUpdate, options = {}, isRoot = false, availableTables = [], onDeleteGroup }) {
  const { schemaConfig } = useSchemaConfig();
  const allTables = schemaConfig?.Tables || [];
  const allowSubqueries = options.subquery !== false;

  const validTableDefs = allTables.filter(t => availableTables.includes(t.Id));

  const addRule = () => {
    onUpdate({ ...ruleGroup, rules: [...(ruleGroup.rules || []), { 
      id: uuidv4(), type: 'rule', table: '', column: '', operator: '', value: '', condition: 'and', timestamp: Date.now() 
    }]});
  };

  const addGroup = () => {
    const now = Date.now();
    onUpdate({ ...ruleGroup, rules: [...(ruleGroup.rules || []), { 
      id: uuidv4(), type: 'group', condition: 'and', timestamp: now,
      rules: [{ id: uuidv4(), type: 'rule', table: '', column: '', operator: '', value: '', condition: 'and', timestamp: now + 1 }] 
    }]});
  };

  const updateChild = (index, updatedChild) => {
    const newRules = [...(ruleGroup.rules || [])];
    newRules[index] = updatedChild;
    onUpdate({ ...ruleGroup, rules: newRules });
  };

  const removeChild = (index) => {
    const newRules = [...(ruleGroup.rules || [])];
    newRules.splice(index, 1);
    if (newRules.length === 0 && !isRoot && onDeleteGroup) {
      onDeleteGroup();
    } else {
      onUpdate({ ...ruleGroup, rules: newRules });
    }
  };

  const moveChild = (index, direction) => {
    const newRules = [...(ruleGroup.rules || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newRules.length) return;
    
    [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
    onUpdate({ ...ruleGroup, rules: newRules });
  };

  if (!ruleGroup.rules) return null;

  return (
    <div className={!isRoot ? "sql-indent-group" : ""}>
      {ruleGroup.rules.map((child, index) => {
        return (
          <div key={child.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            
            {index > 0 && (
              <select className="sql-input sql-logic-select" value={child.condition || 'and'} onChange={(e) => updateChild(index, { ...child, condition: e.target.value })}>
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            )}
            {index === 0 && !isRoot && <div style={{width: '80px', flexShrink: 0}}></div>} 

            {child.type === 'group' ? (
              <div style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', background: '#ffffff' }}>
                <RuleGroup 
                  ruleGroup={child} 
                  onUpdate={(u) => updateChild(index, u)} 
                  onDeleteGroup={() => removeChild(index)}
                  options={options}
                  availableTables={availableTables}
                />
              </div>
            ) : (
              <div className="sql-row" style={{ flex: 1 }}>
                <Rule 
                  rule={child}
                  onUpdate={(u) => updateChild(index, u)} 
                  onDelete={() => removeChild(index)}
                  onMoveUp={() => moveChild(index, -1)}
                  onMoveDown={() => moveChild(index, 1)}
                  isFirst={index === 0}
                  isLast={index === ruleGroup.rules.length - 1}
                  tables={validTableDefs}
                  options={options} 
                />
              </div>
            )}
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button className="btn-sql-action" onClick={addRule}>+ Condition</button>
        {allowSubqueries && <button className="btn-sql-action" onClick={addGroup}>+ Nested Group</button>}
      </div>
    </div>
  );
}