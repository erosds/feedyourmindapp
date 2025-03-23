// src/components/layouts/AuthLayout.jsx
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import logo from '../assets/logo.jpg';

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
          <img src={logo} alt="Feed Your Mind" style={{ width: 160, height: 160}} />

          <Outlet />
        </Paper>
      </Container>
    </Box>
  );
}

export default AuthLayout;