// src/pages/packages/PackageFormPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';

import { studentService, packageService, lessonService } from '../../services/api';
import StudentAutocomplete from '../../components/common/StudentAutocomplete';
import { useAuth } from '../../context/AuthContext';

// Package validation schema
const PackageSchema = Yup.object().shape({
  student_id_1: Yup.number()
    .nullable()
    .transform((value) => (isNaN(value) ? null : value))
    .positive('Seleziona uno studente valido'),
  student_id_2: Yup.number()
    .nullable()
    .transform((value) => (isNaN(value) ? null : value))
    .positive('Seleziona uno studente valido'),
  student_id_3: Yup.number()
    .nullable()
    .transform((value) => (isNaN(value) ? null : value))
    .positive('Seleziona uno studente valido'),
  start_date: Yup.date().required('La data di inizio è richiesta'),
  total_hours: Yup.number()
    .transform((value, originalValue) =>
      originalValue === '' ? undefined : value)
    .positive('Le ore devono essere positive')
    .required('Le ore sono richieste'),
  package_cost: Yup.number()
    .transform((value, originalValue) =>
      originalValue === '' ? undefined : value)
    .min(0, 'Il costo non può essere negativo')
    .when('is_paid', {
      is: true,
      then: (schema) => schema.required('Il costo è richiesto se il pacchetto è pagato'),
      otherwise: (schema) => schema.optional()
    }),
  is_paid: Yup.boolean(),
  payment_date: Yup.date().nullable().when('is_paid', {
    is: true,
    then: (schema) => schema.required('La data di pagamento è richiesta se il pacchetto è pagato'),
    otherwise: (schema) => schema.nullable()
  }),
  notes: Yup.string().nullable()
});

function PackageFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isEditMode = !!id;

  // States
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [students, setStudents] = useState([]);
  const [packageLessons, setPackageLessons] = useState([]);

  // Track student deletions to warn about related lessons
  const [hasLessonsPerStudent, setHasLessonsPerStudent] = useState({});

  // Initial form state - now with separate student fields
  const [initialValues, setInitialValues] = useState({
    student_id_1: '',
    student_id_2: '',
    student_id_3: '',
    start_date: new Date(),
    total_hours: '',
    package_cost: '',
    is_paid: false,
    payment_date: null,
    notes: ''
  });

  // Calculate used hours
  const hoursUsed = useMemo(() =>
    packageLessons.reduce((total, lesson) => total + parseFloat(lesson.duration || 0), 0),
    [packageLessons]
  );

  // Calculate expiry date (30 days from start date)
  const calculateExpiryDate = (startDate) => {
    if (!startDate) return null;
    const currentWeekMonday = startOfWeek(startDate, { weekStartsOn: 1 });
    return addDays(currentWeekMonday, 28);
  };

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Load all students first
        const studentsResponse = await studentService.getAll();
        setStudents(studentsResponse.data || []);

        // If editing, load package data
        if (isEditMode) {
          const packageResponse = await packageService.getById(id);
          const packageData = packageResponse.data;

          // Handle student IDs for the form
          const studentIds = Array.isArray(packageData.student_ids)
            ? packageData.student_ids
            : packageData.student_id
              ? [packageData.student_id]
              : [];

          // Load lessons associated with this package
          const lessonsResponse = await lessonService.getAll();
          const filteredLessons = lessonsResponse.data.filter(
            lesson => lesson.package_id === parseInt(id) && lesson.is_package
          );
          setPackageLessons(filteredLessons);

          // Track which students have lessons
          const lessonsPerStudent = {};
          filteredLessons.forEach(lesson => {
            if (!lessonsPerStudent[lesson.student_id]) {
              lessonsPerStudent[lesson.student_id] = [];
            }
            lessonsPerStudent[lesson.student_id].push(lesson);
          });
          setHasLessonsPerStudent(lessonsPerStudent);

          // Set form initial values with individual student IDs
          setInitialValues({
            student_id_1: studentIds[0] || '',
            student_id_2: studentIds[1] || '',
            student_id_3: studentIds[2] || '',
            start_date: parseISO(packageData.start_date),
            total_hours: packageData.total_hours.toString(),
            package_cost: packageData.package_cost.toString(),
            is_paid: packageData.is_paid,
            payment_date: packageData.payment_date ? parseISO(packageData.payment_date) : null,
            notes: packageData.notes || '',
          });
        }

        // Set info message if we're coming from an overflow action
        if (location.state?.overflow_from_lesson) {
          setInfoMessage(`Stai creando un nuovo pacchetto per ${location.state.overflow_hours} ore in eccesso. Sono suggerite ${location.state.suggested_hours} ore totali, ma puoi modificare il valore.`);

          // If a student ID is provided, set it
          if (location.state.student_id) {
            setInitialValues(prev => ({
              ...prev,
              student_id_1: location.state.student_id,
              total_hours: location.state.suggested_hours.toString()
            }));
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Unable to load data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id, isEditMode, location.state]);

  const atLeastOneStudentSelected = () => {
    return values => {
      const hasAnyStudent = values.student_id_1 || values.student_id_2 || values.student_id_3;
      if (!hasAnyStudent) {
        return { error: 'È necessario specificare almeno uno studente' };
      }
      return {};
    };
  };

  // Check if a student can be removed (has no lessons)
  const canRemoveStudent = (studentId) => {
    if (!isEditMode) return true; // Always allow in create mode
    if (!studentId) return true; // Always allow removing empty student

    // Check if student has lessons
    return !hasLessonsPerStudent[studentId] || hasLessonsPerStudent[studentId].length === 0;
  };

  // Warn if trying to remove a student with lessons
  const handleStudentChange = (fieldName, value, currentValue, setFieldValue) => {
    // If clearing a student with lessons, show warning
    if (isEditMode && currentValue && !value) {
      const studentId = currentValue;
      if (hasLessonsPerStudent[studentId] && hasLessonsPerStudent[studentId].length > 0) {
        // Find student name
        const student = students.find(s => s.id === studentId);
        const studentName = student ? `${student.first_name} ${student.last_name}` : `Studente #${studentId}`;

        const lessonsCount = hasLessonsPerStudent[studentId].length;
        const confirmMessage = `Attenzione: ${studentName} ha ${lessonsCount} lezioni associate a questo pacchetto. Rimuovendo lo studente, le lezioni rimarranno nel pacchetto ma dovranno essere riassegnate manualmente. Procedere?`;

        if (!window.confirm(confirmMessage)) {
          return; // Abort change if user cancels
        }
      }
    }

    // If we get here, make the change
    setFieldValue(fieldName, value);
  };

  // Modified handleSubmit function with improved error handling
  // Modifica la funzione handleSubmit in PackageFormPage.jsx

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError(null);

      // Migliora la raccolta degli IDs studente, assicurandosi che siano numeri
      const student_ids = [
        values.student_id_1,
        values.student_id_2,
        values.student_id_3
      ]
        .filter(id => id !== null && id !== undefined && id !== '')
        .map(id => typeof id === 'string' ? parseInt(id, 10) : id);

      console.log("IDs studenti raccolti:", student_ids);

      // Verifica che ci sia almeno uno studente
      if (student_ids.length === 0) {
        setError('È necessario specificare almeno uno studente');
        setSubmitting(false);
        return;
      }

      // Prepara i dati per l'API, assicurandosi che student_ids sia incluso
      const packageData = {
        student_ids,  // Esplicitamente incluso
        start_date: format(new Date(values.start_date), 'yyyy-MM-dd'),
        total_hours: values.total_hours,
        package_cost: values.package_cost || '0',
        is_paid: values.is_paid,
        payment_date: values.is_paid && values.payment_date
          ? format(new Date(values.payment_date), 'yyyy-MM-dd')
          : null,
        notes: values.notes
      };

      console.log("Dati pacchetto da inviare all'API:", packageData);

      // Chiamata API con gestione migliorata degli errori
      if (isEditMode) {
        try {
          const response = await packageService.update(id, packageData);
          console.log("Risposta aggiornamento:", response);
        } catch (err) {
          console.error("Dettagli errore API:", err.response?.data || err);
          throw err;
        }
      } else {
        const allowMultiple = location.state?.allow_multiple || false;
        await packageService.create(packageData, allowMultiple);
      }

      navigate('/packages');
    } catch (err) {
      console.error('Error saving package:', err);

      // Gestione errori migliorata
      let errorMessage = 'Errore durante il salvataggio: ';

      if (err.response?.data) {
        try {
          const responseData = err.response.data;

          if (typeof responseData.detail === 'object') {
            errorMessage += responseData.detail.message || JSON.stringify(responseData.detail);
          } else if (responseData.detail) {
            errorMessage += responseData.detail;
          } else {
            errorMessage += JSON.stringify(responseData);
          }
        } catch (e) {
          errorMessage += 'Errore nella validazione dei dati.';
        }
      } else if (err.message) {
        errorMessage += err.message;
      }

      setError(errorMessage);
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

      {infoMessage && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {infoMessage}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={initialValues}
          validationSchema={PackageSchema}
          onSubmit={handleSubmit}
          validate={atLeastOneStudentSelected()}
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
                <Grid item xs={12}>
                  <Typography variant="h6">
                    Dettagli Pacchetto
                  </Typography>
                </Grid>

                {/* Create two columns */}
                <Grid container item xs={12} spacing={3}>

                  {/* Left column for students */}
                  <Grid item xs={12} md={6}>
                    <Grid container spacing={3}>
                      {/* First Student - Always visible */}
                      <Grid item xs={12}>
                        <StudentAutocomplete
                          value={values.student_id_1}
                          onChange={(studentId) => handleStudentChange(
                            'student_id_1',
                            studentId,
                            values.student_id_1,
                            setFieldValue
                          )}
                          error={touched.student_id_1 && Boolean(errors.student_id_1)}
                          helperText={(touched.student_id_1 && errors.student_id_1) ||
                            (isEditMode && !canRemoveStudent(values.student_id_1) ?
                              "Questo studente ha lezioni associate" : "")}
                          disabled={isEditMode && !canRemoveStudent(values.student_id_1)}
                          required={false} // Cambiato da true a false
                          students={students.filter(student =>
                            student.id !== values.student_id_2 &&
                            student.id !== values.student_id_3
                          )}
                        />
                      </Grid>

                      {/* Second Student - Always visible */}
                      <Grid item xs={12}>
                        <StudentAutocomplete
                          value={values.student_id_2}
                          onChange={(studentId) => handleStudentChange(
                            'student_id_2',
                            studentId,
                            values.student_id_2,
                            setFieldValue
                          )}
                          error={touched.student_id_2 && Boolean(errors.student_id_2)}
                          helperText={(touched.student_id_2 && errors.student_id_2) ||
                            "Secondo studente (pacchetto condiviso)" ||
                            (isEditMode && values.student_id_2 && !canRemoveStudent(values.student_id_2) ?
                              "Questo studente ha lezioni associate" : "")}
                          disabled={isEditMode && values.student_id_2 && !canRemoveStudent(values.student_id_2)}
                          required={false}
                          students={students.filter(student =>
                            student.id !== values.student_id_1 &&
                            student.id !== values.student_id_3
                          )}
                        />
                      </Grid>

                      {/* Third Student - Always visible */}
                      <Grid item xs={12}>
                        <StudentAutocomplete
                          value={values.student_id_3}
                          onChange={(studentId) => handleStudentChange(
                            'student_id_3',
                            studentId,
                            values.student_id_3,
                            setFieldValue
                          )}
                          error={touched.student_id_3 && Boolean(errors.student_id_3)}
                          helperText={(touched.student_id_3 && errors.student_id_3) ||
                            "Terzo studente (pacchetto condiviso)" ||
                            (isEditMode && values.student_id_3 && !canRemoveStudent(values.student_id_3) ?
                              "Questo studente ha lezioni associate" : "")}
                          disabled={isEditMode && values.student_id_3 && !canRemoveStudent(values.student_id_3)}
                          required={false}
                          students={students.filter(student =>
                            student.id !== values.student_id_1 &&
                            student.id !== values.student_id_2
                          )}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  {/* Right column for dates and hours - always the same height */}
                  <Grid item xs={12} md={6}>
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <DatePicker
                          label="Data di Inizio"
                          value={values.start_date}
                          onChange={(date) => {
                            setFieldValue('start_date', date);
                          }}
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

                      <Grid item xs={12}>
                        <DatePicker
                          label="Data di Scadenza"
                          value={calculateExpiryDate(values.start_date)}
                          readOnly
                          disabled
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              helperText: "Il pacchetto scade al termine della 4ᵃ settimana",
                            },
                          }}
                        />
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          name="total_hours"
                          label="Ore totali pacchetto"
                          type="number"
                          value={values.total_hours}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={touched.total_hours && Boolean(errors.total_hours)}
                          helperText={
                            (touched.total_hours && errors.total_hours) ||
                            (isEditMode ? `Ore già utilizzate: ${hoursUsed}` : '')
                          }
                          inputProps={{
                            min: 0.5,
                            step: 0.5,
                          }}
                          required
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Notes Field */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Annotazioni
                  </Typography>
                  <TextField
                    fullWidth
                    name="notes"
                    label="Note sul pacchetto"
                    placeholder="Aggiungi qui eventuali note sul pacchetto"
                    value={values.notes || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    multiline
                    rows={4}
                    variant="outlined"
                  />
                </Grid>

                {/* Payment section */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Pagamento
                  </Typography>
                </Grid>

                {/* Package Cost - only show for admins */}
                {isAdmin() && (
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      name="package_cost"
                      label="Prezzo Pacchetto"
                      type="number"
                      value={values.package_cost}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.package_cost && Boolean(errors.package_cost)}
                      helperText={touched.package_cost && errors.package_cost}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">€</InputAdornment>,
                      }}
                      inputProps={{
                        min: 0,
                        step: 0.5,
                      }}
                      required={values.is_paid}
                    />
                  </Grid>
                )}

                <Grid item xs={12} md={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="is_paid"
                        checked={values.is_paid}
                        onChange={(e) => {
                          const isPaid = e.target.checked;
                          setFieldValue('is_paid', isPaid);
                          if (isPaid && !values.payment_date) {
                            setFieldValue('payment_date', new Date());
                          } else if (!isPaid) {
                            setFieldValue('payment_date', null);
                          }
                        }}
                      />
                    }
                    label="Pacchetto Pagato"
                  />
                </Grid>

                {values.is_paid && (
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Data del Pagamento"
                      value={values.payment_date}
                      onChange={(date) => setFieldValue('payment_date', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: touched.payment_date && Boolean(errors.payment_date),
                          helperText: touched.payment_date && errors.payment_date,
                        },
                      }}
                    />
                  </Grid>
                )}

                {/* Action Buttons */}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/packages')}
                      disabled={isSubmitting}
                    >
                      Cancella
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ?
                        <CircularProgress size={24} /> :
                        isEditMode ? 'Aggiorna modifiche' : 'Crea Pacchetto'
                      }
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Form>
          )}
        </Formik>
      </Paper>
    </Box >
  );
}

export default PackageFormPage;