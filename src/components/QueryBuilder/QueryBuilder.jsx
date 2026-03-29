import React, { useState, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RuleGroup from './RuleGroup';
import { useSchemaConfig } from '../../config/SchemaConfig';
import '../../styles/QueryBuilder.css';

export default function QueryBuilder({ query, setQuery, createDefaultQuery, onRun, options = {} }) {
  const { schemaConfig } = useSchemaConfig();
  const allTables = schemaConfig?.Tables || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [focusedColIndex, setFocusedColIndex] = useState(-1);
  const colMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!schemaConfig) return <div className="p-4 text-gray-500">Please select a database connection.</div>;

  const activeJoinTypes = [
    { id: 'inner_join', label: 'INNER JOIN' },
    { id: 'left_join', label: 'LEFT JOIN' },
    { id: 'right_join', label: 'RIGHT JOIN' },
    { id: 'full_join', label: 'FULL JOIN' },
    { id: 'cross_join', label: 'CROSS JOIN' },
    { id: 'self_join', label: 'SELF JOIN' }
  ].filter(j => options[j.id]);

  const hasJoinsEnabled = activeJoinTypes.length > 0;

  const activeTableIds = useMemo(() => {
    return [query.baseTable, ...(query.joins || []).map(j => j.table)].filter(Boolean);
  }, [query.baseTable, query.joins]);

  const availableTableDefs = useMemo(() => {
    return allTables.filter(t => activeTableIds.includes(t.Id));
  }, [allTables, activeTableIds]);

  const whereCols = useMemo(() => {
    let cols = [];
    const extract = (rules) => {
      if (!rules) return;
      rules.forEach(r => {
        if (r.type === 'group') extract(r.rules);
        else if (r.table && r.column) cols.push({ table: r.table, column: r.column });
      });
    };
    extract(query.rules);
    return cols;
  }, [query.rules]);

  const displayCols = useMemo(() => {
    const map = {};
    Object.keys(query.selectedColumns || {}).forEach(t => { map[t] = new Set(query.selectedColumns[t]); });
    whereCols.forEach(wc => {
      if (!map[wc.table]) map[wc.table] = new Set();
      map[wc.table].add(wc.column);
    });
    return map;
  }, [query.selectedColumns, whereCols]);

  const isSelectAll = query.selectAll !== false;

  // Calculate available columns purely for the ORDER BY dropdown (Restricted to selected columns)
  const availableOrderByColumns = useMemo(() => {
    const cols = [];
    if (!query.baseTable) return cols;

    if (options.select_column && !isSelectAll) {
      Object.keys(displayCols).forEach(tableId => {
        const tDef = availableTableDefs.find(t => t.Id === tableId);
        if (tDef) {
          Array.from(displayCols[tableId]).forEach(colId => {
            const cDef = tDef.Columns.find(c => c.Id === colId);
            if (cDef) {
              cols.push({ tableId, colId, tableName: tDef.TableName, colName: cDef.ColumnName });
            }
          });
        }
      });
    } else {
      availableTableDefs.forEach(tDef => {
        tDef.Columns.forEach(cDef => {
          cols.push({ tableId: tDef.Id, colId: cDef.Id, tableName: tDef.TableName, colName: cDef.ColumnName });
        });
      });
    }
    return cols;
  }, [query.baseTable, options.select_column, isSelectAll, displayCols, availableTableDefs]);

  const getRelatedTableIds = (currentActiveIds) => {
    const related = new Set();
    currentActiveIds.forEach(id => {
      const def = allTables.find(t => t.Id === id);
      if (def?.Joins) def.Joins.forEach(j => related.add(j.ChildTableId));
    });
    allTables.forEach(t => {
      if (t.Joins) t.Joins.forEach(j => { if (currentActiveIds.includes(j.ChildTableId)) related.add(t.Id); });
    });
    return Array.from(related).filter(id => !currentActiveIds.includes(id));
  };

  // --- STATE HANDLERS ---
  const handleBaseTableChange = (tableId) => {
    setQuery({
      ...query,
      baseTable: tableId,
      joins: [], 
      selectedColumns: {}, 
      selectAll: true, 
      rules: [{ id: uuidv4(), type: 'rule', table: '', column: '', operator: '', value: '', condition: 'and', timestamp: Date.now() }],
      orderBys: [] // Clear Order By on base reset
    });
  };

  const addJoin = () => {
    const newJoin = { id: uuidv4(), type: activeJoinTypes[0]?.label || 'INNER JOIN', table: '', onLeft: '', onRight: '' };
    setQuery({ ...query, joins: [...(query.joins || []), newJoin] });
  };

  const handleJoinTableChange = (idx, newTableId) => {
    const newJoins = [...(query.joins || [])];
    const join = { ...newJoins[idx], table: newTableId };
    const isSelf = newTableId === query.baseTable || join.type.includes('SELF');
    
    if (isSelf) {
       const targetDef = allTables.find(t => t.Id === newTableId);
       const pk = targetDef?.Columns?.find(c => c.IsPrimaryKey) || targetDef?.Columns?.[0];
       join.onLeft = pk?.Id || '';
       join.onRight = pk?.Id || '';
    } else {
       const previousActiveIds = [query.baseTable, ...newJoins.slice(0, idx).map(j => j.table)].filter(Boolean);
       for (const prevId of previousActiveIds) {
         const prevDef = allTables.find(t => t.Id === prevId);
         const relToChild = prevDef?.Joins?.find(j => j.ChildTableId === newTableId);
         if (relToChild) { join.onLeft = relToChild.ParentColumnId; join.onRight = relToChild.ChildColumnId; break; }
         
         const newDef = allTables.find(t => t.Id === newTableId);
         const relToParent = newDef?.Joins?.find(j => j.ChildTableId === prevId);
         if (relToParent) { join.onLeft = relToParent.ChildColumnId; join.onRight = relToParent.ParentColumnId; break; }
       }
    }

    newJoins[idx] = join;
    setQuery({ ...query, joins: newJoins });
  };

  const removeJoin = (idx) => {
    const removedTable = query.joins[idx].table;
    const newJoins = [...query.joins];
    newJoins.splice(idx, 1);

    const newCols = { ...query.selectedColumns };
    delete newCols[removedTable];

    const cleanRules = (rules) => rules
        .filter(r => r.type === 'group' || r.table !== removedTable)
        .map(r => r.type === 'group' ? { ...r, rules: cleanRules(r.rules) } : r)
        .filter(r => r.type !== 'group' || r.rules.length > 0);

    // Scrub Order Bys that referenced the removed table
    const newOrderBys = (query.orderBys || []).filter(ob => {
        if (!ob.column) return true;
        const [tId] = ob.column.split('|');
        return tId !== removedTable;
    });

    setQuery({ ...query, joins: newJoins, selectedColumns: newCols, rules: cleanRules(query.rules || []), orderBys: newOrderBys });
  };

  const updateJoin = (idx, key, val) => {
    const newJoins = [...(query.joins || [])];
    newJoins[idx] = { ...newJoins[idx], [key]: val };
    
    if (key === 'type' && val.includes('CROSS')) {
      newJoins[idx].onLeft = '';
      newJoins[idx].onRight = '';
    }
    setQuery({ ...query, joins: newJoins });
  };

  // --- ORDER BY HANDLERS ---
  const addOrderBy = () => {
    setQuery({ ...query, orderBys: [...(query.orderBys || []), { id: uuidv4(), column: '', direction: 'ASC' }]});
  };

  const updateOrderBy = (idx, key, val) => {
    const newObs = [...(query.orderBys || [])];
    newObs[idx] = { ...newObs[idx], [key]: val };
    setQuery({ ...query, orderBys: newObs });
  };

  const removeOrderBy = (idx) => {
    const newObs = [...(query.orderBys || [])];
    newObs.splice(idx, 1);
    setQuery({ ...query, orderBys: newObs });
  };

  const moveOrderBy = (idx, dir) => {
    const newObs = [...(query.orderBys || [])];
    const target = idx + dir;
    if (target >= 0 && target < newObs.length) {
      [newObs[idx], newObs[target]] = [newObs[target], newObs[idx]];
      setQuery({ ...query, orderBys: newObs });
    }
  };

  // --- Select Column Search Navigation ---
  const filteredColumnsList = useMemo(() => {
    if (!searchTerm) return [];
    const list = [];
    availableTableDefs.forEach(table => {
      table.Columns.filter(c => c.ColumnName.toLowerCase().includes(searchTerm.toLowerCase())).forEach(col => {
        list.push({ table, col });
      });
    });
    return list;
  }, [availableTableDefs, searchTerm]);

  const addSelectedColumn = (tableId, colId) => {
    const current = query.selectedColumns?.[tableId] || [];
    if (!current.includes(colId)) {
      setQuery({ ...query, selectedColumns: { ...(query.selectedColumns || {}), [tableId]: [...current, colId] }});
    }
    setSearchTerm('');
    setIsColMenuOpen(false);
    setFocusedColIndex(-1);
  };

  const handleColSearchKeyDown = (e) => {
    if (!isColMenuOpen && e.key === 'Enter') { setIsColMenuOpen(true); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedColIndex(prev => (prev < filteredColumnsList.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedColIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedColIndex >= 0 && filteredColumnsList[focusedColIndex]) {
        const { table, col } = filteredColumnsList[focusedColIndex];
        addSelectedColumn(table.Id, col.Id);
      }
    } else if (e.key === 'Escape') {
      setIsColMenuOpen(false);
      setFocusedColIndex(-1);
    }
  };

  let stepCounter = 1;

  return (
    <div className="query-builder">
      <div className="qb-header">
        <h3>Visual SQL Editor</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-sql-action" onClick={() => setQuery(createDefaultQuery())}>Reset Editor</button>
          <button className="btn-sql-action btn-sql-primary" onClick={onRun}>▶ Run Query</button>
        </div>
      </div>

      <div className="sql-editor-canvas">

        {/* STEP: SELECT CLAUSE */}
        {options.select_column && (
          <div className={`qb-step ${!query.baseTable ? 'disabled' : ''}`}>
            <div className="step-header">
              <div className="sql-keyword">
                <span className="step-badge">{stepCounter++}</span> SELECT COLUMNS 
                {options.distinct && <span className="sql-distinct-badge">DISTINCT ACTIVE</span>}
              </div>
            </div>

            <div className="radio-toggle-group">
              <label className="radio-label">
                <input type="radio" checked={isSelectAll} onChange={() => setQuery({...query, selectAll: true})} disabled={!query.baseTable} /> 
                Auto-Select All Columns (*)
              </label>
              <label className="radio-label">
                <input type="radio" checked={!isSelectAll} onChange={() => setQuery({...query, selectAll: false})} disabled={!query.baseTable} /> 
                Specific Columns (Auto-includes WHERE columns)
              </label>
            </div>

            {!isSelectAll && (
              <div ref={colMenuRef} style={{ position: 'relative' }}>
                <div className="sql-token-container">
                  {Object.keys(displayCols).map(tableId => {
                    const tableDef = availableTableDefs.find(t => t.Id === tableId);
                    if (!tableDef) return null; 
                    
                    return Array.from(displayCols[tableId]).map(colId => {
                      const colDef = tableDef.Columns.find(c => c.Id === colId);
                      if (!colDef) return null;
                      
                      const isWhereForced = whereCols.some(wc => wc.table === tableId && wc.column === colId);

                      return (
                        <span key={`${tableId}-${colId}`} className="sql-token">
                          {tableDef.TableName}.{colDef.ColumnName}
                          <button onClick={() => {
                            if (isWhereForced) {
                              alert("This column is structurally required by your WHERE condition. To remove it, delete the corresponding rule first.");
                              return;
                            }
                            const currentCols = query.selectedColumns[tableId] || [];
                            const nextCols = currentCols.filter(id => id !== colId);
                            
                            // Scrub ORDER BYs if they use this deleted column
                            const newOrderBys = (query.orderBys || []).filter(ob => ob.column !== `${tableId}|${colId}`);

                            setQuery({ ...query, selectedColumns: { ...query.selectedColumns, [tableId]: nextCols }, orderBys: newOrderBys });
                          }}>✕</button>
                        </span>
                      );
                    });
                  })}
                  
                  <input 
                    className="sql-search-input" 
                    placeholder="Search columns to add..."
                    value={searchTerm}
                    disabled={!query.baseTable}
                    onChange={(e) => { setSearchTerm(e.target.value); setIsColMenuOpen(true); }}
                    onFocus={() => setIsColMenuOpen(true)}
                    onKeyDown={handleColSearchKeyDown}
                  />
                </div>

                {isColMenuOpen && filteredColumnsList.length > 0 && (
                  <div className="sql-dropdown">
                    {filteredColumnsList.map((item, index) => (
                      <div 
                        key={`${item.table.Id}-${item.col.Id}`} 
                        className={`sql-dropdown-item ${index === focusedColIndex ? 'focused' : ''}`}
                        style={index === focusedColIndex ? { background: '#eef2ff', borderLeft: '3px solid #4f46e5' } : {}}
                        onMouseEnter={() => setFocusedColIndex(index)}
                        onClick={() => addSelectedColumn(item.table.Id, item.col.Id)}
                      >
                        {item.col.ColumnName}
                        <span className="sql-dropdown-table-name">{item.table.TableName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP: FROM CLAUSE */}
        <div className="qb-step">
          <div className="step-header">
            <div className="sql-keyword"><span className="step-badge">{stepCounter++}</span> FROM TABLE</div>
          </div>
          <select className="sql-input" value={query.baseTable || ''} onChange={(e) => handleBaseTableChange(e.target.value)}>
            <option value="">Select Primary Table...</option>
            {allTables.map(t => <option key={t.Id} value={t.Id}>{t.TableName}</option>)}
          </select>
        </div>

        {/* STEP: JOINS */}
        {hasJoinsEnabled && (
          <div className={`qb-step ${!query.baseTable ? 'disabled' : ''}`}>
            <div className="step-header">
              <div className="sql-keyword"><span className="step-badge">{stepCounter++}</span> JOINS</div>
              <button className="btn-sql-action" onClick={addJoin} disabled={!query.baseTable}>+ Add Join</button>
            </div>
            
            <div className="sql-indent-group" style={{borderLeft: 'none', marginLeft: 0, paddingLeft: 0}}>
              {(query.joins || []).map((join, idx) => {
                 const relatedIds = getRelatedTableIds([query.baseTable, ...query.joins.slice(0,idx).map(j=>j.table)].filter(Boolean));
                 const baseDefsForLeft = availableTableDefs.slice(0, idx + 1); 
                 const joinTableDef = allTables.find(t => t.Id === join.table);
                 const isCross = join.type.includes('CROSS');
                 const isSelf = join.table === query.baseTable || join.type.includes('SELF');

                 return (
                  <div key={join.id} className="sql-row" style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto auto auto 40px', alignItems: 'center' }}>
                    
                    <select className="sql-input sql-logic-select" value={join.type} onChange={(e) => updateJoin(idx, 'type', e.target.value)}>
                      {activeJoinTypes.map(jt => <option key={jt.id} value={jt.label}>{jt.label}</option>)}
                    </select>

                    <select className={`sql-input ${!join.table ? 'invalid' : ''}`} value={join.table} onChange={(e) => handleJoinTableChange(idx, e.target.value)}>
                      <option value="">Select Target Table...</option>
                      {isSelf ? (
                        <option value={query.baseTable}>★ {allTables.find(t=>t.Id === query.baseTable)?.TableName} (Self)</option>
                      ) : isCross ? (
                        allTables.map(t => <option key={t.Id} value={t.Id}>{t.TableName}</option>)
                      ) : (
                        allTables.filter(t => relatedIds.includes(t.Id)).map(t => <option key={t.Id} value={t.Id}>★ {t.TableName}</option>)
                      )}
                    </select>
                    
                    {!isCross && (
                      <>
                        <span className="sql-logic">ON</span>
                        <select disabled={!isSelf} className={`sql-input ${!join.onLeft ? 'invalid' : ''}`} value={join.onLeft} onChange={(e) => updateJoin(idx, 'onLeft', e.target.value)}>
                          <option value="">Left Column...</option>
                          {baseDefsForLeft.map(td => (
                            <optgroup key={td.Id} label={td.TableName}>
                              {td.Columns.map(c => <option key={c.Id} value={c.Id}>{c.ColumnName}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <span style={{fontWeight: '800', color: '#64748b'}}>=</span>
                        <select disabled={!isSelf} className={`sql-input ${!join.onRight ? 'invalid' : ''}`} value={join.onRight} onChange={(e) => updateJoin(idx, 'onRight', e.target.value)}>
                          <option value="">Right Column...</option>
                          {joinTableDef?.Columns.map(c => <option key={c.Id} value={c.Id}>{c.ColumnName}</option>)}
                        </select>
                      </>
                    )}
                    {isCross && <div style={{gridColumn: 'span 4'}}></div>}
                    
                    <button className="btn-sql-remove" onClick={() => removeJoin(idx)}>✕</button>
                  </div>
                 )
              })}
              {query.joins?.length === 0 && <span style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>No joins configured.</span>}
            </div>
          </div>
        )}

        {/* STEP: WHERE CLAUSE */}
        {options.where !== false && (
          <div className={`qb-step ${!query.baseTable ? 'disabled' : ''}`}>
            <div className="step-header">
              <div className="sql-keyword"><span className="step-badge">{stepCounter++}</span> CONDITIONS (WHERE)</div>
            </div>
            
            <RuleGroup 
              ruleGroup={query} 
              onUpdate={setQuery} 
              options={options}
              isRoot={true}
              availableTables={activeTableIds} 
            />
          </div>
        )}

        {/* STEP: ORDER BY CLAUSE */}
        {options.orderBy && (
          <div className={`qb-step ${!query.baseTable ? 'disabled' : ''}`}>
            <div className="step-header">
              <div className="sql-keyword"><span className="step-badge">{stepCounter++}</span> ORDER BY</div>
              <button className="btn-sql-action" onClick={addOrderBy} disabled={!query.baseTable || availableOrderByColumns.length === 0}>+ Add Sort</button>
            </div>
            
            <div className="sql-indent-group" style={{borderLeft: 'none', marginLeft: 0, paddingLeft: 0}}>
              {(query.orderBys || []).map((ob, idx) => (
                 <div key={ob.id} className="sql-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    
                    <select 
                      className={`sql-input ${!ob.column ? 'invalid' : ''}`} 
                      value={ob.column} 
                      onChange={(e) => updateOrderBy(idx, 'column', e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select Column to Sort...</option>
                      {availableOrderByColumns.map(c => (
                         <option 
                           key={`${c.tableId}|${c.colId}`} 
                           value={`${c.tableId}|${c.colId}`}
                           disabled={(query.orderBys || []).some((o, i) => i !== idx && o.column === `${c.tableId}|${c.colId}`)}
                         >
                           {c.tableName}.{c.colName}
                         </option>
                      ))}
                    </select>

                    <select 
                      className="sql-input sql-logic-select" 
                      value={ob.direction} 
                      onChange={(e) => updateOrderBy(idx, 'direction', e.target.value)}
                      style={{ width: '90px' }}
                    >
                      <option value="ASC">ASC</option>
                      <option value="DESC">DESC</option>
                    </select>

                    <div style={{ display: 'flex', gap: '4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px', marginLeft: '4px' }}>
                        <button className="btn-sql-icon" onClick={() => moveOrderBy(idx, -1)} disabled={idx === 0} title="Move Up">↑</button>
                        <button className="btn-sql-icon" onClick={() => moveOrderBy(idx, 1)} disabled={idx === (query.orderBys || []).length - 1} title="Move Down">↓</button>
                        <button className="btn-sql-remove" onClick={() => removeOrderBy(idx)} title="Remove Sort">✕</button>
                    </div>
                 </div>
              ))}
{query.orderBys?.length === 0 && <span style={{fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic'}}>No sorting applied.</span>}
            </div>
          </div>
        )}

        {/* STEP: LIMIT CLAUSE */}
        {options.limit && (
          <div className={`qb-step ${!query.baseTable ? 'disabled' : ''}`}>
            <div className="step-header" style={{ marginBottom: '8px' }}>
              <div className="sql-keyword"><span className="step-badge">{stepCounter++}</span> LIMIT RESULTS</div>
            </div>
            
            <div className="sql-row" style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Limit to:</span>
              <input
                type="number"
                min="1"
                className="sql-input"
                placeholder="e.g., 100"
                value={query.limit || ''}
                onChange={(e) => setQuery({ ...query, limit: e.target.value })}
                disabled={!query.baseTable}
                style={{ width: '120px', textAlign: 'center' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>rows</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}