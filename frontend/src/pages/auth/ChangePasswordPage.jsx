// src/pages/auth/ChangePasswordPage.jsx
import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function ChangePasswordPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // Estrai username dai parametri URL se disponibile
    const queryParams = new URLSearchParams(location.search);
    const initialUsername = queryParams.get('username') || '';

    const [formData, setFormData] = useState({
        username: initialUsername,
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { username, oldPassword, newPassword, confirmPassword } = formData;

        // Validazione
        if (!username || !oldPassword || !newPassword || !confirmPassword) {
            setError('Tutti i campi sono obbligatori');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Le password non corrispondono');
            return;
        }

        try {
            setLoading(true);
            setError('');

            await axios.post(`${API_URL}/change-password`, {
                username,
                old_password: oldPassword,
                new_password: newPassword
            });

            setSuccess(true);

            // Reindirizza al login dopo 3 secondi
            setTimeout(() => {
                navigate('/login', {
                    state: { message: 'Password cambiata con successo. Effettua il login con la nuova password.' }
                });
            }, 3000);
        } catch (err) {
            console.error('Errore cambio password:', err);
            const errorMessage = err.response?.data?.detail || 'Errore durante il cambio password';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
            <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 450 }}>
                <Typography variant="h5" gutterBottom align="center">
                    Cambia Password
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success ? (
                    <Alert severity="success">
                        Password aggiornata con successo! Verrai reindirizzato alla pagina di login.
                    </Alert>
                ) : (
                    <Box component="form" onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            name="username"
                            label="Username"
                            value={formData.username}
                            onChange={handleChange}
                            margin="normal"
                            required
                            autoComplete="username"
                        />

                        <TextField
                            fullWidth
                            name="oldPassword"
                            label="Password attuale"
                            type={showOldPassword ? 'text' : 'password'}
                            value={formData.oldPassword}
                            onChange={handleChange}
                            margin="normal"
                            required
                            autoComplete="current-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                            edge="end"
                                        >
                                            {showOldPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <TextField
                            fullWidth
                            name="newPassword"
                            label="Nuova password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={formData.newPassword}
                            onChange={handleChange}
                            margin="normal"
                            required
                            autoComplete="new-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            edge="end"
                                        >
                                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <TextField
                            fullWidth
                            name="confirmPassword"
                            label="Conferma nuova password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            margin="normal"
                            required
                            autoComplete="new-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            edge="end"
                                        >
                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            disabled={loading}
                            sx={{ mt: 3, mb: 2 }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Cambia Password'}
                        </Button>

                        <Box textAlign="center">
                            <Button component={Link} to="/login" color="primary">
                                Torna al Login
                            </Button>
                            <Typography variant="caption" color="text.secondary" display="block" align="center" sx={{ mt: 1 }}>
                                Hai dimenticato anche la password precedente? Contatta l'amministratore per reimpostarla.
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
}

export default ChangePasswordPage;