// frontend/src/components/QueryPreview.jsx
import React, { useMemo } from 'react';
import { generatePostgresQuery } from '../utils/sqlGenerator';
import Icon from './Icon';
import '../styles/QueryPreview.css';

const QueryPreview = ({ query, schemaConfig }) => {
  
  // Re-generate SQL whenever the query object or schema changes
  const sqlString = useMemo(() => {
    // CRITICAL FIX: Pass the full schemaConfig object, NOT a table name string.
    return generatePostgresQuery(query, schemaConfig);
  }, [query, schemaConfig]);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlString);
    alert("Query copied to clipboard!");
  };

  return (
    <div className="query-preview-container">
      <div className="preview-header">
        <div className="preview-title">
          <Icon name="Code" size={18} />
          <span>PostgreSQL Preview</span>
        </div>
        <button className="btn-copy" onClick={handleCopy} title="Copy to Clipboard">
          <Icon name="Copy" size={16} />
          Copy SQL
        </button>
      </div>

      <div className="code-block">
        {/* Pre tag preserves whitespace/newlines for indentation */}
        <pre>
          <code className="sql-code">{sqlString}</code>
        </pre>
      </div>

      <div className="preview-info">
        <Icon name="Info" size={14} />
        <span>
          Generated SQL uses PostgreSQL syntax. Verify specific table schema references before execution.
        </span>
      </div>
    </div>
  );
};

export default QueryPreview;