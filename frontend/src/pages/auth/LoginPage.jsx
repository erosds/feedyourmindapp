// src/pages/auth/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

function LoginPage() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Controlla se c'è un messaggio di successo passato dal cambio password
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validazione semplice
    if (!username.trim() || !password.trim()) {
      setFormError('Username e password sono obbligatori');
      return;
    }
    
    setLoading(true);
    setFormError('');
    
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setFormError(err.response?.data?.detail || 'Login fallito. Verifica le credenziali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{ width: '100%', mt: 1 }}
    >
      <Typography component="h2" variant="h6" gutterBottom align="center">
        Accedi all'app
      </Typography>
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      {(error || formError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || formError}
        </Alert>
      )}
      
      <TextField
        margin="normal"
        required
        fullWidth
        id="username"
        label="Username"
        name="username"
        autoComplete="username"
        autoFocus
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={loading}
      />
      
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Accedi'}
      </Button>
      
      <Box mt={2} textAlign="center">
        <Button
          component={Link}
          to={`/change-password${username ? `?username=${encodeURIComponent(username)}` : ''}`}
          color="primary"
          size="small"
        >
          Cambia password
        </Button>
      </Box>
    </Box>
  );
}

export default LoginPage;