// frontend/src/services/api.js

import axios from 'axios';

const api = axios.create({
  // Strictly point to the FastAPI backend on port 8000
  baseURL: 'http://localhost:8000/api',
  withCredentials: true, // Crucial for httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;