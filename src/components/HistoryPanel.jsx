// frontend/src/components/HistoryPanel.jsx
import React, { useEffect, useState, useCallback } from 'react';
import Icon from './Icon';
import api from '../services/api';
import { useSchemaConfig } from '../config/SchemaConfig';
import '../styles/HistoryPanel.css';

// ===== REDESIGNED FEATURE GROUPS =====
const FEATURE_GROUPS = [
  {
    id: 'core',
    label: 'Core & UI Features',
    features: [
      { id: 'select', label: 'Select Data', default: true },
      { id: 'where', label: 'Filter Data (WHERE)', default: true },
      { id: 'select_column', label: 'Column Selector' },
      { id: 'dragDrop', label: 'Drag & Drop Query Builder' },
    ]
  },
  {
    id: 'filtering',
    label: 'Sorting & Grouping',
    features: [
      { id: 'distinct', label: 'Remove Duplicates (DISTINCT)' },
      { id: 'orderBy', label: 'Sort Results (ORDER BY)' },
      { id: 'limit', label: 'Limit Results (LIMIT / OFFSET)' },
      { id: 'groupBy', label: 'Group Data (GROUP BY)' },
      { id: 'having', label: 'Filter Groups (HAVING)' },
      { id: 'aggregates', label: 'Aggregations (SUM, AVG)' },
    ]
  },
  {
    id: 'joins',
    label: 'Table Joins',
    features: [
      { id: 'inner_join', label: 'INNER JOIN (Matching Records)' },
      { id: 'left_join', label: 'LEFT JOIN (All Left + Matching)' },
      { id: 'right_join', label: 'RIGHT JOIN (All Right + Matching)' },
      { id: 'full_join', label: 'FULL JOIN (All Records)' },
      { id: 'cross_join', label: 'CROSS JOIN (All Combinations)' },
      { id: 'self_join', label: 'SELF JOIN (Same Table Join)' },
    ]
  },

  // ===== CASE: TYPES =====
  {
    id: 'case_types',
    label: 'CASE Expression Types',
    features: [
      { id: 'case_simple', label: 'Simple CASE (Equality Based)' },
      { id: 'case_searched', label: 'Searched CASE (Condition Based)' },
      { id: 'case_nested', label: 'Nested CASE (Multi-level Logic)' },
    ]
  },

  // ===== CASE: USAGE CONTEXT =====
  {
    id: 'case_usage',
    label: 'CASE Usage Context',
    features: [
      { id: 'case_select', label: 'CASE in SELECT (Data Transformation)' },
      { id: 'case_where', label: 'CASE in WHERE (Dynamic Filtering)' },
      { id: 'case_orderby', label: 'CASE in ORDER BY (Custom Sorting)' },
      { id: 'case_groupby', label: 'CASE in GROUP BY (Derived Grouping)' },
      { id: 'case_having', label: 'CASE in HAVING (Conditional Group Filter)' },
    ]
  },

  // ===== CASE: ADVANCED PATTERNS =====
  {
    id: 'case_advanced',
    label: 'Advanced CASE Patterns',
    features: [
      { id: 'case_conditional_agg', label: 'Conditional Aggregation (CASE + COUNT/SUM)' },
      { id: 'case_pivot', label: 'Pivoting Data using CASE' },
      { id: 'case_window', label: 'CASE with Window Functions' },
      { id: 'case_null_handling', label: 'NULL Handling using CASE' },
      { id: 'case_dynamic_flags', label: 'Dynamic Flags / Status Logic' },
    ]
  },

  // ===== CASE: RELATED FUNCTIONS =====
  {
    id: 'case_related',
    label: 'CASE Alternatives & Helpers',
    features: [
      { id: 'coalesce', label: 'COALESCE (NULL Replacement)' },
      { id: 'nullif', label: 'NULLIF (Conditional NULL)' },
      { id: 'greatest', label: 'GREATEST (Max चयन)' },
      { id: 'least', label: 'LEAST (Min चयन)' },
      { id: 'filter_clause', label: 'FILTER Clause (Aggregation Alternative)' },
    ]
  },

  {
    id: 'advanced',
    label: 'Advanced & Functions',
    features: [
      { id: 'subquery', label: 'Subquery Builder' },
      { id: 'functions', label: 'Database Functions' },
      { id: 'case_builder', label: 'CASE Builder (Conditional Logic)' },
      { id: 'independentLogic', label: 'Advanced Rule Logic' },
      { id: 'cte', label: 'CTE (WITH Clause)' },
      { id: 'unions', label: 'Combine Queries (UNION)' },
      { id: 'window', label: 'Window Functions (OVER)' },
      { id: 'procedures', label: 'Stored Procedures' },
    ]
  }
];// Flat list helper for easy mapping/updating
const ALL_FEATURES = FEATURE_GROUPS.flatMap(group => group.features);

const HistoryPanel = ({ refreshTrigger, onSelect, onOptionsChange }) => {
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedConn, setSelectedConn] = useState(null);
  const [options, setOptions] = useState({});
  
  // State to manage which accordion groups are open
  // Default: Core and Filtering open, others closed
  const [expandedGroups, setExpandedGroups] = useState({
    core: true,
    filtering: true,
    joins: false,
    advanced: false
  });

  const { updateSchemaConfig } = useSchemaConfig();

  const resetToDefaults = useCallback(() => {
    const defaults = {};
    ALL_FEATURES.forEach(f => {
      defaults[f.id] = !!f.default;
    });
    setOptions(defaults);
    if (onOptionsChange) onOptionsChange(defaults);
  }, [onOptionsChange]);

  useEffect(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const fetchHistory = () => {
    api.get('/db-connections')
      .then(res => setHistory(res.data))
      .catch(console.error);
  };

  // --- ACTIONS ---
  const handleSelect = async (conn) => {
    try {
      const { data } = await api.get(`/db-connections/${conn.id}`);
      if (data.schema) {
        updateSchemaConfig(data.schema);
        setSelectedConn(conn);
        setView('detail');
        if (onSelect) onSelect(conn);
      } else {
        alert("No schema found for this connection.");
      }
    } catch (error) {
      console.error("Failed to load schema:", error);
      alert("Error loading schema.");
    }
  };

  const handleBack = () => {
    setView('list');
    setSelectedConn(null);
    updateSchemaConfig(null);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this connection?")) return;
    try {
      await api.delete(`/db-connections/${id}`);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const toggleOption = (id) => {
    setOptions(prev => {
      const next = { ...prev, [id]: !prev[id] };
      
      const joinTypes = ['inner_join', 'left_join', 'right_join', 'full_join', 'cross_join', 'self_join'];
      if (joinTypes.includes(id) && next[id]) {
        joinTypes.forEach(j => { if (j !== id) next[j] = false; });
      }
      
      if (onOptionsChange) onOptionsChange(next);
      return next;
    });
  };

  const selectAll = () => {
    const all = {};
    ALL_FEATURES.forEach(f => all[f.id] = true);
    setOptions(all);
    if (onOptionsChange) onOptionsChange(all);
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // --- RENDER: LIST VIEW ---
  if (view === 'list') {
    return (
      <div className="history-panel">
        <h3 className="panel-title">Saved Connections</h3>
        <div className="history-list">
          {history.length === 0 && <div className="empty-state">No connections found.</div>}

          {history.map(item => (
            <div key={item.id} className="history-item" onClick={() => handleSelect(item)}>
              <div className="history-icon">
                <Icon name="Database" size={16} />
              </div>
              <div className="history-info">
                <div className="history-name">{item.name}</div>
                <div className="history-meta">
                  {item.username}@{item.host}
                </div>
              </div>
              <button
                className="btn-delete"
                onClick={(e) => handleDelete(e, item.id)}
                title="Delete"
              >
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: DETAIL VIEW ---
  return (
    <div className="history-panel detail-view">
      <div className="detail-header">
        <button onClick={handleBack} className="btn-back">
          <Icon name="ArrowLeft" size={16} />
        </button>
        <div className="detail-title-wrapper">
          <span className="detail-label">Active Connection</span>
          <span className="detail-name">{selectedConn?.name}</span>
        </div>
      </div>

      <div className="conn-info-card">
        <div className="info-row">
          <Icon name="Server" size={12} /> {selectedConn?.host}
        </div>
        <div className="info-row">
          <Icon name="Database" size={12} /> {selectedConn?.db_name}
        </div>
        <div className="info-row">
          <Icon name="User" size={12} /> {selectedConn?.username}
        </div>
      </div>

      <div className="divider"></div>

      <div className="options-header">
        <h4>Query Features</h4>
        <div className="options-actions">
          <button onClick={selectAll} className="btn-text">All</button>
          <button onClick={resetToDefaults} className="btn-text">Reset</button>
        </div>
      </div>

      {/* Accordion List for Groups */}
      <div className="options-list">
        {FEATURE_GROUPS.map(group => {
          const isExpanded = expandedGroups[group.id];
          
          return (
            <div key={group.id} className="feature-group">
              {/* Group Header / Toggle */}
              <div 
                className={`group-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleGroup(group.id)}
              >
                <span className="group-title">{group.label}</span>
                <span className={`group-chevron ${isExpanded ? 'open' : ''}`}>▼</span>
              </div>
              
              {/* Group Content (Checkboxes) */}
              <div className={`group-content ${isExpanded ? 'open' : ''}`}>
                {group.features.map(feat => (
                  <label key={feat.id} className={`checkbox-row ${options[feat.id] ? 'active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={!!options[feat.id]}
                      onChange={() => toggleOption(feat.id)}
                    />
                    <span>{feat.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryPanel;