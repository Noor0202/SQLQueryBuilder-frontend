// frontend/src/components/QueryBuilder/CaseBuilder.jsx
import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RuleGroup from './RuleGroup';

// Helper to prevent defaulting to a disabled case type
const getDefaultCaseType = (options) => {
  if (options.case_searched || options.case_builder) return 'case_searched';
  if (options.case_simple) return 'case_simple';
  return 'case_searched'; // Fallback
};

// --- INTERNAL RECURSIVE NODE COMPONENT ---
const CaseNode = ({ node, onUpdate, activeTableIds, allTables, options, level = 0 }) => {
  // Extract available columns for simple case mapping
  const availableColumns = useMemo(() => {
    const cols = [];
    allTables.filter(t => activeTableIds.includes(t.Id)).forEach(tDef => {
      tDef.Columns.forEach(cDef => {
        cols.push({ tableId: tDef.Id, colId: cDef.Id, tableName: tDef.TableName, colName: cDef.ColumnName });
      });
    });
    return cols;
  }, [allTables, activeTableIds]);

  const addRule = () => {
    const newRule = {
      id: uuidv4(),
      when_simple: '',
      when_searched: { id: uuidv4(), type: 'group', condition: 'and', rules: [] },
      then: { type: 'scalar', value: '' }
    };
    onUpdate({ ...node, rules: [...(node.rules || []), newRule] });
  };

  const updateRule = (idx, updatedRule) => {
    const newRules = [...node.rules];
    newRules[idx] = updatedRule;
    onUpdate({ ...node, rules: newRules });
  };

  const removeRule = (idx) => {
    const newRules = [...node.rules];
    newRules.splice(idx, 1);
    onUpdate({ ...node, rules: newRules });
  };

  const toggleNesting = (target, idx = null) => {
    const createNewNode = () => ({
      type: getDefaultCaseType(options), 
      base_column: '',
      rules: [{ id: uuidv4(), when_simple: '', when_searched: { id: uuidv4(), type: 'group', condition: 'and', rules: [] }, then: { type: 'scalar', value: '' } }],
      else: { type: 'scalar', value: '' }
    });

    if (target === 'else') {
      const isCurrentlyScalar = node.else?.type === 'scalar';
      // FIX: Alert the user instead of silently swallowing the click
      if (isCurrentlyScalar && !options.case_nested && !options.case_builder) {
        alert("Nested CASEs are currently locked. Please check 'Nested CASE (Multi-level Logic)' in the left sidebar to enable this feature.");
        return;
      }
      const isNested = node.else?.type === 'case_node';
      onUpdate({ ...node, else: isNested ? { type: 'scalar', value: '' } : { type: 'case_node', node: createNewNode() } });
    } else {
      const rule = node.rules[idx];
      const isCurrentlyScalar = rule.then.type === 'scalar';
      // FIX: Alert the user instead of silently swallowing the click
      if (isCurrentlyScalar && !options.case_nested && !options.case_builder) {
        alert("Nested CASEs are currently locked. Please check 'Nested CASE (Multi-level Logic)' in the left sidebar to enable this feature.");
        return;
      }
      const isNested = rule.then.type === 'case_node';
      updateRule(idx, { ...rule, then: isNested ? { type: 'scalar', value: '' } : { type: 'case_node', node: createNewNode() } });
    }
  };

  const updateThenElseValue = (target, val, idx = null) => {
    if (target === 'else') {
      onUpdate({ ...node, else: { ...node.else, value: val } });
    } else {
      updateRule(idx, { ...node.rules[idx], then: { ...node.rules[idx].then, value: val } });
    }
  };

  return (
    <div style={{ background: level > 0 ? '#f8fafc' : 'transparent', padding: level > 0 ? '12px' : '0', borderRadius: '8px', border: level > 0 ? '1px solid #cbd5e1' : 'none' }}>
      
      {/* Type Selector Header */}
      <div className="sql-row" style={{ marginBottom: '12px', background: '#eef2ff', borderColor: '#c7d2fe' }}>
        <span className="sql-keyword" style={{ fontSize: '0.75rem' }}>CASE TYPE:</span>
        <select className="sql-input" value={node.type} onChange={(e) => onUpdate({ ...node, type: e.target.value })} style={{ fontWeight: 600, color: '#4f46e5' }}>
          {/* STRICT UI SYNC: Only show the options they actually enabled in the sidebar */}
          {(options.case_searched || options.case_builder) && (
            <option value="case_searched">Searched CASE (Conditions)</option>
          )}
          {(options.case_simple || options.case_builder) && (
            <option value="case_simple">Simple CASE (Equality Mapping)</option>
          )}
        </select>

        {node.type === 'case_simple' && (
          <>
            <span style={{ fontWeight: 'bold', color: '#64748b' }}>ON</span>
            <select className="sql-input" value={node.base_column || ''} onChange={(e) => onUpdate({ ...node, base_column: e.target.value })}>
              <option value="">Select Base Column...</option>
              {availableColumns.map(c => <option key={`${c.tableId}|${c.colId}`} value={`${c.tableId}|${c.colId}`}>{c.tableName}.{c.colName}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Rule Rows (WHEN / THEN) */}
      <div className="sql-indent-group">
        {(node.rules || []).map((rule, idx) => (
          <div key={rule.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
            
            {/* WHEN BLOCK */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div className="sql-logic" style={{ marginTop: '6px', width: '50px' }}>WHEN</div>
              
              {node.type === 'case_simple' ? (
                <input type="text" className="sql-input" placeholder="Exact Match Value..." value={rule.when_simple} onChange={(e) => updateRule(idx, { ...rule, when_simple: e.target.value })} style={{ width: '200px' }} />
              ) : (
                <div style={{ flex: 1, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px' }}>
                  <RuleGroup ruleGroup={rule.when_searched} onUpdate={(u) => updateRule(idx, { ...rule, when_searched: u })} options={options} availableTables={activeTableIds} isRoot={true} />
                </div>
              )}
              <button type="button" className="btn-sql-remove" onClick={() => removeRule(idx)} style={{ marginTop: '4px' }}>✕</button>
            </div>

            {/* THEN BLOCK */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginLeft: '24px' }}>
              <div className="sql-logic" style={{ marginTop: '6px', width: '34px', color: '#10b981' }}>THEN</div>
              <div style={{ flex: 1 }}>
                {rule.then.type === 'scalar' ? (
                  <input type="text" className="sql-input" placeholder="Result Value..." value={rule.then.value} onChange={(e) => updateThenElseValue('then', e.target.value, idx)} style={{ width: '100%', borderColor: '#10b981' }} />
                ) : (
                  <CaseNode node={rule.then.node} onUpdate={(n) => updateRule(idx, { ...rule, then: { ...rule.then, node: n } })} activeTableIds={activeTableIds} allTables={allTables} options={options} level={level + 1} />
                )}
              </div>
              <button 
                type="button"
                className="btn-sql-action" 
                onClick={() => toggleNesting('then', idx)} 
                title={rule.then.type === 'scalar' ? "Nest another CASE" : "Remove Nesting"} 
                style={{ marginTop: '2px' }}
              >
                {rule.then.type === 'scalar' ? '+ Nest' : '↺ Flat'}
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="btn-sql-action" onClick={addRule} style={{ width: 'fit-content', marginBottom: '12px' }}>+ Add WHEN Clause</button>

        {/* ELSE BLOCK */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <div className="sql-logic" style={{ marginTop: '6px', width: '50px', color: '#64748b' }}>ELSE</div>
          <div style={{ flex: 1 }}>
            {node.else?.type === 'scalar' ? (
              <input type="text" className="sql-input" placeholder="Default Fallback Value (Optional)..." value={node.else.value} onChange={(e) => updateThenElseValue('else', e.target.value)} style={{ width: '100%' }} />
            ) : (
              <CaseNode node={node.else?.node} onUpdate={(n) => onUpdate({ ...node, else: { ...node.else, node: n } })} activeTableIds={activeTableIds} allTables={allTables} options={options} level={level + 1} />
            )}
          </div>
          <button 
            type="button"
            className="btn-sql-action" 
            onClick={() => toggleNesting('else')} 
            title={node.else?.type === 'scalar' ? "Nest another CASE" : "Remove Nesting"} 
            style={{ marginTop: '2px' }}
          >
            {node.else?.type === 'scalar' ? '+ Nest' : '↺ Flat'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN EXPORTED COMPONENT ---
export default function CaseBuilder({ cases, setCases, activeTableIds, allTables, options }) {
  const addCase = () => {
    const newCase = {
      id: uuidv4(),
      alias: `custom_col_${cases.length + 1}`,
      node: {
        type: getDefaultCaseType(options),
        base_column: '',
        rules: [{ id: uuidv4(), when_simple: '', when_searched: { id: uuidv4(), type: 'group', condition: 'and', rules: [] }, then: { type: 'scalar', value: '' } }],
        else: { type: 'scalar', value: '' }
      }
    };
    setCases([...cases, newCase]);
  };

  const updateCase = (idx, updatedCase) => {
    const newCases = [...cases];
    newCases[idx] = updatedCase;
    setCases(newCases);
  };

  const removeCase = (idx) => {
    const newCases = [...cases];
    newCases.splice(idx, 1);
    setCases(newCases);
  };

  if (cases.length === 0) {
    return <button type="button" className="btn-sql-action" onClick={addCase}>+ Create Custom CASE Column</button>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {cases.map((c, idx) => (
        <div key={c.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', background: '#ffffff', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.85rem' }}>COLUMN ALIAS:</span>
            <input type="text" className="sql-input" value={c.alias} onChange={(e) => updateCase(idx, { ...c, alias: e.target.value })} style={{ fontWeight: 'bold', borderColor: '#4f46e5', width: '250px' }} />
            <button type="button" className="btn-sql-remove" onClick={() => removeCase(idx)} style={{ position: 'absolute', right: '12px', top: '12px' }}>✕</button>
          </div>
          
          <CaseNode 
            node={c.node} 
            onUpdate={(n) => updateCase(idx, { ...c, node: n })} 
            activeTableIds={activeTableIds} 
            allTables={allTables} 
            options={options} 
          />
        </div>
      ))}
      <button type="button" className="btn-sql-action" onClick={addCase} style={{ width: 'fit-content' }}>+ Add Another CASE Column</button>
    </div>
  );
}