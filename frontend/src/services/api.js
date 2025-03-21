// src/services/api.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Istanza axios con configurazione di base
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere il token di autenticazione ad ogni richiesta
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor per gestire errori di autenticazione
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Se la sessione è scaduta, reindirizza alla pagina di login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servizi API per ciascuna entità
const authService = {
  login: async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(`${API_URL}/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('token');
  },
  
  getCurrentUser: async () => {
    return api.get('/users/me');
  },
};

const professorService = {
  getAll: () => api.get('/professors'),
  getById: (id) => api.get(`/professors/${id}`),
  create: (data) => api.post('/professors', data),
  update: (id, data) => api.put(`/professors/${id}`, data),
  delete: (id) => api.delete(`/professors/${id}`),
};

const studentService = {
  getAll: () => api.get('/students'),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
};

const packageService = {
  getAll: () => api.get('/packages'),
  getById: (id) => api.get(`/packages/${id}`),
  getByStudent: (studentId) => api.get(`/packages/student/${studentId}`),
  getActiveByStudent: (studentId) => api.get(`/packages/student/${studentId}/active`),
  create: (data) => api.post('/packages', data),
  update: (id, data) => api.put(`/packages/${id}`, data),
  delete: (id) => api.delete(`/packages/${id}`),
};

const lessonService = {
  getAll: () => api.get('/lessons'),
  getById: (id) => api.get(`/lessons/${id}`),
  getByProfessor: (professorId) => api.get(`/lessons/professor/${professorId}`),
  getByStudent: (studentId) => api.get(`/lessons/student/${studentId}`),
  create: (data) => api.post('/lessons', data),
  update: (id, data) => api.put(`/lessons/${id}`, data),
  delete: (id) => api.delete(`/lessons/${id}`),
};

const statsService = {
  getFinanceStats: () => api.get('/stats/finance'),
  getStudentStats: () => api.get('/stats/students'),
  getProfessorStats: () => api.get('/stats/professors'),
};

export {
  api,
  authService,
  professorService,
  studentService,
  packageService,
  lessonService,
  statsService,
};