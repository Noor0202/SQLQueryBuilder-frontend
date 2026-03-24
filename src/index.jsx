// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { SchemaConfigProvider } from './config/SchemaConfig'; // Import the new config
import './styles/theme.css';
import './styles/components.css';
import './styles/auth.css';
import './styles/dashboard.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SchemaConfigProvider>
      <App />
    </SchemaConfigProvider>
  </React.StrictMode>
);