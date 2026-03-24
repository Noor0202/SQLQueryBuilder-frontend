// frontend/src/components/HistoryPanel.jsx
import React, { useEffect, useState, useCallback } from 'react';
import Icon from './Icon';
import api from '../services/api';
import { useSchemaConfig } from '../config/SchemaConfig';
import '../styles/HistoryPanel.css';

const QUERY_FEATURES = [
  // --- The 5 Requested Features ---
  { id: 'select', label: 'SELECT', default: true },
  { id: 'where', label: 'WHERE Clause', default: true },
  { id: 'dragDrop', label: 'Drag-and-Drop' },
  { id: 'join', label: 'JOINs (Inner/Outer)' },
  { id: 'subquery', label: 'Subqueries' },
  { id: 'distinct', label: 'DISTINCT' },
  { id: 'orderBy', label: 'ORDER BY' },
  { id: 'limit', label: 'LIMIT / OFFSET' },
  { id: 'groupBy', label: 'GROUP BY' },
  { id: 'having', label: 'HAVING Clause' },
  { id: 'aggregates', label: 'Aggregates (SUM, COUNT, etc.)' },
  { id: 'window', label: 'Window Functions (OVER, PARTITION)' },
  { id: 'case', label: 'CASE Statements' },
  { id: 'cte', label: 'CTE (WITH Clause)' },
  { id: 'unions', label: 'UNIONS (ALL)' },
  { id: 'functions', label: 'Database Functions' },
  { id: 'procedures', label: 'Stored Procedures' },

  // --- Other UI Features ---
  { id: 'independentLogic', label: 'Independent Combinators' },
];

// ... [keep imports and QUERY_FEATURES exactly the same] ...

const HistoryPanel = ({ refreshTrigger, onSelect, onOptionsChange }) => {
  const [history, setHistory] = useState([]);
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedConn, setSelectedConn] = useState(null);
  const [options, setOptions] = useState({});

  const { updateSchemaConfig } = useSchemaConfig();

  // --- MOVE THIS UP HERE ---
  const resetToDefaults = useCallback(() => {
    const defaults = {};
    QUERY_FEATURES.forEach(f => {
      defaults[f.id] = !!f.default;
    });
    setOptions(defaults);
    if (onOptionsChange) onOptionsChange(defaults);
  }, [onOptionsChange]);

  // 1. Initialize Options with defaults (Now it is defined before use)
  useEffect(() => {
    resetToDefaults();
  }, [resetToDefaults]);

  // 2. Fetch History List
  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const fetchHistory = () => {
    api.get('/db-connections')
      .then(res => setHistory(res.data))
      .catch(console.error);
  };

  // ... [keep handleSelect, handleBack, handleDelete, toggleOption, selectAll exactly the same] ...

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

  // --- OPTION MANAGEMENT ---
  const toggleOption = (id) => {
    const newOptions = { ...options, [id]: !options[id] };
    setOptions(newOptions);
    // CRITICAL FIX: Ensure we use the exact prop name passed by Dashboard.jsx
    if (onOptionsChange) onOptionsChange(newOptions);
  };

  const selectAll = () => {
    const all = {};
    QUERY_FEATURES.forEach(f => all[f.id] = true);
    setOptions(all);
    if (onOptionsChange) onOptionsChange(all);
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

      <div className="options-list">
        {QUERY_FEATURES.map(feat => (
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
};

export default HistoryPanel;