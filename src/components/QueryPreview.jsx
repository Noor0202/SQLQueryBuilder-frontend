// frontend/src/components/QueryPreview.jsx
import React, { useMemo } from 'react';
import { generatePostgresQuery } from '../utils/sqlGenerator';
import Icon from './Icon';
import '../styles/QueryPreview.css';

// 1. Add options to the props
const QueryPreview = ({ query, schemaConfig, options = {} }) => {

  // 2. Add options to the dependency array
  const sqlString = useMemo(() => {
    // 3. Pass options into the generator
    return generatePostgresQuery(query, schemaConfig, options);
  }, [query, schemaConfig, options]);

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