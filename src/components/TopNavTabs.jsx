import React from 'react';

const TopNavTabs = ({ activeTab, setActiveTab }) => {
  const tabs = ['Add Creds', 'Query Builder', 'Query Preview', 'Result'];

  return (
    <div className="top-nav">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          style={{
            padding: '1rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default TopNavTabs;