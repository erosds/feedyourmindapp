// src/components/auth/RootRedirect.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

/**
 * Componente che reindirizza l'utente alla dashboard appropriata in base al suo ruolo
 */
function RootRedirect() {
  const { currentUser, loading, isAdmin } = useAuth();

  // Mostra un loader mentre controlliamo lo stato di autenticazione
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Se l'utente non è autenticato, reindirizza al login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Se l'utente è amministratore, reindirizza alla dashboard amministrativa
  if (isAdmin()) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  // Altrimenti reindirizza alla dashboard standard
  return <Navigate to="/dashboard" replace />;
}

export default RootRedirect;