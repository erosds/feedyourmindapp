// src/services/api.js
import axios from 'axios';

// Configurazione base di axios
const API_URL = '/api/';  // Sostituisci con l'IP del tuo computer

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
    return api.get('/professors/');
  },
  
  getById: async (id) => {
    return api.get(`/professors/${id}`);
  },
  
  create: async (data) => {
    return api.post('/professors/', data);
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
    return api.get('/students/');
  },
  
  getById: async (id) => {
    return api.get(`/students/${id}`);
  },
  
  create: async (data) => {
    return api.post('/students/', data);
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
    return api.get('/packages/');
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

  // Aggiungi questi nuovi metodi
  getPayments: async (packageId) => {
    return api.get(`/packages/${packageId}/payments`);
  },
  
  addPayment: async (packageId, data) => {
    return api.post(`/packages/${packageId}/payments`, data);
  },
  
  deletePayment: async (paymentId) => {
    return api.delete(`/packages/payments/${paymentId}`);
  },
  
  create: async (data, allowMultiple = false) => {
    // Assicura che student_ids sia un array nel caso di un solo studente
    if (data.student_id && !data.student_ids) {
      data.student_ids = [data.student_id];
      delete data.student_id;
    }
    return api.post(`/packages/?allow_multiple=${allowMultiple}`, data);
  },
  
  extendPackage: async (packageId) => {
    return api.put(`/packages/${packageId}/extend`);
  },

  // Versione corretta per packageService.update in api.js
  update: async (id, data, allowMultiple = false) => {
    // 1. Conserva dati separati degli studenti se necessario
    console.log('PackageService.update - dati ricevuti:', data);
    
    // 2. Prepara student_ids come array corretto
    if (data.student_id && !data.student_ids) {
      // Caso 1: è stato fornito solo student_id
      data.student_ids = [data.student_id];
      delete data.student_id;
    } else if (data.student_id_1 || data.student_id_2 || data.student_id_3) {
      // Caso 2: sono stati forniti campi separati per ogni studente
      data.student_ids = [];
      if (data.student_id_1) data.student_ids.push(data.student_id_1);
      if (data.student_id_2) data.student_ids.push(data.student_id_2);
      if (data.student_id_3) data.student_ids.push(data.student_id_3);
      
      // Rimuovi i campi separati
      delete data.student_id_1;
      delete data.student_id_2;
      delete data.student_id_3;
    } else if (!data.student_ids) {
      // Caso 3: nessun dato studente fornito
      data.student_ids = [];
    }
    
    // 3. Assicurati che student_ids contenga solo valori numerici validi
    if (data.student_ids) {
      data.student_ids = data.student_ids
        .map(id => typeof id === 'string' ? parseInt(id, 10) : id)
        .filter(id => id !== null && id !== undefined && id !== '' && !isNaN(id));
    }
    
    console.log('PackageService.update - dati formattati:', data);
    return api.put(`/packages/${id}?allow_multiple=${allowMultiple}`, data);
  },
  
  delete: async (id) => {
    return api.delete(`/packages/${id}`);
  },

  cancelExtension: async (packageId) => {
    return api.put(`/packages/${packageId}/cancel-extension`);
  },
};

// Lesson service
export const lessonService = {
  getAll: async () => {
    return api.get('/lessons/');
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
    return api.post('/lessons/', data);
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

// Activity service
export const activityService = {
  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.days) queryParams.append('days', params.days);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/activities/${queryString}`);
  },
  
  getUsersActivity: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.limit_per_user) queryParams.append('limit_per_user', params.limit_per_user);
    if (params.days) queryParams.append('days', params.days);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/activities/users${queryString}`);
  },
  
  getUserActivity: async (professorId, params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.days) queryParams.append('days', params.days);
    
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return api.get(`/activities/user/${professorId}${queryString}`);
  }
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