// src/pages/students/StudentFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { studentService } from '../../services/api';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';

// Schema di validazione
const StudentSchema = Yup.object().shape({
  first_name: Yup.string()
    .min(2, 'Nome troppo corto')
    .max(100, 'Nome troppo lungo')
    .required('Nome obbligatorio'),
  last_name: Yup.string()
    .min(2, 'Cognome troppo corto')
    .max(100, 'Cognome troppo lungo')
    .required('Cognome obbligatorio'),
  birth_date: Yup.date()
    .required('Data di nascita obbligatoria')
    .max(new Date(), 'La data di nascita non può essere nel futuro'),
  email: Yup.string()
    .email('Email non valida')
    .nullable(),
  phone: Yup.string()
    .nullable()
    .matches(/^$|^[0-9+\s()-]{6,20}$/, 'Numero di telefono non valido'),
});

function StudentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [initialValues, setInitialValues] = useState({
    first_name: '',
    last_name: '',
    birth_date: null,
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (isEditMode) {
      const fetchStudent = async () => {
        try {
          setLoading(true);
          const response = await studentService.getById(id);
          const student = response.data;
          
          setInitialValues({
            first_name: student.first_name,
            last_name: student.last_name,
            birth_date: parseISO(student.birth_date),
            email: student.email || '',
            phone: student.phone || '',
          });
        } catch (err) {
          console.error('Error fetching student:', err);
          setError('Impossibile caricare i dati dello studente. Riprova più tardi.');
        } finally {
          setLoading(false);
        }
      };

      fetchStudent();
    }
  }, [id, isEditMode]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError(null);
      
      // Formatta la data per l'API
      const formattedValues = {
        ...values,
        birth_date: format(values.birth_date, 'yyyy-MM-dd'),
      };
      
      if (isEditMode) {
        await studentService.update(id, formattedValues);
      } else {
        await studentService.create(formattedValues);
      }
      
      navigate('/students');
    } catch (err) {
      console.error('Error saving student:', err);
      setError('Errore durante il salvataggio. Verifica i dati e riprova.');
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
        {isEditMode ? 'Modifica Studente' : 'Nuovo Studente'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={initialValues}
          validationSchema={StudentSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
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
                  <DatePicker
                    label="Data di nascita"
                    value={values.birth_date}
                    onChange={(date) => setFieldValue('birth_date', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: touched.birth_date && Boolean(errors.birth_date),
                        helperText: touched.birth_date && errors.birth_date,
                      },
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="email"
                    label="Email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="phone"
                    label="Telefono"
                    value={values.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.phone && Boolean(errors.phone)}
                    helperText={touched.phone && errors.phone}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/students')}
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

export default StudentFormPage;