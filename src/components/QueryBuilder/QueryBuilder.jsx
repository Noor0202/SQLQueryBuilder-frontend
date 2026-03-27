// src/components/QueryBuilder/QueryBuilder.jsx
import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RuleGroup from './RuleGroup';
import { useSchemaConfig } from '../../config/SchemaConfig';
import '../../styles/QueryBuilder.css';

export default function QueryBuilder({ query, setQuery, createDefaultQuery, onRun, options = {} }) {
  const { schemaConfig } = useSchemaConfig();
  const allTables = schemaConfig?.Tables || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const colMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!schemaConfig) return <div className="p-4 text-gray-500">Please select a database connection.</div>;

  // Derive active Joins based on History Panel toggles
  const activeJoinTypes = [
    { id: 'inner_join', label: 'INNER JOIN' },
    { id: 'left_join', label: 'LEFT JOIN' },
    { id: 'right_join', label: 'RIGHT JOIN' },
    { id: 'full_join', label: 'FULL JOIN' },
    { id: 'cross_join', label: 'CROSS JOIN' },
    { id: 'self_join', label: 'SELF JOIN' }
  ].filter(j => options[j.id]);

  const hasJoinsEnabled = activeJoinTypes.length > 0;

  // Handlers for dynamic base query setup
  const setBaseTable = (tableId) => setQuery({ ...query, baseTable: tableId });
  
  const addJoin = () => {
    const newJoin = { id: uuidv4(), type: activeJoinTypes[0].label, table: '', onLeft: '', onRight: '' };
    setQuery({ ...query, joins: [...(query.joins || []), newJoin] });
  };

  const updateJoin = (idx, updatedJoin) => {
    const newJoins = [...(query.joins || [])];
    newJoins[idx] = updatedJoin;
    setQuery({ ...query, joins: newJoins });
  };

  const removeJoin = (idx) => {
    const newJoins = [...(query.joins || [])];
    newJoins.splice(idx, 1);
    setQuery({ ...query, joins: newJoins });
  };

  return (
    <div className="query-builder">
      <div className="qb-header">
        <h3>Visual SQL Editor</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-sql-action" onClick={() => setQuery(createDefaultQuery())}>Reset Editor</button>
          <button className="btn-sql-action" onClick={onRun} style={{ background: '#2563eb', color: 'white', border: 'none' }}>▶ Run Query</button>
        </div>
      </div>

      <div className="sql-editor-canvas">

        {/* --- SELECT CLAUSE --- */}
        {(options.select !== false || options.select_column) && (
          <div className="sql-clause">
            <div className="sql-keyword">SELECT</div>
            <div className="sql-indent-1" ref={colMenuRef} style={{ position: 'relative' }}>
              <div className="sql-token-container">
                {Object.keys(query.selectedColumns || {}).map(tableId => {
                  const tableDef = allTables.find(t => t.Id === tableId);
                  return (query.selectedColumns[tableId] || []).map(colId => {
                    const colDef = tableDef?.Columns.find(c => c.Id === colId);
                    if (!tableDef || !colDef) return null;
                    return (
                      <span key={`${tableId}-${colId}`} className="sql-token">
                        {tableDef.TableName}.{colDef.ColumnName}
                        <button onClick={() => {
                          const nextCols = query.selectedColumns[tableId].filter(id => id !== colId);
                          setQuery({ ...query, selectedColumns: { ...query.selectedColumns, [tableId]: nextCols } });
                        }}>✕</button>
                      </span>
                    );
                  });
                })}
                <input 
                  className="sql-search-input" 
                  placeholder={Object.keys(query.selectedColumns || {}).length === 0 ? "* (All Columns)" : "Search columns..."}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setIsColMenuOpen(true); }}
                  onFocus={() => setIsColMenuOpen(true)}
                />
              </div>

              {isColMenuOpen && (
                <div className="sql-dropdown">
                  {allTables.map(table => (
                    table.Columns.filter(c => c.ColumnName.toLowerCase().includes(searchTerm.toLowerCase())).map(col => (
                      <div 
                        key={`${table.Id}-${col.Id}`} 
                        className="sql-dropdown-item"
                        onClick={() => {
                          const current = query.selectedColumns?.[table.Id] || [];
                          if (!current.includes(col.Id)) {
                            setQuery({ ...query, selectedColumns: { ...(query.selectedColumns || {}), [table.Id]: [...current, col.Id] }});
                          }
                          setSearchTerm(''); setIsColMenuOpen(false);
                        }}
                      >
                        <span style={{color: '#94a3b8', fontSize: '0.75rem', marginRight: '6px'}}>{table.TableName}</span>
                        {col.ColumnName}
                      </div>
                    ))
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- FROM CLAUSE --- */}
        <div className="sql-clause">
          <div className="sql-keyword">FROM</div>
          <div className="sql-indent-1">
            <select className="sql-input" value={query.baseTable || ''} onChange={(e) => setBaseTable(e.target.value)}>
              <option value="">Select Primary Table...</option>
              {allTables.map(t => <option key={t.Id} value={t.Id}>{t.TableName}</option>)}
            </select>
          </div>
        </div>

        {/* --- JOIN CLAUSE (Dynamic explicit joins) --- */}
        {hasJoinsEnabled && (
          <div className="sql-clause">
            <div className="sql-keyword" style={{display:'flex', justifyContent:'space-between', width:'400px'}}>
              <span>JOINS</span>
              <button className="btn-sql-action" onClick={addJoin}>+ Add Join</button>
            </div>
            
            {(query.joins || []).map((join, idx) => {
               const joinTableDef = allTables.find(t => t.Id === join.table);
               const baseTableDef = allTables.find(t => t.Id === query.baseTable);

               return (
                <div key={join.id} className="sql-indent-1" style={{ paddingBottom: '8px' }}>
                  <div className="sql-row">
                    <select className="sql-input sql-logic-select" style={{width: '140px'}} value={join.type} onChange={(e) => updateJoin(idx, {...join, type: e.target.value})}>
                      {activeJoinTypes.map(jt => <option key={jt.id} value={jt.label}>{jt.label}</option>)}
                    </select>
                    <select className="sql-input" value={join.table} onChange={(e) => updateJoin(idx, {...join, table: e.target.value})}>
                      <option value="">Select Table to Join...</option>
                      {allTables.map(t => <option key={t.Id} value={t.Id}>{t.TableName}</option>)}
                    </select>
                    <button className="btn-sql-remove" onClick={() => removeJoin(idx)}>✕</button>
                  </div>
                  
                  {/* ON Condition (Indented Level 2) */}
                  <div className="sql-indent-2">
                    <div className="sql-row">
                      <span className="sql-logic">ON</span>
                      <select className="sql-input" value={join.onLeft} onChange={(e) => updateJoin(idx, {...join, onLeft: e.target.value})}>
                        <option value="">Left Column...</option>
                        {baseTableDef?.Columns.map(c => <option key={c.Id} value={`${query.baseTable}.${c.Id}`}>{baseTableDef.TableName}.{c.ColumnName}</option>)}
                      </select>
                      <span style={{fontWeight: 'bold', color: '#64748b'}}>=</span>
                      <select className="sql-input" value={join.onRight} onChange={(e) => updateJoin(idx, {...join, onRight: e.target.value})}>
                        <option value="">Right Column...</option>
                        {joinTableDef?.Columns.map(c => <option key={c.Id} value={`${join.table}.${c.Id}`}>{joinTableDef.TableName}.{c.ColumnName}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
               )
            })}
          </div>
        )}

        {/* --- WHERE CLAUSE (Recursive Rule Tree rendered as Parentheses) --- */}
        {options.where !== false && (
          <div className="sql-clause">
            <div className="sql-keyword">WHERE</div>
            <div className="sql-indent-1">
              <RuleGroup 
                ruleGroup={query} 
                onUpdate={setQuery} 
                options={options}
                isRoot={true}
                availableTables={query.baseTable ? [query.baseTable, ...(query.joins || []).map(j => j.table)] : []}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}