// src/components/QueryBuilder/QueryBuilder.jsx
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RuleGroup from './RuleGroup';
import { useSchemaConfig } from '../../config/SchemaConfig';
import '../../styles/QueryBuilder.css';
import '../../styles/SelectColumns.css';

export default function QueryBuilder({ query, setQuery, createDefaultQuery, onRun, options = {} }) {
  
  const { schemaConfig } = useSchemaConfig();
  
  // State to track which table's dropdown is currently open
  const [openDropdown, setOpenDropdown] = useState(null);

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.sc-dropdown-wrapper')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear the entire query?")) {
      setQuery(createDefaultQuery());
    }
  };

  const handleRunQuery = () => {
    if (onRun) {
      onRun(); 
    } else {
      alert("Run functionality not connected.");
    }
  };

  if (!schemaConfig) {
    return <div className="p-4 text-gray-500">Please select a database connection.</div>;
  }

  return (
    <div className="query-builder">
      <div className="qb-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Query Builder</h3>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-sm"
            onClick={handleReset}
            style={{ 
              backgroundColor: '#fff', 
              border: '1px solid #cbd5e1', 
              color: '#64748b' 
            }}
            title="Clear all rules"
          >
            Reset
          </button>
          
          <button 
            className="btn btn-sm"
            onClick={handleRunQuery}
            style={{ 
              backgroundColor: 'var(--color-primary)', 
              color: 'white',
              border: '1px solid var(--color-primary)'
            }}
          >
            Run Query
          </button>
        </div>
      </div>

      {/* --- COMPACT MODERN SELECT COLUMNS UI --- */}
      {options?.select_column && (() => {
        const usedTables = new Set();
        const usedColumns = {};

        const traverse = (g) => {
          if (!g || !g.rules) return;
          g.rules.forEach(r => {
            if (r.type === 'group') traverse(r);
            else if (r.table) {
              usedTables.add(r.table);
              if (r.column) {
                if (!usedColumns[r.table]) usedColumns[r.table] = new Set();
                usedColumns[r.table].add(r.column);
              }
            }
          });
        };
        traverse(query);
        const tablesArray = Array.from(usedTables);

        if (tablesArray.length === 0) {
          return (
            <div className="sc-card">
              <h4 className="sc-title">Select Columns</h4>
              <p className="sc-subtitle" style={{ marginTop: '4px', color: '#ea580c', fontWeight: '500' }}>
                Please add a rule and select a table below. The columns will appear here automatically.
              </p>
            </div>
          );
        }

        const isAutoOn = query.autoSelectUsedColumns || false;

        const handleToggle = () => {
          setQuery({ ...query, autoSelectUsedColumns: !isAutoOn });
        };

        const handleColumnSelect = (tableId, colId, checked) => {
          const current = query.selectedColumns?.[tableId] || [];
          let next = checked ? [...current, colId] : current.filter(id => id !== colId);

          setQuery({
            ...query,
            selectedColumns: { ...(query.selectedColumns || {}), [tableId]: next }
          });
        };

        return (
          <div className="sc-card">
            <div className="sc-header">
              <div>
                <h4 className="sc-title">Select Columns</h4>
                <p className="sc-subtitle">Choose columns for your SELECT statement.</p>
              </div>
              <div className="sc-toggle-container">
                <span className="sc-toggle-label">Auto-Select Rule Columns</span>
                <label className="sc-switch">
                  <input type="checkbox" checked={isAutoOn} onChange={handleToggle} />
                  <span className="sc-slider round"></span>
                </label>
              </div>
            </div>

            <div className="sc-compact-grid">
              {tablesArray.map(tableId => {
                const tableDef = schemaConfig?.Tables?.find(t => t.Id === tableId);
                if (!tableDef) return null;

                const manual = query.selectedColumns?.[tableId] || [];
                const auto = isAutoOn && usedColumns[tableId] ? Array.from(usedColumns[tableId]) : [];
                const effectiveSelected = new Set([...manual, ...auto]);

                const isOpen = openDropdown === tableId;

                // Create display text for the pseudo-input
                const selectedNames = Array.from(effectiveSelected)
                  .map(id => tableDef.Columns.find(c => c.Id === id)?.ColumnName)
                  .filter(Boolean);
                
                let displayText = <span className="sc-trigger-text placeholder">Select columns... ({tableDef.Columns.length})</span>;
                if (selectedNames.length === 1) {
                  displayText = <span className="sc-trigger-text">{selectedNames[0]}</span>;
                } else if (selectedNames.length > 1 && selectedNames.length <= 3) {
                  displayText = <span className="sc-trigger-text">{selectedNames.join(', ')}</span>;
                } else if (selectedNames.length > 3) {
                  displayText = <span className="sc-trigger-text font-medium text-blue-600">{selectedNames.length} columns selected</span>;
                }

                return (
                  <div key={tableId} className="sc-dropdown-wrapper">
                    <label className="sc-table-label">
                      <span style={{color: '#3b82f6'}}>▤</span> {tableDef.TableName}
                    </label>
                    
                    {/* The Input-like Trigger */}
                    <div 
                      className={`sc-dropdown-trigger ${isOpen ? 'active' : ''}`}
                      onClick={() => setOpenDropdown(isOpen ? null : tableId)}
                    >
                      {displayText}
                      <span className="sc-chevron">▼</span>
                    </div>

                    {/* The Absolute Floating Dropdown Menu */}
                    {isOpen && (
                      <div className="sc-dropdown-menu">
                        {tableDef.Columns.map(col => {
                          const isSelected = effectiveSelected.has(col.Id);
                          const isAutoSelected = isAutoOn && usedColumns[tableId]?.has(col.Id);
                          
                          return (
                            <label key={col.Id} className={`sc-col-item ${isSelected ? 'selected' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isAutoSelected}
                                onChange={(e) => handleColumnSelect(tableId, col.Id, e.target.checked)}
                              />
                              <span className="sc-col-name">{col.ColumnName}</span>
                              {isAutoSelected && <span className="sc-badge">In Rule</span>}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      {/* --- END SELECT COLUMNS UI --- */}

      <div className="rules-scroll-container">
        <RuleGroup 
          ruleGroup={query} 
          onUpdate={handleQueryChange} 
          options={options}
        />
      </div>

    </div>
  );
}