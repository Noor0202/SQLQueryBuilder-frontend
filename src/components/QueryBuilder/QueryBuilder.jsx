// src/components/QueryBuilder/QueryBuilder.jsx
import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RuleGroup from './RuleGroup';
import { useSchemaConfig } from '../../config/SchemaConfig';
import '../../styles/QueryBuilder.css';

export default function QueryBuilder({ query, setQuery, createDefaultQuery, onRun, options = {} }) {
  const { schemaConfig } = useSchemaConfig();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!schemaConfig) {
    return <div className="p-4 text-gray-500">Please select a database connection.</div>;
  }

  const getUsedTablesAndColumns = () => {
    const usedTables = new Set();
    const autoCols = {};
    const traverse = (g) => {
      if (!g || !g.rules) return;
      g.rules.forEach(r => {
        if (r.type === 'group') traverse(r);
        else if (r.table) {
          usedTables.add(r.table);
          if (r.column) {
            if (!autoCols[r.table]) autoCols[r.table] = new Set();
            autoCols[r.table].add(r.column);
          }
        }
      });
    };
    traverse(query);
    return { tablesArray: Array.from(usedTables), autoCols };
  };

  const { tablesArray, autoCols } = getUsedTablesAndColumns();
  const isAutoOn = query.autoSelectUsedColumns !== false;

  const handleRemoveColumn = (tableId, colId) => {
    const current = query.selectedColumns?.[tableId] || [];
    setQuery({
      ...query,
      selectedColumns: { ...(query.selectedColumns || {}), [tableId]: current.filter(id => id !== colId) }
    });
  };

  const handleAddColumn = (tableId, colId) => {
    const current = query.selectedColumns?.[tableId] || [];
    if (!current.includes(colId)) {
      setQuery({
        ...query,
        selectedColumns: { ...(query.selectedColumns || {}), [tableId]: [...current, colId] }
      });
    }
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  return (
    <div className="query-builder">
      <div className="qb-header">
        <h3>Query Builder</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-add" onClick={() => setQuery(createDefaultQuery())} style={{ borderColor: '#e2e8f0', color: '#64748b', borderStyle: 'solid' }}>
            Reset
          </button>
          <button className="btn-add" onClick={onRun} style={{ background: '#3b82f6', color: 'white', border: 'none', borderStyle: 'solid' }}>
            ▶ Run Query
          </button>
        </div>
      </div>

      {options?.select_column && tablesArray.length > 0 && (
        <div className="col-selector-container" ref={dropdownRef}>
          <div className="col-selector-header">
            <span className="col-selector-title">Select Columns</span>
            <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isAutoOn} 
                onChange={() => setQuery({ ...query, autoSelectUsedColumns: !isAutoOn })}
                style={{ accentColor: '#3b82f6' }}
              />
              Auto-include rule columns
            </label>
          </div>

          <div className="col-input-wrapper" onClick={() => setIsDropdownOpen(true)}>
            {tablesArray.map(tableId => {
              const tableDef = schemaConfig.Tables.find(t => t.Id === tableId);
              if (!tableDef) return null;

              const manualCols = query.selectedColumns?.[tableId] || [];
              const autoRuleCols = isAutoOn && autoCols[tableId] ? Array.from(autoCols[tableId]) : [];
              const allRendered = [];
              
              manualCols.forEach(colId => {
                const colDef = tableDef.Columns.find(c => c.Id === colId);
                if (colDef && !autoRuleCols.includes(colId)) {
                  allRendered.push(
                    <span key={`manual-${colId}`} className="col-chip">
                      <span className="chip-table">{tableDef.TableName}</span>
                      <span className="chip-col">{colDef.ColumnName}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveColumn(tableId, colId); }}>✕</button>
                    </span>
                  );
                }
              });

              autoRuleCols.forEach(colId => {
                const colDef = tableDef.Columns.find(c => c.Id === colId);
                if (colDef) {
                  allRendered.push(
                    <span key={`auto-${colId}`} className="col-chip auto-chip" title="Automatically included">
                      <span className="chip-table">{tableDef.TableName}</span>
                      <span className="chip-col">{colDef.ColumnName}</span>
                    </span>
                  );
                }
              });

              return allRendered;
            })}

            <input 
              type="text" 
              className="col-search-input"
              placeholder="Search & add columns..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
              onFocus={() => setIsDropdownOpen(true)}
            />

            {isDropdownOpen && (
              <div className="col-dropdown-menu">
                {tablesArray.map(tableId => {
                  const tableDef = schemaConfig.Tables.find(t => t.Id === tableId);
                  if (!tableDef) return null;

                  const filteredCols = tableDef.Columns.filter(c => 
                    c.ColumnName.toLowerCase().includes(searchTerm.toLowerCase())
                  );

                  if (filteredCols.length === 0) return null;

                  return (
                    <div key={`group-${tableId}`}>
                      <div className="col-dropdown-group">{tableDef.TableName}</div>
                      {filteredCols.map(col => {
                        const isManual = (query.selectedColumns?.[tableId] || []).includes(col.Id);
                        const isAuto = isAutoOn && autoCols[tableId]?.has(col.Id);
                        if (isManual || isAuto) return null;

                        return (
                          <div 
                            key={`opt-${col.Id}`} 
                            className="col-dropdown-item"
                            onClick={(e) => { e.stopPropagation(); handleAddColumn(tableId, col.Id); }}
                          >
                            <span>{col.ColumnName}</span>
                            <span style={{color: '#94a3b8', fontSize: '16px'}}>+</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rules-scroll-area">
        <RuleGroup 
          ruleGroup={query} 
          onUpdate={setQuery} 
          options={options}
          isRoot={true}
          level={0}
        />
      </div>
    </div>
  );
}