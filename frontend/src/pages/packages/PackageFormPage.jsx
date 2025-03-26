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
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';

import { studentService, packageService, lessonService } from '../../services/api';
import StudentAutocomplete from '../../components/common/StudentAutocomplete';

function PackageFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // Stati
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [students, setStudents] = useState([]);
  const [packageLessons, setPackageLessons] = useState([]);
  const [overflowDetails, setOverflowDetails] = useState(null);

  // Calcola le ore utilizzate
  const hoursUsed = useMemo(() =>
    packageLessons.reduce((total, lesson) => total + parseFloat(lesson.duration), 0),
    [packageLessons]
  );

  // Stato iniziale del form
  const [initialValues, setInitialValues] = useState({
    student_id: '',
    start_date: new Date(),
    total_hours: '',
    package_cost: '',
    is_paid: false,
    payment_date: null,
    package_type: 'fixed',
    expiry_date: null,
  });

  // Funzione per trasformare le stringhe vuote in null
  const transformEmptyToNull = (value, originalValue) => {
    return originalValue === '' ? null : value;
  };

  // Schema di validazione più flessibile
  const createPackageSchema = (packageType = 'fixed', isPaid = false) => {
    return Yup.object().shape({
      student_id: Yup.number().required('Studente obbligatorio'),
      start_date: Yup.date().required('Data inizio obbligatoria'),
      package_type: Yup.string().required('Tipo di pacchetto obbligatorio'),

      // Campi condizionali basati su tipo di pacchetto e stato di pagamento
      total_hours: packageType === 'fixed'
        ? Yup.number()
          .transform(transformEmptyToNull)
          .positive('Il numero di ore deve essere positivo')
          .required('Numero di ore obbligatorio')
        : Yup.number()
          .transform(transformEmptyToNull)
          .nullable()
          .when('is_paid', (isPaid, schema) => {
            return isPaid
              ? schema.positive('Il numero di ore deve essere positivo').required('Numero di ore obbligatorio')
              : schema.notRequired();
          }),

      package_cost: packageType === 'fixed'
        ? Yup.number()
          .transform(transformEmptyToNull)
          .positive('Il costo deve essere positivo')
          .required('Costo pacchetto obbligatorio')
        : Yup.number()
          .transform(transformEmptyToNull)
          .nullable()
          .when('is_paid', (isPaid, schema) => {
            return isPaid
              ? schema.positive('Il costo deve essere positivo').required('Costo pacchetto obbligatorio')
              : schema.notRequired();
          }),


      is_paid: Yup.boolean(),
      payment_date: Yup.date().nullable(),
    });
  };

  // Caricamento dati iniziali
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Carica studenti
        const studentsResponse = await studentService.getAll();
        setStudents(studentsResponse.data);

        // Modalità modifica
        if (isEditMode) {
          // Carica dati pacchetto
          const packageResponse = await packageService.getById(id);
          const packageData = packageResponse.data;

          // Carica lezioni del pacchetto
          const lessonsResponse = await lessonService.getAll();
          const filteredLessons = lessonsResponse.data.filter(
            lesson => lesson.package_id === parseInt(id) && lesson.is_package
          );
          setPackageLessons(filteredLessons);

          // Imposta valori iniziali
          setInitialValues({
            student_id: packageData.student_id,
            start_date: parseISO(packageData.start_date),
            total_hours: packageData.total_hours || '',
            package_cost: packageData.package_cost || '',
            is_paid: packageData.is_paid,
            payment_date: packageData.payment_date ? parseISO(packageData.payment_date) : null,
            package_type: packageData.package_type || 'fixed',
            expiry_date: packageData.expiry_date ? parseISO(packageData.expiry_date) : null,
          });
        }
      } catch (err) {
        console.error('Errore caricamento dati:', err);
        setError('Impossibile caricare i dati. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id, isEditMode]);

  // Gestione overflow da lezione
  useEffect(() => {
    if (location.state?.overflow_from_lesson) {
      const { student_id, overflow_hours, suggested_hours } = location.state;

      setOverflowDetails({
        studentId: student_id,
        overflowHours: overflow_hours,
        suggestedHours: suggested_hours || Math.max(5, Math.ceil(overflow_hours * 2))
      });

      // Pre-compila il form
      setInitialValues(prev => ({
        ...prev,
        student_id: student_id,
        total_hours: suggested_hours || Math.max(5, Math.ceil(overflow_hours * 2)),
        package_cost: '',
        is_paid: false,
        package_type: 'fixed'
      }));

      // Messaggio informativo
      setInfoMessage(
        `Stai creando un nuovo pacchetto per gestire ${overflow_hours} ore eccedenti da una lezione. ` +
        `Il pacchetto avrà già dedotte queste ore eccedenti dal totale.`
      );
    }
  }, [location.state]);

  // Calcola la data di scadenza
  const calculateExpiryDate = (startDate) => {
    if (!startDate) return null;
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    return addDays(weekStart, 28);
  };

  // Gestore del submit
  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      setError(null);

      // Validazione ore utilizzate
      if (isEditMode && parseFloat(values.total_hours) < hoursUsed) {
        setFieldError('total_hours', `Non puoi impostare meno di ${hoursUsed} ore (ore già utilizzate)`);
        setSubmitting(false);
        return;
      }

      // Preparazione dati
      const packageData = {
        ...values,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        total_hours: values.package_type === 'fixed'
          ? parseFloat(values.total_hours)
          : (values.is_paid ? parseFloat(values.total_hours || 0) : 0),
        package_cost: values.package_type === 'fixed'
          ? parseFloat(values.package_cost)
          : (values.is_paid ? parseFloat(values.package_cost || 0) : 0),
        payment_date: values.is_paid && values.payment_date
          ? format(values.payment_date, 'yyyy-MM-dd')
          : null,
        expiry_date: values.package_type === 'fixed'
          ? format(calculateExpiryDate(values.start_date), 'yyyy-MM-dd')
          : null,
        status: 'in_progress', // Lo stato verrà gestito dal backend se necessario
        remaining_hours: values.package_type === 'fixed'
          ? parseFloat(values.total_hours)
          : 0
      };

      // Salvataggio pacchetto
      if (isEditMode) {
        await packageService.update(id, packageData);
      } else {
        const response = await packageService.create(packageData);

        // Gestione lezione dopo creazione pacchetto
        if (location.state?.create_lesson_after && location.state?.lesson_data) {
          try {
            const lessonData = {
              ...location.state.lesson_data,
              student_id: values.student_id,
              is_package: true,
              package_id: response.data.id,
              lesson_date: format(parseISO(location.state.lesson_data.lesson_date), 'yyyy-MM-dd'),
              total_payment: location.state.lesson_data.duration * location.state.lesson_data.hourly_rate
            };

            await lessonService.create(lessonData);
          } catch (lessonError) {
            console.error('Errore creazione lezione:', lessonError);
            alert('Pacchetto creato, ma errore nella creazione della lezione.');
          }
        }
      }

      // Navigazione
      navigate('/packages');
    } catch (err) {
      console.error('Errore salvataggio pacchetto:', err);
      setError('Errore durante il salvataggio. Probabilmente lo studente ha già un pacchetto aperto.');
    } finally {
      setSubmitting(false);
    }
  };

  // Rendering
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
          validationSchema={(values) => {
            const pkgType = (values && values.package_type) ? values.package_type : initialValues.package_type;
            const isPaid = (values && typeof values.is_paid !== "undefined") ? values.is_paid : initialValues.is_paid;
            return createPackageSchema(pkgType, isPaid);
          }}
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
                {/* Studente */}
                <Grid item xs={12} md={6}>
                  <StudentAutocomplete
                    value={values.student_id}
                    onChange={(studentId) => setFieldValue('student_id', studentId)}
                    error={touched.student_id && Boolean(errors.student_id)}
                    helperText={touched.student_id && errors.student_id}
                    disabled={isEditMode}
                    required
                    students={students}
                  />
                </Grid>

                {/* Data inizio */}
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Data inizio"
                    value={values.start_date}
                    onChange={(date) => {
                      setFieldValue('start_date', date);
                      // Aggiorna data scadenza per pacchetti fissi
                      if (values.package_type === 'fixed') {
                        setFieldValue('expiry_date', calculateExpiryDate(date));
                      }
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

                {/* Tipo di pacchetto */}
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <RadioGroup
                      row
                      name="package_type"
                      value={values.package_type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setFieldValue('package_type', newType);

                        // Reset campi per pacchetti aperti
                        if (newType === 'open') {
                          if (!isEditMode) {
                            setFieldValue('total_hours', '');
                            setFieldValue('package_cost', '');
                          }
                          setFieldValue('expiry_date', null);
                        } else {
                          // Per pacchetti fissi, calcola data scadenza
                          setFieldValue('expiry_date', calculateExpiryDate(values.start_date));
                        }
                      }}
                    >
                      <FormControlLabel
                        value="fixed"
                        control={<Radio />}
                        label="Pacchetto 4 settimane"
                      />
                      <FormControlLabel
                        value="open"
                        control={<Radio />}
                        label="Pacchetto aperto"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* Data scadenza (solo pacchetti fissi) */}
                {values.package_type === 'fixed' && (
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Data di scadenza"
                      value={calculateExpiryDate(values.start_date)}
                      readOnly
                      disabled
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          helperText: "Lunedì della 4ª settimana dalla data di inizio",
                        },
                      }}
                    />
                  </Grid>
                )}

                {/* Ore totali (condizionale) */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="total_hours"
                    label={values.package_type === 'open' ? "Ore accumulate" : "Totale ore"}
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
                      min: values.package_type === 'fixed' ? 0.5 : 0,
                      step: 0.5,
                    }}
                    required={values.package_type === 'fixed'}
                    disabled={values.package_type === 'open' && !values.is_paid && !isEditMode}
                  />
                </Grid>

                {/* Costo pacchetto (condizionale) */}
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
                    inputProps={{
                      min: 0,
                      step: 0.5,
                    }}
                    required={values.package_type === 'fixed' || (values.package_type === 'open' && values.is_paid)}
                    disabled={values.package_type === 'open' && !values.is_paid && !isEditMode}
                  />
                </Grid>

                {/* Divisore stato pacchetto */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Stato del Pacchetto
                  </Typography>
                </Grid>

                {/* Switch pagamento */}
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="is_paid"
                        checked={values.is_paid}
                        onChange={(e) => {
                          const isPaid = e.target.checked;
                          setFieldValue('is_paid', isPaid);

                          // Per pacchetti aperti, abilita l'inserimento di ore e costo
                          if (values.package_type === 'open' && isPaid) {
                            // Se non ci sono valori, imposta a zero
                            setFieldValue('total_hours', values.total_hours || 0);
                            setFieldValue('package_cost', values.package_cost || 0);
                          }
                        }}
                      />
                    }
                    label="Pacchetto pagato"
                  />
                </Grid>

                {/* Data pagamento */}
                {values.is_paid && (
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="Data pagamento"
                      value={values.payment_date}
                      onChange={(date) => setFieldValue('payment_date', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: touched.payment_date && Boolean(errors.payment_date),
                          helperText: touched.payment_date && errors.payment_date,
                        },
                      }}
                    />
                  </Grid>
                )}

                {/* Dettagli aggiuntivi pacchetti aperti */}
                {values.package_type === 'open' && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <Typography variant="body2">
                        Un pacchetto aperto permette di accumulare ore di lezione senza una
                        scadenza predefinita. Puoi aggiungere ore e modificare il costo in
                        qualsiasi momento dopo aver contrassegnato il pacchetto come pagato.
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {/* Pulsanti di azione */}
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
