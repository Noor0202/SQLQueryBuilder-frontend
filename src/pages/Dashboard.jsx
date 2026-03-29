// frontend/src/pages/Dashboard.jsx
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../hooks/useAuth';
import HistoryPanel from '../components/HistoryPanel';
import TopNavTabs from '../components/TopNavTabs';
import AddCreds from '../components/AddCreds';
import Icon from '../components/Icon';
import api from '../services/api';
import { useSchemaConfig } from '../config/SchemaConfig';
import QueryBuilder from '../components/QueryBuilder/QueryBuilder';
import QueryPreview from '../components/QueryPreview';
import ResultTable from '../components/ResultTable';
import { generatePostgresQuery } from '../utils/sqlGenerator';

export default function Dashboard() {
  const { user } = useAuth();

  // State Definitions
  const [activeTab, setActiveTab] = useState('Add Creds');
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [queryOptions, setQueryOptions] = useState({});
  const { schemaConfig } = useSchemaConfig();

  // Connection ID required for execution
  const [selectedConnId, setSelectedConnId] = useState(null);

  // --- QUERY STATE ---
// --- FIND THIS FUNCTION AND UPDATE IT ---
  const createDefaultQuery = () => ({
    id: uuidv4(),
    type: 'group',
    combinator: 'and',
    selectedColumns: {}, // Tracks currently selected columns { "tableId": ["col1", "col2"] }
    keptColumns: {},     // Tracks permanently kept columns
    rules: [
      {
        id: uuidv4(),
        type: 'rule',
        combinator: 'and',
        table: '',
        column: '',
        operator: '',
        value: ''
      }
    ]
  });

  const [query, setQuery] = useState(createDefaultQuery());

  // --- RESULT STATE ---
  const [resultData, setResultData] = useState([]); // Default to empty array
  const [paginationInfo, setPaginationInfo] = useState({ page: 1, total: 0, limit: 100 });
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState(null);
  const [lastExecutedSQL, setLastExecutedSQL] = useState('');

  // Logout
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      window.location.href = '/login';
    } catch (e) { console.error(e); }
  };

  // --- HANDLER: Connection Selection (Restored) ---
  const handleSchemaLoaded = (connOrId) => {
    // HistoryPanel might pass the whole object OR just the ID depending on version.
    // We handle both cases to be safe.
    const id = typeof connOrId === 'object' ? connOrId.id : connOrId;

    setSelectedConnId(id);

    // REDIRECT LOGIC: Switch tab immediately
    setActiveTab('Query Builder');

    // Optional: Reset query when switching DBs
    // setQuery(createDefaultQuery()); 
  };

// --- EXECUTION LOGIC ---
  const executeQueryCall = async (sqlToRun, pageNum = 1) => {
    if (!selectedConnId) {
      alert("Connection ID missing. Please re-select the connection from the sidebar.");
      return;
    }

    setExecutionLoading(true);
    setExecutionError(null);
    if (activeTab !== 'Result') setActiveTab('Result');

    try {
      // 1. Strip the LIMIT clause from the end of the SQL string to prevent backend double-limit crashes
      const cleanSql = sqlToRun.replace(/\s+LIMIT\s+\d+$/i, '');
      
      // 2. Grab the user's custom limit from the query state (fallback to 100 if empty)
      const userLimit = (queryOptions.limit && query.limit) ? parseInt(query.limit, 10) : 100;

      const response = await api.post(`/db-connections/${selectedConnId}/execute`, {
        sql: cleanSql,
        page: pageNum,
        limit: userLimit
      });

      // CRITICAL FIX: Extract 'rows' array from the response object
      // Backend returns: { rows: [...], total_rows: 1000, page: 1, limit: 100 }
      if (response.data && Array.isArray(response.data.rows)) {
        setResultData(response.data.rows);
        setPaginationInfo({
          page: response.data.page,
          total: response.data.total_rows,
          limit: response.data.limit
        });
      } else {
        // Fallback for non-paginated endpoints (just in case)
        setResultData(Array.isArray(response.data) ? response.data : []);
      }

    } catch (err) {
      console.error("Execution error:", err);
      setExecutionError(err.response?.data?.detail || "Query execution failed.");
      setResultData([]);
    } finally {
      setExecutionLoading(false);
    }
  };

  // Triggered by "Run Query" button
  const handleRunQuery = async () => {
    if (!schemaConfig || !schemaConfig.Tables) {
      alert("Please select a database connection first.");
      return;
    }

    // FIX: Pass schemaConfig so JOINS are generated correctly
    const sql = generatePostgresQuery(query, schemaConfig, queryOptions);
    setLastExecutedSQL(sql);

    // Reset to page 1
    executeQueryCall(sql, 1);
  };

  // Triggered by Pagination
  const handlePageChange = (newPage) => {
    executeQueryCall(lastExecutedSQL, newPage);
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div style={{ paddingBottom: '1rem', borderBottom: '1px solid #334155', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
            <Icon name="Database" color="#3b82f6" />
            <span>SQL Builder</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            User: {user?.username}
          </div>
        </div>

        <HistoryPanel
          refreshTrigger={refreshHistory}
          onOptionsChange={setQueryOptions}
          // We use the same handler name as your previous code to ensure compatibility
          onSelect={handleSchemaLoaded}
          // Also mapping onSelectConnection just in case HistoryPanel uses that name now
          onSelectConnection={handleSchemaLoaded}
        />

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
          <button onClick={handleLogout} className="btn btn-sm" style={{ width: '100%', background: '#ef4444', color: 'white' }}>Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <TopNavTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="workspace">
          {activeTab === 'Add Creds' && (
            <AddCreds onComplete={() => setRefreshHistory(n => n + 1)} />
          )}

          {activeTab === 'Query Builder' && (
            schemaConfig ? (
              <QueryBuilder
                query={query}
                setQuery={setQuery}
                createDefaultQuery={createDefaultQuery}
                onRun={handleRunQuery}
                options={queryOptions}
                schemaConfig={schemaConfig}
              />
            ) : (
              <div style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>
                Please select a database connection from the left sidebar.
              </div>
            )
          )}

          {/* Update this block in your workspace tabs */}
          {activeTab === 'Query Preview' && (
            schemaConfig ? (
              <QueryPreview
                query={query}
                schemaConfig={schemaConfig}
                options={queryOptions}
              />
            ) : (
              <div>Select a DB first.</div>
            )
          )}

          {activeTab === 'Result' && (
            <ResultTable
              data={resultData}
              loading={executionLoading}
              error={executionError}
              sql={lastExecutedSQL}
              pagination={paginationInfo}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </main>
    </div>
  );
}