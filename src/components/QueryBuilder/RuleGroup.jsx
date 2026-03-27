// src/components/QueryBuilder/RuleGroup.jsx
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import Rule from './Rule';
import { useSchemaConfig } from '../../config/SchemaConfig';

export default function RuleGroup({ ruleGroup, onUpdate, options = {}, ancestorTables = [], isRoot = false, level = 0 }) {
  const { schemaConfig } = useSchemaConfig();
  const allTables = schemaConfig?.Tables || [];

  const allowWhere = options.where !== false;
  const allowSubqueries = options.subquery !== false;
  const allowDragDrop = options.dragDrop === true;
  const joinEnabled = options.inner_join || options.left_join || options.right_join || options.full_join || options.cross_join || options.self_join;

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
    <div className={isRoot ? '' : 'tree-group'} data-level={level}>
      {ruleGroup.rules.map((child, index) => {
        const canMoveUp = index > 0;
        const canMoveDown = index < ruleGroup.rules.length - 1;
        const canDeleteChild = ruleGroup.rules.length > 1;

        return (
          <div key={child.id} className={isRoot && index === 0 ? '' : 'tree-node'}>
            
            {child.type === 'group' ? (
              <div className="rule-row-compact" style={{ alignItems: 'flex-start', padding: '12px 8px' }}>
                <div className="logic-indicator">
                  {index > 0 && (
                    <select 
                      className={`logic-pill ${child.condition === 'or' ? 'is-or' : ''}`}
                      value={child.condition || 'and'}
                      onChange={(e) => updateChild(index, { ...child, condition: e.target.value })}
                    >
                      <option value="and">AND</option>
                      <option value="or">OR</option>
                    </select>
                  )}
                </div>
                
                <div style={{ flex: 1 }}>
                  <RuleGroup 
                    ruleGroup={child} 
                    onUpdate={(u) => updateChild(index, u)} 
                    options={options}
                    ancestorTables={allKnownTables}
                    level={level + 1}
                  />
                </div>

                <div className="rule-actions">
                  <button className="icon-btn danger" onClick={() => removeChild(index)} disabled={!canDeleteChild} title="Remove Sub-Group">✕</button>
                </div>
              </div>
            ) : (
              <Rule 
                rule={child}
                index={index}
                isFirstInRoot={isRoot && index === 0}
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
          </div>
        );
      })}

      {canAddMoreRules && (
        <div className="tree-actions" style={{ marginLeft: isRoot ? '0' : '88px' }}>
          <button className="btn-add" onClick={addRule}>+ Add Rule</button>
          {allowSubqueries && allowWhere && (
            <button className="btn-add" onClick={addGroup}>+ Add Subgroup</button>
          )}
        </div>
      )}
    </div>
  );
}