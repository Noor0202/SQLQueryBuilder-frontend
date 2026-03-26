// src/components/QueryBuilder/RuleGroup.jsx
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import Rule from './Rule';
import { useSchemaConfig } from '../../config/SchemaConfig';

export default function RuleGroup({ ruleGroup, onUpdate, level = 0, options = {}, ancestorTables = [] }) {
  const { schemaConfig } = useSchemaConfig();
  const allTables = schemaConfig?.Tables || [];

  const allowSelect = options.select !== false;
  const allowWhere = options.where !== false;
  const allowSubqueries = options.subquery !== false;
  const allowDragDrop = options.dragDrop === true;
const joinEnabled = options.inner_join || options.left_join || options.right_join || options.full_join || options.cross_join || options.self_join;

  // Gather ALL tables selected anywhere in this group and its subgroups (Order Independent)
  const getAllSelectedTables = (group) => {
    let tables = [];
    if (!group || !group.rules) return tables;
    group.rules.forEach(r => {
      if (r.type === 'rule' && r.table) tables.push(r.table);
      if (r.type === 'group') tables = tables.concat(getAllSelectedTables(r));
    });
    return tables;
  };

  const currentGroupTables = getAllSelectedTables(ruleGroup);
  const allKnownTables = [...new Set([...ancestorTables, ...currentGroupTables])];

  const availableTablesList = (() => {
    if (!allTables.length) return [];

    if (!joinEnabled) {
      if (allKnownTables.length === 0) return allTables;
      return allTables.filter(t => t.Id === allKnownTables[0]);
    }

    if (allKnownTables.length === 0) return allTables;

    const validTables = new Set(allKnownTables);
    
    allKnownTables.forEach(selectedTableId => {
      const tableDef = allTables.find(t => t.Id === selectedTableId);
      if (tableDef && tableDef.Joins) {
        tableDef.Joins.forEach(j => validTables.add(j.ChildTableId));
      }
    });
    
    return allTables.filter(t => validTables.has(t.Id));
  })();

  const addRule = () => {
    // CRITICAL FIX: Inject a timestamp to lock in chronological order for the JOIN structure
    const newRule = { 
      id: uuidv4(), 
      type: 'rule', 
      table: '', 
      column: '', 
      operator: '', 
      value: '', 
      condition: 'and',
      timestamp: Date.now() 
    };
    onUpdate({ ...ruleGroup, rules: [...ruleGroup.rules, newRule] });
  };

  const addGroup = () => {
    const now = Date.now();
    const newGroup = { 
      id: uuidv4(), 
      type: 'group', 
      condition: 'and', 
      timestamp: now,
      rules: [
        { 
          id: uuidv4(), 
          type: 'rule', 
          table: '', 
          column: '', 
          operator: '', 
          value: '', 
          condition: 'and',
          timestamp: now + 1 
        }
      ] 
    };
    onUpdate({ ...ruleGroup, rules: [...ruleGroup.rules, newGroup] });
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

  const moveChild = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newRules = [...ruleGroup.rules];
      [newRules[index - 1], newRules[index]] = [newRules[index], newRules[index - 1]];
      onUpdate({ ...ruleGroup, rules: newRules });
    } else if (direction === 'down' && index < ruleGroup.rules.length - 1) {
      const newRules = [...ruleGroup.rules];
      [newRules[index + 1], newRules[index]] = [newRules[index], newRules[index + 1]];
      onUpdate({ ...ruleGroup, rules: newRules });
    }
  };

  const canAddMoreRules = allowWhere || joinEnabled || ruleGroup.rules.length === 0;

  return (
    <div className="rule-group" style={{ marginLeft: level > 0 ? '2rem' : '0' }}>
      
      <div className="group-rules" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {ruleGroup.rules.map((child, index) => {
          const canMoveUp = index > 0;
          const canMoveDown = index < ruleGroup.rules.length - 1;
          const canDeleteChild = ruleGroup.rules.length > 1;

          return (
            <React.Fragment key={child.id}>
              {index > 0 && (allowWhere || joinEnabled) && (
                <div className="logic-separator" style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0 0.5rem 1.5rem' }}>
                  <select 
                    className="logic-badge" 
                    value={child.condition || 'and'}
                    onChange={(e) => {
                      const newRules = [...ruleGroup.rules];
                      newRules[index] = { ...child, condition: e.target.value };
                      onUpdate({ ...ruleGroup, rules: newRules });
                    }}
                    style={{ cursor: 'pointer', outline: 'none', background: 'white' }}
                  >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                </div>
              )}

              {child.type === 'group' ? (
                <div className="nested-group-wrapper" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <RuleGroup 
                      ruleGroup={child} 
                      onUpdate={(u) => updateChild(index, u)} 
                      level={level + 1}
                      options={options}
                      ancestorTables={allKnownTables}
                    />
                  </div>
                  <div className="rule-actions" style={{ paddingTop: '0.5rem' }}>
                    {allowDragDrop && (
                      <>
                        <button className="btn-move" onClick={() => moveChild(index, 'up')} disabled={!canMoveUp}>↑</button>
                        <button className="btn-move" onClick={() => moveChild(index, 'down')} disabled={!canMoveDown}>↓</button>
                      </>
                    )}
                    <button 
                      className="btn-remove" 
                      onClick={() => removeChild(index)}
                      disabled={!canDeleteChild}
                      title={canDeleteChild ? "Remove Group" : "Cannot delete the last item in this group"}
                      style={{ 
                        opacity: canDeleteChild ? 1 : 0.5, 
                        cursor: canDeleteChild ? 'pointer' : 'not-allowed' 
                      }}
                    >✕</button>
                  </div>
                </div>
              ) : (
                <Rule 
                  rule={child} 
                  onUpdate={(u) => updateChild(index, u)} 
                  onDelete={() => removeChild(index)}
                  onMoveUp={() => moveChild(index, 'up')}
                  onMoveDown={() => moveChild(index, 'down')}
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  canDelete={canDeleteChild}
                  options={options}
                  tables={availableTablesList} 
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {canAddMoreRules && (allowSelect || allowWhere) && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
          <button className="btn btn-sm btn-add-rule" onClick={addRule}>
            {allowWhere ? '+ Rule' : '+ Table'}
          </button>
          
          {allowSubqueries && allowWhere && (
            <button className="btn btn-sm btn-add-group" onClick={addGroup}>+ Sub-Group</button>
          )}
        </div>
      )}
    </div>
  );
}