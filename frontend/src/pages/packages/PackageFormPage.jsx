// src/pages/packages/PackageFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { studentService, packageService } from '../../services/api';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';

// Schema di validazione
const PackageSchema = Yup.object().shape({
  student_id: Yup.number().required('Studente obbligatorio'),
  start_date: Yup.date()
    .required('Data inizio obbligatoria')
    .max(new Date(), 'La data di inizio non può essere nel futuro'),
  student_id: Yup.number().required('Studente obbligatorio'),
  start_date: Yup.date().required('Data inizio obbligatoria'),
  total_hours: Yup.number()
    .positive('Il numero di ore deve essere positivo')
    .required('Numero di ore obbligatorio'),
  package_cost: Yup.number()
    .min(0, 'Il costo non può essere negativo')
    .required('Costo pacchetto obbligatorio'),
  is_paid: Yup.boolean(),
  status: Yup.string().oneOf(['in_progress', 'completed']),
  remaining_hours: Yup.number().when('status', {
    is: 'in_progress',
    then: () => Yup.number()
      .min(0, 'Le ore rimanenti non possono essere negative')
      .required('Ore rimanenti obbligatorie'),
    otherwise: () => Yup.number().notRequired(),
  }),
});

function PackageFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [initialValues, setInitialValues] = useState({
    student_id: '',
    start_date: new Date(),
    total_hours: '',
    package_cost: '',
    is_paid: false,
    status: 'in_progress',
    remaining_hours: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Carica tutti gli studenti
        const studentsResponse = await studentService.getAll();
        setStudents(studentsResponse.data);

        // Se in modalità modifica, carica i dati del pacchetto
        if (isEditMode) {
          const packageResponse = await packageService.getById(id);
          const packageData = packageResponse.data;

          setInitialValues({
            student_id: packageData.student_id,
            start_date: parseISO(packageData.start_date),
            total_hours: packageData.total_hours,
            package_cost: packageData.package_cost,
            is_paid: packageData.is_paid,
            status: packageData.status,
            remaining_hours: packageData.remaining_hours,
          });
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Impossibile caricare i dati. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError(null);

      // Formatta la data per l'API
      const formattedValues = {
        ...values,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
      };

      // Se nuovo pacchetto, imposta ore rimanenti uguali a ore totali
      if (!isEditMode) {
        formattedValues.remaining_hours = formattedValues.total_hours;
      }

      if (isEditMode) {
        await packageService.update(id, formattedValues);
      } else {
        await packageService.create(formattedValues);
      }

      navigate('/packages');
    } catch (err) {
      console.error('Error saving package:', err);
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
        {isEditMode ? 'Modifica Pacchetto' : 'Nuovo Pacchetto'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={initialValues}
          validationSchema={PackageSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            setFieldValue,
            isSubmitting,
          }) => (
            <Form>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={touched.student_id && Boolean(errors.student_id)}>
                    <InputLabel id="student-label">Studente</InputLabel>
                    <Select
                      labelId="student-label"
                      name="student_id"
                      value={values.student_id}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Studente"
                      disabled={isEditMode} // Non permettere di cambiare lo studente in modalità modifica
                    >
                      {students.map((student) => (
                        <MenuItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name}
                        </MenuItem>
                      ))}
                    </Select>
                    {touched.student_id && errors.student_id && (
                      <FormHelperText>{errors.student_id}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Data inizio"
                    value={values.start_date}
                    onChange={(date) => setFieldValue('start_date', date)}
                    maxDate={new Date()} // Aggiunge questa riga
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: touched.start_date && Boolean(errors.start_date),
                        helperText: touched.start_date && errors.start_date,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="total_hours"
                    label="Totale ore"
                    type="number"
                    value={values.total_hours}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      handleChange(e);

                      // Se è un nuovo pacchetto, aggiorna automaticamente le ore rimanenti
                      if (!isEditMode) {
                        setFieldValue('remaining_hours', value);
                      }
                    }}
                    onBlur={handleBlur}
                    error={touched.total_hours && Boolean(errors.total_hours)}
                    helperText={touched.total_hours && errors.total_hours}
                    inputProps={{
                      min: 0.5,
                      step: 0.5,
                    }}
                    required
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="package_cost"
                    label="Costo pacchetto"
                    type="number"
                    value={values.package_cost}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.package_cost && Boolean(errors.package_cost)}
                    helperText={touched.package_cost && errors.package_cost}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                    required
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Stato del pacchetto
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={touched.status && Boolean(errors.status)}>
                    <InputLabel id="status-label">Stato</InputLabel>
                    <Select
                      labelId="status-label"
                      name="status"
                      value={values.status}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Stato"
                    >
                      <MenuItem value="in_progress">In corso</MenuItem>
                      <MenuItem value="completed">Terminato</MenuItem>
                    </Select>
                    {touched.status && errors.status && (
                      <FormHelperText>{errors.status}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="is_paid"
                        checked={values.is_paid}
                        onChange={handleChange}
                      />
                    }
                    label="Pacchetto pagato"
                  />
                </Grid>

                {values.status === 'in_progress' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="remaining_hours"
                      label="Ore rimanenti"
                      type="number"
                      value={values.remaining_hours}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.remaining_hours && Boolean(errors.remaining_hours)}
                      helperText={touched.remaining_hours && errors.remaining_hours}
                      inputProps={{
                        min: 0,
                        step: 0.5,
                        max: values.total_hours,
                      }}
                      required
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/packages')}
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

export default PackageFormPage;