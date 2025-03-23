// src/components/layouts/AuthLayout.jsx
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

function AuthLayout() {
  const { currentUser, loading } = useAuth();

  // Se l'utente è già autenticato, reindirizza alla dashboard
  if (!loading && currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'primary.light',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" color="primary" gutterBottom>
            Feed Your Mind
          </Typography>
          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
}

export default AuthLayout;