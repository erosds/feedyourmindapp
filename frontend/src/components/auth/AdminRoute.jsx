// src/components/auth/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

function AdminRoute({ children }) {
  const { currentUser, loading, isAdmin } = useAuth();

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

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Verifica se l'utente è un amministratore
  if (!isAdmin()) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          p: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" color="error" gutterBottom>
          Accesso Negato
        </Typography>
        <Typography variant="body1">
          Non hai i permessi necessari per accedere a questa pagina.
        </Typography>
      </Box>
    );
  }

  return children;
}

export default AdminRoute;