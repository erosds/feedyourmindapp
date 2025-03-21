// src/pages/NotFoundPage.jsx
import React from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon } from '@mui/icons-material';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" component="h1" color="primary" sx={{ fontSize: '8rem', fontWeight: 'bold' }}>
          404
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Pagina non trovata
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 600 }}>
          La pagina che stai cercando non esiste o è stata spostata.
          Torna alla dashboard per continuare la navigazione.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 3 }}
        >
          Torna alla Dashboard
        </Button>
      </Box>
    </Container>
  );
}

export default NotFoundPage;