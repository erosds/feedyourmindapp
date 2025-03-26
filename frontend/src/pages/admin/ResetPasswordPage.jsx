// src/pages/admin/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { professorService, authService } from '../../services/api';

function AdminResetPasswordPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [professors, setProfessors] = useState([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [newPassword, setNewPassword] = useState('1234'); // Default password
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Verifica che l'utente sia admin
  useEffect(() => {
    if (!currentUser || !currentUser.is_admin) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);
  
  // Carica la lista dei professori
  useEffect(() => {
    const fetchProfessors = async () => {
      try {
        setFetchingUsers(true);
        // Usa il professorService invece di axios diretto
        const response = await professorService.getAll();
        
        // Ordina i professori per username
        const sortedProfessors = [...response.data].sort((a, b) => 
          a.username.toLowerCase().localeCompare(b.username.toLowerCase())
        );
        
        setProfessors(sortedProfessors);
      } catch (err) {
        console.error('Errore nel recupero dei professori:', err);
        setError('Impossibile caricare la lista dei professori. Prova a riaggiornare la pagina.');
      } finally {
        setFetchingUsers(false);
      }
    };
    
    if (currentUser && currentUser.is_admin) {
      fetchProfessors();
    }
  }, [currentUser]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUsername || !newPassword) {
      setError('Seleziona un utente e imposta una nuova password');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Usa authService invece di axios diretto
      await authService.adminResetPassword(selectedUsername, newPassword);
      
      setSuccess(true);
      setSelectedUsername('');
      setNewPassword('1234');
      
      // Reset del messaggio di successo dopo 5 secondi
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Errore reset password:', err);
      const errorMessage = err.response?.data?.detail || 'Errore durante il reset della password';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  if (fetchingUsers) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }
  
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button 
          variant="outlined"
          color="primary" 
          onClick={handleBackToDashboard}
          startIcon={<ArrowBackIcon />}
          sx={{ mr: 2 }}
        >
          Dashboard
        </Button>
        <Typography variant="h5">
          Reset Password Utenti
        </Typography>
      </Box>
      
      <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password reimpostata con successo!
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal">
            <InputLabel id="select-professor-label">Seleziona utente</InputLabel>
            <Select
              labelId="select-professor-label"
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              label="Seleziona utente"
              disabled={loading}
              required
            >
              {professors.map((prof) => (
                <MenuItem key={prof.id} value={prof.username}>
                  {prof.username} ({prof.first_name} {prof.last_name})
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              Seleziona l'utente che ha dimenticato la password
            </FormHelperText>
          </FormControl>
          
          <TextField
            fullWidth
            margin="normal"
            label="Nuova password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            required
            helperText="Questa sarà la nuova password temporanea dell'utente"
          />
          
          <Box mt={3} display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !selectedUsername}
            >
              {loading ? <CircularProgress size={24} /> : 'Reimposta Password'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default AdminResetPasswordPage;