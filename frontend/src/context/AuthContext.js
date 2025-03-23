// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/api';
import jwt_decode from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Verifica validità del token
          const decodedToken = jwt_decode(token);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp < currentTime) {
            // Token scaduto
            localStorage.removeItem('token');
            setCurrentUser(null);
          } else {
            // Token valido, carica i dati dell'utente
            const response = await authService.getCurrentUser();
            setCurrentUser(response.data);
          }
        } catch (err) {
          console.error('Error initializing auth:', err);
          localStorage.removeItem('token');
          setError('Session expired. Please login again.');
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // In context/AuthContext.js, controlla la funzione login

const login = async (username, password) => {
  try {
    setLoading(true);
    setError(null);
    
    console.log("Chiamata all'API login...");
    const data = await authService.login(username, password);
    console.log("Risposta API login ricevuta:", data);
    
    // Verifica che il token sia salvato
    const token = localStorage.getItem('token');
    console.log("Token dopo authService.login:", token ? "Presente" : "Assente");
    
    // Decodifica token per ottenere info utente
    const decodedToken = jwt_decode(data.access_token);
    console.log("Token decodificato:", decodedToken);
    
    // Carica dati completi dell'utente
    console.log("Caricamento dati utente...");
    const response = await authService.getCurrentUser();
    console.log("Dati utente ricevuti:", response.data);
    
    setCurrentUser(response.data);
    console.log("currentUser impostato:", response.data);
    
    return response.data;
  } catch (err) {
    console.error('Login error:', err);
    setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    throw err;
  } finally {
    setLoading(false);
  }
};

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const isAdmin = () => {
    return currentUser?.is_admin === true;
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};