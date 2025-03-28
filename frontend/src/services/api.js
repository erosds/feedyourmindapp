// src/services/api.js

import axios from 'axios';

// Configurazione base di axios
const API_URL = 'https://jordan-partnership-benefit-nn.trycloudflare.com';  // Sostituisci con l'IP del tuo computer

// Crea un'istanza di axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per l'aggiunta del token alle richieste
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

// Auth service
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/token', new URLSearchParams({
      username,
      password,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    // Salva il token nel localStorage
    localStorage.setItem('token', response.data.access_token);
    
    return response.data;
  },
  
  getCurrentUser: async () => {
    return api.get('/users/me');
  },
  
  logout: () => {
    localStorage.removeItem('token');
  },

  changePassword: (username, oldPassword, newPassword) => {
    return api.post('/change-password', {
      username,
      old_password: oldPassword,
      new_password: newPassword
    });
  },
  
  // Aggiungi questo metodo al tuo authService in src/services/api.js
  adminResetPassword: (username, newPassword) => {
    return api.post('/admin-reset-password', {
      username,
      new_password: newPassword
    });
  }
};

// Professor service
export const professorService = {
  getAll: async () => {
    return api.get('/professors');
  },
  
  getById: async (id) => {
    return api.get(`/professors/${id}`);
  },
  
  create: async (data) => {
    return api.post('/professors', data);
  },
  
  update: async (id, data) => {
    return api.put(`/professors/${id}`, data);
  },
  
  delete: async (id) => {
    return api.delete(`/professors/${id}`);
  },
};

// Student service - Usa l'istanza api comune
export const studentService = {
  getAll: async () => {
    return api.get('/students');
  },
  
  getById: async (id) => {
    return api.get(`/students/${id}`);
  },
  
  create: async (data) => {
    return api.post('/students', data);
  },
  
  update: async (id, data) => {
    return api.put(`/students/${id}`, data);
  },
  
  delete: async (id) => {
    return api.delete(`/students/${id}`);
  },
  
  checkHomonyms: async (firstName, lastName) => {
    return api.get(`/students/check-homonyms/?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`);
  },
};

// Package service
export const packageService = {
  getAll: async () => {
    return api.get('/packages');
  },
  
  getById: async (id) => {
    return api.get(`/packages/${id}`);
  },
  
  getByStudent: async (studentId) => {
    return api.get(`/packages/student/${studentId}`);
  },
  
  getActiveByStudent: async (studentId) => {
    return api.get(`/packages/student/${studentId}/active`);
  },
  
  create: async (data) => {
    return api.post('/packages', data);
  },

  create: async (data, allowMultiple = false) => {
    return api.post(`/packages/?allow_multiple=${allowMultiple}`, data);
  },
  
  extendPackage: async (packageId) => {
    return api.put(`/packages/${packageId}/extend`);
  },

  update: async (id, data) => {
    return api.put(`/packages/${id}`, data);
  },
  
  delete: async (id) => {
    return api.delete(`/packages/${id}`);
  },
};

// Lesson service
export const lessonService = {
  getAll: async () => {
    return api.get('/lessons');
  },
  
  getById: async (id) => {
    return api.get(`/lessons/${id}`);
  },
  
  getByProfessor: async (professorId) => {
    return api.get(`/lessons/professor/${professorId}`);
  },
  
  getByStudent: async (studentId) => {
    return api.get(`/lessons/student/${studentId}`);
  },
  
  create: async (data) => {
    return api.post('/lessons', data);
  },
  
  update: async (id, data) => {
    return api.put(`/lessons/${id}`, data);
  },
  
  delete: async (id) => {
    return api.delete(`/lessons/${id}`);
  },
  
  // Nuovo metodo per gestire l'overflow delle ore
  handleOverflow: async (data) => {
    return api.post('/lessons/handle-overflow', data);
  },
};

// Statistics service
export const statsService = {
  getFinanceStats: async () => {
    return api.get('/stats/finance');
  },
  
  getStudentStats: async () => {
    return api.get('/stats/students');
  },
  
  getProfessorStats: async () => {
    return api.get('/stats/professors');
  },
};

export default api;