// frontend/src/components/ResultTable.jsx
import React, { useState, useMemo, useEffect } from 'react';
import Icon from './Icon';
import '../styles/ResultTable.css';

export default function ResultTable({ data, loading, error, sql, pagination, onPageChange }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Reset sorting when data changes
  useEffect(() => {
    setSortConfig({ key: null, direction: 'asc' });
  }, [data]);

  // 1. Extract Columns dynamically
  const columns = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    if (typeof data[0] !== 'object' || data[0] === null) return [];
    return Object.keys(data[0]);
  }, [data]);

  // 2. Handle Client-Side Sorting (for current page)
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !data || !Array.isArray(data)) return data || [];

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // Try numeric sort
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
         return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Fallback to string sort
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- CRITICAL FIX: PAGINATION CALCS ---
  // Rely strictly on the backend's pagination limit instead of inventing a 5% rule.
  const { page = 1, total = 0, limit = 100 } = pagination || {};
  
  const totalPages = Math.ceil(total / limit) || 1;
  const startRow = total > 0 ? (page - 1) * limit + 1 : 0;
  // Calculate end row based on the limit, capped at the total amount of rows
  const endRow = Math.min(page * limit, total);

  // The backend already sliced the data to 100 rows, so we just use the sorted data directly
  const displayData = sortedData;


  // --- EARLY RENDER STATES ---

  if (loading) {
    return (
      <div className="result-container">
        <div className="result-status">
          <div className="spinner"></div>
          <p style={{marginTop: '1rem', fontWeight: 500}}>Executing Query...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-container">
        <div className="result-status error">
          <Icon name="AlertTriangle" size={40} />
          <h3 style={{margin: '0.5rem 0'}}>Execution Failed</h3>
          <pre>{error}</pre>
        </div>
      </div>
    );
  }

  // Handle Empty State
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="result-container">
        <div className="result-status empty">
          <Icon name={!data ? "Terminal" : "CheckCircle"} size={40} />
          <p style={{marginTop: '1rem'}}>
            {!data ? 'Ready to execute. Click "Run Query" in the builder.' : 'Query executed successfully, but returned no rows.'}
          </p>
        </div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="result-container">
      {/* Header */}
      <div className="result-header">
        <div className="result-info">
          <Icon name="Table" size={16} />
          <span style={{marginLeft: '8px'}}>Results Preview</span>
        </div>
        <div style={{fontSize: '0.8rem', color: '#64748b'}}>
          {total.toLocaleString()} rows found
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              {/* Sr.No Header Column */}
              <th style={{ width: '60px', textAlign: 'center' }}>
                <div className="th-content" style={{ justifyContent: 'center' }}>
                  Sr.No
                </div>
              </th>
              
              {columns.map((col) => (
                <th key={col} onClick={() => handleSort(col)}>
                  <div className="th-content">
                    {col}
                    <div style={{width: '14px', display:'flex'}}> 
                      {sortConfig.key === col && (
                        <Icon 
                          name={sortConfig.direction === 'asc' ? 'ChevronUp' : 'ChevronDown'} 
                          size={14} 
                        />
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {/* Sr.No Data Cell - Uses startRow to maintain correct numbering across pages */}
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#64748b', background: '#f8fafc' }}>
                  {startRow + rowIndex}
                </td>

                {columns.map((col) => (
                  <td key={`${rowIndex}-${col}`}>
                    {row[col] === null ? <span className="null-val">NULL</span> : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fixed Footer */}
      <div className="result-footer">
        <div className="pagination-info">
          Showing <b>{startRow}-{endRow}</b> of <b>{total}</b>
        </div>
        <div className="pagination-controls">
          <button 
            className="btn-page" 
            disabled={page <= 1}
            onClick={() => onPageChange && onPageChange(page - 1, limit)}
          >
            <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
              <Icon name="ChevronLeft" size={14} /> Previous
            </div>
          </button>
          
          <span style={{fontSize:'0.85rem', padding:'0 8px', fontWeight: 600, color:'#334155'}}>
            Page {page} of {totalPages}
          </span>
          
          <button 
            className="btn-page" 
            disabled={page >= totalPages}
            onClick={() => onPageChange && onPageChange(page + 1, limit)}
          >
            <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
              Next <Icon name="ChevronRight" size={14} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}