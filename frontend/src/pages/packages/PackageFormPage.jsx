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
  FormHelperText,
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
import StudentMultiAutocomplete from '../../components/common/StudentMultiAutocomplete';



function PackageFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth(); // Add isAdmin here
  const isEditMode = !!id;

  // States
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [students, setStudents] = useState([]);
  const [packageLessons, setPackageLessons] = useState([]);
  const [overflowDetails, setOverflowDetails] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);


  // Calculate used hours
  const hoursUsed = useMemo(() =>
    packageLessons.reduce((total, lesson) => total + parseFloat(lesson.duration || 0), 0),
    [packageLessons]
  );

  // Initial form state
  const [initialValues, setInitialValues] = useState({
    student_ids: [],
    start_date: new Date(),
    total_hours: '',
    package_cost: '',
    is_paid: false,
    payment_date: null,
    notes: ''
  });

  // Package validation schema
  const PackageSchema = Yup.object().shape({
    student_ids: Yup.array()
      .min(1, 'Almeno uno studente è richiesto')
      .max(3, 'Massimo 3 studenti per pacchetto')
      .required('Seleziona almeno uno studente'),
    start_date: Yup.date().required('La data di inizio è richiesta'),
    total_hours: Yup.number()
      .transform((value, originalValue) => originalValue === '' ? null : value)
      .positive('Le ore devono essere positive')
      .required('Le ore sono richieste'),
    package_cost: Yup.number()
      .transform((value, originalValue) => originalValue === '' ? null : value)
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
  });

  // Function to check if student has active package
  const checkActivePackage = (studentId) => {
    if (!studentId) return;
    packageService.getAll()
      .then((packagesResponse) => {
        const activePackages = packagesResponse.data.filter(pkg =>
          pkg.student_id === studentId &&
          pkg.status === "in_progress" &&
          (!isEditMode || pkg.id !== parseInt(id))
        );
        if (activePackages.length > 0) {
          setInfoMessage("Attenzione: lo studente ha già un pacchetto all'attivo.");
        } else {
          setInfoMessage('');
        }
      })
      .catch(err => console.error("Error checking active package:", err));
  };

  // Calculate expiry date (30 days from start date)
  const calculateExpiryDate = (startDate) => {
    if (!startDate) return null;

    // Troviamo il lunedì della settimana corrente
    const currentWeekMonday = startOfWeek(startDate, { weekStartsOn: 1 });

    // Aggiungiamo 4 settimane (28 giorni)
    const expiryDate = addDays(currentWeekMonday, 28);

    return expiryDate;
  };

  // Load initial data
  useEffect(() => {
    const fetchInitialData = () => {
      setLoading(true);
      studentService.getAll()
        .then(studentsResponse => {
          setStudents(studentsResponse.data);
          if (isEditMode) {
            return packageService.getById(id);
          }
        })
        .then(packageResponse => {
          if (packageResponse) {
            const packageData = packageResponse.data;

            // Ensure student_ids is an array
            const studentIds = packageData.student_ids || [];

            return lessonService.getAll()
              .then(lessonsResponse => {
                const filteredLessons = lessonsResponse.data.filter(
                  lesson => lesson.package_id === parseInt(id) && lesson.is_package
                );
                setPackageLessons(filteredLessons);
                setInitialValues({
                  student_ids: studentIds,
                  start_date: parseISO(packageData.start_date),
                  total_hours: packageData.total_hours.toString(),
                  package_cost: packageData.package_cost.toString(),
                  is_paid: packageData.is_paid,
                  payment_date: packageData.payment_date ? parseISO(packageData.payment_date) : null,
                  notes: packageData.notes || '',
                });
              });
          }
        })
        .catch(err => {
          console.error('Error loading data:', err);
          setError('Unable to load data. Please try refreshing the page.');
        })
        .finally(() => {
          setLoading(false);
        });
    };

    fetchInitialData();
  }, [id, isEditMode]);

  // Handle overflow from lesson
  useEffect(() => {
    if (location.state?.overflow_from_lesson) {
      const { student_id, overflow_hours, suggested_hours } = location.state;
      setOverflowDetails({
        studentId: student_id,
        overflowHours: overflow_hours,
        suggestedHours: suggested_hours || Math.max(5, Math.ceil(overflow_hours * 2))
      });
      setInitialValues(prev => ({
        ...prev,
        student_id: student_id,
        total_hours: suggested_hours || Math.max(5, Math.ceil(overflow_hours * 2)),
        package_cost: '',
        is_paid: false,
      }));
      setInfoMessage(
        `Creating a new package to handle ${overflow_hours} overflow hours from a lesson. ` +
        `These hours will be deducted from the total.`
      );
    }
  }, [location.state]);

  // Form submission handler
  // Modifica della funzione handleSubmit in PackageFormPage.jsx

  const handleSubmit = (values, { setSubmitting, setFieldError }) => {
    setError(null);
    console.log("Form values at submit:", values);

    // Verifica che student_ids sia un array non vuoto
    if (!values.student_ids || !Array.isArray(values.student_ids) || values.student_ids.length === 0) {
      setFieldError('student_ids', 'Seleziona almeno uno studente');
      setSubmitting(false);
      return;
    }

    // Check if total hours < used hours (for editing)
    if (isEditMode && parseFloat(values.total_hours) < hoursUsed) {
      setFieldError('total_hours', `Cannot set less than ${hoursUsed} hours (hours already used)`);
      setSubmitting(false);
      return;
    }

    // Prepare data for API
    const packageData = {
      ...values,
      // Ensure student_ids is properly passed as an array of numbers
      student_ids: values.student_ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id),
      // Format start date
      start_date: format(new Date(values.start_date), 'yyyy-MM-dd'),
      // Format payment date if present
      payment_date: values.is_paid && values.payment_date
        ? format(new Date(values.payment_date), 'yyyy-MM-dd')
        : null,
      package_cost: values.package_cost || '0',
    };

    // Remove student_id if it exists to avoid confusion
    if (packageData.student_id) {
      delete packageData.student_id;
    }

    console.log("Package data sending to API:", packageData);

    // API call
    let submitPromise;
    if (isEditMode) {
      submitPromise = packageService.update(id, packageData);
    } else {
      // Pass the allow_multiple flag if it exists in location.state
      const allowMultiple = location.state?.allow_multiple || false;
      submitPromise = packageService.create(packageData, allowMultiple);
    }

    submitPromise
      .then((response) => {
        console.log("API Response:", response);
        navigate('/packages');
      })
      .catch(err => {
        console.error('Error saving package:', err);
        let errorMessage = 'Error during save. ';

        if (err.response?.data) {
          try {
            if (Array.isArray(err.response.data)) {
              errorMessage += err.response.data[0]?.msg || JSON.stringify(err.response.data);
            } else if (typeof err.response.data === 'object') {
              errorMessage += err.response.data.detail || JSON.stringify(err.response.data);
            } else {
              errorMessage += err.response.data;
            }
          } catch (e) {
            errorMessage += 'Data validation error.';
          }
        }

        setError(errorMessage);
      })
      .finally(() => setSubmitting(false));
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
                {/* ROW 1: Student and Start Date */}
                <Grid item xs={12}>
                  <Typography variant="h6">
                    Dettagli Pacchetto
                  </Typography>
                </Grid>

                {/* ROW 2: Package Info */}


                <Grid item xs={12} md={6}>
                  <StudentMultiAutocomplete
                    values={values.student_ids}
                    onChange={(selectedIds) => {
                      console.log("Selected student IDs:", selectedIds);
                      // Aggiorna il valore del campo
                      setFieldValue("student_ids", selectedIds);

                      // Semplice validazione manuale con timeout
                      setTimeout(() => {
                        // Trigger blur event sul campo per forzare la validazione di Formik
                        const event = new Event('blur', { bubbles: true });
                        document.activeElement.dispatchEvent(event);
                      }, 100);
                    }}
                    error={touched.student_ids && Boolean(errors.student_ids)}
                    helperText={(touched.student_ids && errors.student_ids) || "Seleziona da 1 a 3 studenti"}
                    disabled={isEditMode}
                    required
                    students={students}
                    maxStudents={3}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
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



                {/* ROW 3: Expiry Date and Hours */}
                <Grid item xs={12} md={6}>
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

                <Grid item xs={12} md={6}>
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
                      (isEditMode ? `Hours already used: ${hoursUsed}` : '')
                    }
                    inputProps={{
                      min: 0.5,
                      step: 0.5,
                    }}
                    required
                  />
                </Grid>

                {/* ROW 4: Package Cost */}
                {isAdmin() ? (
                  <Grid item xs={12} md={6}>
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
                ) : (<input type="hidden" name="package_cost" value={values.package_cost || '0'} />
                )}

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
                    placeholder="Aggiungi qui eventuali note sul pacchetto (es. informazioni sui pagamenti parziali, richieste specifiche, etc.)"
                    value={values.notes}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    multiline
                    rows={4}
                    variant="outlined"
                  />
                </Grid>

                {/* ROW 5: Package Status */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="is_paid"
                        checked={values.is_paid}
                        onChange={(e) => {
                          const isPaid = e.target.checked;
                          setFieldValue('is_paid', isPaid);

                          if (isPaid) {
                            // If marked as paid
                            if (!values.payment_date) {
                              setFieldValue('payment_date', new Date());
                            }
                            // Set default package cost if it's 0
                            if (!values.package_cost || parseFloat(values.package_cost) === 0) {
                              setFieldValue('package_cost', 0); // Default value
                            }
                          } else {
                            // If marked as not paid
                            setFieldValue('payment_date', null);
                            // Don't reset the price to allow preparing the package
                          }
                        }}
                      />
                    }
                    label="Pacchetto Pagato"
                  />
                </Grid>

                {/* ROW 6: Package Status Info */}
                <Grid item xs={12} md={8}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      Lo stato del pacchetto verrà aggiornato automaticamente:
                      <ul>
                        <li><strong>In corso</strong>:  non è ancora arrivata la data di scadenza del pacchetto.</li>
                        <li><strong>Terminato</strong>: la data di scadenza è passata, ma il pacchetto è stato saldato.</li>
                        <li><strong>Scaduto</strong>:   la data odierna è successiva alla data di scadenza e il pacchetto non è pagato.</li>
                      </ul>
                    </Typography>

                  </Alert>
                </Grid>
                {values.is_paid && (
                  <Grid item xs={12} md={4} mt={-10}>
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
                {/* ROW 7: Action Buttons */}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button variant="outlined" onClick={() => navigate('/packages')} disabled={isSubmitting}>
                      Cancella
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                      {isSubmitting ? <CircularProgress size={24} /> : isEditMode ? 'Aggiorna modifiche' : 'Crea Pacchetto'}
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