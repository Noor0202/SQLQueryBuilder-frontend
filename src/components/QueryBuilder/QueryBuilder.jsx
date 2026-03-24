// src/components/QueryBuilder/QueryBuilder.jsx
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import RuleGroup from './RuleGroup';
import { useSchemaConfig } from '../../config/SchemaConfig';
import '../../styles/QueryBuilder.css';

export default function QueryBuilder({ query, setQuery, createDefaultQuery, onRun, options = {} }) {
  
  const { schemaConfig } = useSchemaConfig();

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

      <RuleGroup 
        ruleGroup={query} 
        onUpdate={handleQueryChange} 
        options={options}
      />
    </div>
  );
}