// src/pages/professors/ProfessorFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

// Schema di validazione corretto
const ProfessorSchema = Yup.object().shape({
  first_name: Yup.string()
    .min(2, 'Nome troppo corto')
    .max(100, 'Nome troppo lungo')
    .required('Nome obbligatorio'),
  last_name: Yup.string()
    .min(2, 'Cognome troppo corto')
    .max(100, 'Cognome troppo lungo')
    .required('Cognome obbligatorio'),
  username: Yup.string()
    .min(3, 'Username troppo corto')
    .max(50, 'Username troppo lungo')
    .required('Username obbligatorio'),
  is_admin: Yup.boolean(),
  password: Yup.string()
    .min(6, 'Password troppo corta')
    .when('$isNewProfessor', {
      is: true,
      then: () => Yup.string().required('Password obbligatoria'),
      otherwise: () => Yup.string().nullable(),
    }),
});

function ProfessorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [initialValues, setInitialValues] = useState({
    first_name: '',
    last_name: '',
    username: '',
    is_admin: false,
    password: '',
  });

  useEffect(() => {
    // Verifica che l'utente sia admin
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }

    // Se in modalità modifica, carica i dati del professore
    if (isEditMode) {
      const fetchProfessor = async () => {
        try {
          setLoading(true);
          const response = await professorService.getById(id);
          const professor = response.data;
          
          setInitialValues({
            first_name: professor.first_name,
            last_name: professor.last_name,
            username: professor.username,
            is_admin: professor.is_admin,
            password: '',
          });
        } catch (err) {
          console.error('Error fetching professor:', err);
          setError('Impossibile caricare i dati del professore. Riprova più tardi.');
        } finally {
          setLoading(false);
        }
      };

      fetchProfessor();
    }
  }, [id, isEditMode, navigate, isAdmin]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError(null);
      
      // Se la password è vuota in modalità modifica, non inviarla
      const professorData = { ...values };
      if (isEditMode && !professorData.password) {
        delete professorData.password;
      }
      
      if (isEditMode) {
        await professorService.update(id, professorData);
      } else {
        await professorService.create(professorData);
      }
      
      navigate('/professors');
    } catch (err) {
      console.error('Error saving professor:', err);
      setError(err.response?.data?.detail || 'Errore durante il salvataggio. Verifica i dati e riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {isEditMode ? 'Modifica Professore' : 'Nuovo Professore'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={initialValues}
          validationSchema={ProfessorSchema}
          onSubmit={handleSubmit}
          enableReinitialize
          validateOnChange={false}
          validateOnBlur={false}
          context={{ isNewProfessor: !isEditMode }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            isSubmitting,
          }) => (
            <Form>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="first_name"
                    label="Nome"
                    value={values.first_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.first_name && Boolean(errors.first_name)}
                    helperText={touched.first_name && errors.first_name}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="last_name"
                    label="Cognome"
                    value={values.last_name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.last_name && Boolean(errors.last_name)}
                    helperText={touched.last_name && errors.last_name}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="username"
                    label="Username"
                    value={values.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.username && Boolean(errors.username)}
                    helperText={touched.username && errors.username}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="password"
                    label={isEditMode ? "Nuova Password (lasciare vuoto per non cambiare)" : "Password"}
                    type="password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    required={!isEditMode}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="is_admin"
                        checked={values.is_admin}
                        onChange={handleChange}
                      />
                    }
                    label="Amministratore"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/professors')}
                      disabled={isSubmitting}
                    >
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <CircularProgress size={24} />
                      ) : isEditMode ? (
                        'Aggiorna'
                      ) : (
                        'Crea'
                      )}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box>
  );
}

export default ProfessorFormPage;