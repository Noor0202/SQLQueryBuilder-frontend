import api from './api';

const authService = {
  login: async (credentials) => {
    // credentials: { username, password }
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData) => {
    // userData: { username, email, password }
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    return await api.post('/auth/logout');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

export default authService;