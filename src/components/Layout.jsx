import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="app-container">
      {/* You can add a global Toast/Notification container here if needed */}
      <Outlet />
    </div>
  );
};

export default Layout;