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

  // Calcola le ore già usate
  const hoursUsed = useMemo(() =>
    packageLessons.reduce((total, lesson) => total + parseFloat(lesson.duration || 0), 0),
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
    package_type: 'open', // Default a pacchetto aperto
    expiry_date: null,
  });

  // Schema di validazione dinamico in base al tipo di pacchetto
  const createPackageSchema = (packageType = 'open', isPaid = false) => {
    const baseSchema = {
      student_id: Yup.number().required('Studente obbligatorio'),
      start_date: Yup.date().required('Data inizio obbligatoria'),
      package_type: Yup.string().required('Tipo di pacchetto obbligatorio'),
      is_paid: Yup.boolean(),
    };

    // Per i pacchetti fissi, aggiungiamo validazioni per ore e costo
    if (packageType === 'fixed') {
      return Yup.object().shape({
        ...baseSchema,
        total_hours: Yup.number()
          .transform((value, originalValue) => originalValue === '' ? null : value)
          .positive('Il numero di ore deve essere positivo')
          .required('Numero di ore obbligatorio'),
        package_cost: Yup.number()
          .transform((value, originalValue) => originalValue === '' ? null : value)
          .min(0, 'Il costo non può essere negativo')
          .required('Costo pacchetto obbligatorio'),
        payment_date: Yup.date().nullable().when('is_paid', {
          is: true,
          then: () => Yup.date().nullable().required('Data di pagamento obbligatoria')
        }),
      });
    }

    // Per i pacchetti aperti, la validazione dipende dallo stato di pagamento
    if (isPaid) {
      // Pacchetto aperto pagato
      return Yup.object().shape({
        ...baseSchema,
        total_hours: Yup.number()
          .transform((value, originalValue) => originalValue === '' ? null : value)
          .positive('Il numero di ore deve essere positivo')
          .required('Numero di ore obbligatorio per pacchetti pagati'),
        package_cost: Yup.number()
          .transform((value, originalValue) => originalValue === '' ? null : value)
          .min(0, 'Il costo non può essere negativo')
          .required('Costo pacchetto obbligatorio per pacchetti pagati'),
        payment_date: Yup.date().nullable().required('Data di pagamento obbligatoria'),
      });
    } else {
      // Pacchetto aperto non pagato - ore e costo non richiesti
      return Yup.object().shape({
        ...baseSchema,
        total_hours: Yup.number()
          .transform((value, originalValue) => originalValue === '' ? null : value)
          .nullable(),
        package_cost: Yup.number()
          .transform((value, originalValue) => originalValue === '' ? null : value)
          .nullable(),
        payment_date: Yup.date().nullable(),
      });
    }
  };

  // Funzione per controllare se lo studente ha già un pacchetto attivo
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
          setInfoMessage("Attenzione: lo studente ha già un pacchetto in corso.");
        } else {
          setInfoMessage('');
        }
      })
      .catch(err => console.error("Errore nel controllo pacchetto attivo:", err));
  };

  // Caricamento dati iniziali
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
            return lessonService.getAll()
              .then(lessonsResponse => {
                const filteredLessons = lessonsResponse.data.filter(
                  lesson => lesson.package_id === parseInt(id) && lesson.is_package
                );
                setPackageLessons(filteredLessons);
                setInitialValues({
                  student_id: packageData.student_id,
                  start_date: parseISO(packageData.start_date),
                  // Per pacchetti aperti non pagati, mostra ore accumulate
                  total_hours: packageData.package_type === 'open' && !packageData.is_paid
                    ? (filteredLessons.reduce((sum, l) => sum + parseFloat(l.duration), 0)).toString()
                    : packageData.total_hours.toString(),
                  package_cost: packageData.package_type === 'open' && !packageData.is_paid
                    ? ''
                    : packageData.package_cost.toString(),
                  is_paid: packageData.is_paid,
                  payment_date: packageData.payment_date ? parseISO(packageData.payment_date) : null,
                  package_type: packageData.package_type,
                  expiry_date: packageData.expiry_date ? parseISO(packageData.expiry_date) : null,
                });
              });
          }
        })
        .catch(err => {
          console.error('Errore caricamento dati:', err);
          setError('Impossibile caricare i dati. Prova a riaggiornare la pagina.');
        })
        .finally(() => {
          setLoading(false);
        });
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
      setInitialValues(prev => ({
        ...prev,
        student_id: student_id,
        total_hours: suggested_hours || Math.max(5, Math.ceil(overflow_hours * 2)),
        package_cost: '',
        is_paid: false,
        package_type: 'fixed'
      }));
      setInfoMessage(
        `Stai creando un nuovo pacchetto per gestire ${overflow_hours} ore eccedenti da una lezione. ` +
        `Il pacchetto avrà già dedotte queste ore eccedenti dal totale.`
      );
    }
  }, [location.state]);

  // Calcola la data di scadenza (per pacchetti fissi)
  const calculateExpiryDate = (startDate) => {
    if (!startDate) return null;
    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    return addDays(weekStart, 28);
  };

  // Gestione submit del form usando promise chaining
  // Funzione handleSubmit corretta
const handleSubmit = (values, { setSubmitting, setFieldError }) => {
  setError(null);

  // Per pacchetti fissi, verifica che le ore totali siano sufficienti
  if (isEditMode && values.package_type === 'fixed' && parseFloat(values.total_hours) < hoursUsed) {
    setFieldError('total_hours', `Non puoi impostare meno di ${hoursUsed} ore (ore già utilizzate)`);
    setSubmitting(false);
    return;
  }

  // Copiamo i valori e convertiamo esplicitamente i tipi
  let packageData = { 
    ...values,
    // Formatta la data di inizio in formato YYYY-MM-DD
    start_date: format(new Date(values.start_date), 'yyyy-MM-dd'),
    // Converte esplicitamente i valori numerici
    total_hours: values.package_type === 'fixed' 
      ? Math.max(0.5, parseFloat(values.total_hours) || 1) // Almeno 0.5 per pacchetti fissi
      : values.is_paid 
        ? parseFloat(values.total_hours) || 0
        : 0,
    package_cost: parseFloat(values.package_cost) || 0,
  };

  // Gestisci la data di pagamento
  packageData.payment_date = values.is_paid && values.payment_date
    ? format(new Date(values.payment_date), 'yyyy-MM-dd')
    : null;

  // Gestisci expiry_date per pacchetti fissi
  if (packageData.package_type === 'fixed') {
    packageData.expiry_date = format(calculateExpiryDate(values.start_date), 'yyyy-MM-dd');
  } else {
    packageData.expiry_date = null;
  }

  // Imposta lo stato
  packageData.status = 'in_progress';

  console.log("Invio pacchetto con dati:", packageData);

  // Verifiche esplicite prima dell'invio
  if (packageData.package_type === 'fixed' && packageData.total_hours <= 0) {
    setError('Per i pacchetti a durata fissa, le ore devono essere maggiori di zero');
    setSubmitting(false);
    return;
  }

  let submitPromise;
  if (isEditMode) {
    submitPromise = packageService.update(id, packageData);
  } else {
    submitPromise = packageService.create(packageData).then(response => {
      if (location.state?.create_lesson_after && location.state?.lesson_data) {
        const lessonData = {
          ...location.state.lesson_data,
          student_id: values.student_id,
          is_package: true,
          package_id: response.data.id,
          lesson_date: format(new Date(location.state.lesson_data.lesson_date), 'yyyy-MM-dd'),
          total_payment: location.state.lesson_data.duration * location.state.lesson_data.hourly_rate
        };
        return lessonService.create(lessonData);
      }
      return response;
    });
  }

  submitPromise
    .then(() => navigate('/packages'))
    .catch(err => {
      console.error('Errore salvataggio pacchetto:', err);
      let errorMessage = 'Errore durante il salvataggio. ';
      
      if (err.response?.data) {
        try {
          if (Array.isArray(err.response.data)) {
            // Se è un array, estraiamo il messaggio dal primo errore
            errorMessage += err.response.data[0]?.msg || JSON.stringify(err.response.data);
          } else if (typeof err.response.data === 'object') {
            errorMessage += err.response.data.detail || JSON.stringify(err.response.data);
          } else {
            errorMessage += err.response.data;
          }
        } catch (e) {
          errorMessage += 'Errore di validazione dati.';
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
          validationSchema={(values) => {
            const pkgType = values?.package_type || initialValues.package_type;
            const isPaid = values?.is_paid !== undefined ? values.is_paid : initialValues.is_paid;
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
                {/* RIGA 1: Studente e Data inizio */}
                <Grid item xs={12} md={6}>
                  <StudentAutocomplete
                    value={values.student_id}
                    onChange={(studentId) => {
                      setFieldValue('student_id', studentId);
                      checkActivePackage(studentId);
                    }}
                    error={touched.student_id && Boolean(errors.student_id)}
                    helperText={touched.student_id && errors.student_id}
                    disabled={isEditMode}
                    required
                    students={students}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Data inizio"
                    value={values.start_date}
                    onChange={(date) => {
                      setFieldValue('start_date', date);
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

                {/* RIGA 2: Tipo di pacchetto */}
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <Typography variant="subtitle1" gutterBottom>
                      Tipo di pacchetto
                    </Typography>
                    <RadioGroup
                      row
                      name="package_type"
                      value={values.package_type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setFieldValue('package_type', newType);

                        if (newType === 'open') {
                          // Se passa a pacchetto aperto
                          if (!isEditMode) {
                            // Per nuovi pacchetti aperti
                            setFieldValue('is_paid', false);
                            setFieldValue('payment_date', null);
                            setFieldValue('total_hours', '');
                            setFieldValue('package_cost', '');
                          } else if (hoursUsed > 0) {
                            // Per pacchetti esistenti con ore
                            setFieldValue('total_hours', hoursUsed);
                          }
                          setFieldValue('expiry_date', null);
                        } else {
                          // Se passa a pacchetto fisso
                          setFieldValue('expiry_date', calculateExpiryDate(values.start_date));

                          // Assicurati che le ore totali siano sufficienti
                          if (hoursUsed > 0 && (!values.total_hours || parseFloat(values.total_hours) < hoursUsed)) {
                            setFieldValue('total_hours', hoursUsed);
                          } else if (!values.total_hours || parseFloat(values.total_hours) <= 0) {
                            setFieldValue('total_hours', '1');
                          }

                          // Assicurati che ci sia un costo
                          if (!values.package_cost) {
                            const defaultRate = 20;
                            setFieldValue('package_cost', (parseFloat(values.total_hours) || 1) * defaultRate);
                          }
                        }
                      }}
                    >
                      <FormControlLabel
                        value="fixed"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1">Pacchetto 4 settimane</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Ore prefissate, scadenza dopo 4 settimane
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="open"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1">Pacchetto aperto</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Le ore si accumulano man mano, senza scadenza
                            </Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>

                {/* RIGA 3: Data di scadenza (solo per pacchetti fissi) e Ore totali */}
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

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="total_hours"
                    label={values.package_type === 'open' ?
                      (values.is_paid ? "Ore fissate" : "Ore accumulate") :
                      "Totale ore"}
                    type="number"
                    value={values.total_hours}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.total_hours && Boolean(errors.total_hours)}
                    helperText={
                      (touched.total_hours && errors.total_hours) ||
                      (isEditMode && values.package_type === 'fixed'
                        ? `Ore già utilizzate: ${hoursUsed}`
                        : values.package_type === 'open' && !values.is_paid
                          ? 'Le ore si accumulano automaticamente con l\'uso'
                          : '')
                    }
                    inputProps={{
                      min: values.package_type === 'fixed' ? 0.5 : 0,
                      step: 0.5,
                    }}
                    required={values.package_type === 'fixed' || (values.package_type === 'open' && values.is_paid)}
                    disabled={values.package_type === 'open' && !values.is_paid}
                  />
                </Grid>

                {/* RIGA 4: Costo pacchetto */}
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
                    helperText={
                      (touched.package_cost && errors.package_cost) ||
                      (values.package_type === 'open' && !values.is_paid
                        ? 'Il costo va indicato solo al momento del pagamento'
                        : '')
                    }
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.5,
                    }}
                    required={values.package_type === 'fixed' || (values.package_type === 'open' && values.is_paid)}
                    disabled={values.package_type === 'open' && !values.is_paid}
                  />
                </Grid>

                {/* RIGA 5: Stato del pacchetto */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Stato del Pacchetto
                  </Typography>
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
                            // Se viene marcato come pagato
                            if (!values.payment_date) {
                              setFieldValue('payment_date', new Date());
                            }

                            // Per pacchetti aperti, gestione speciale quando vengono pagati
                            if (values.package_type === 'open') {
                              if (!values.total_hours || parseFloat(values.total_hours) <= 0) {
                                // Se non ci sono ore accumulate, imposta un minimo
                                setFieldValue('total_hours', hoursUsed > 0 ? hoursUsed : 1);
                              }

                              if (!values.package_cost || parseFloat(values.package_cost) <= 0) {
                                // Calcola costo default
                                const hourlyRate = 20;
                                setFieldValue('package_cost', (hoursUsed || 1) * hourlyRate);
                              }
                            }
                          } else if (values.package_type === 'open') {
                            // Se un pacchetto aperto diventa non pagato
                            setFieldValue('payment_date', null);
                            if (isEditMode) {
                              // In modifica, mostra le ore accumulate
                              setFieldValue('total_hours', hoursUsed || '');
                            } else {
                              // In creazione, reset dei campi
                              setFieldValue('total_hours', '');
                            }
                            setFieldValue('package_cost', '');
                          }
                        }}
                        disabled={isEditMode && values.is_paid && values.package_type === 'fixed'}
                      />
                    }
                    label="Pacchetto pagato"
                  />
                  {isEditMode && values.is_paid && values.package_type === 'fixed' && (
                    <FormHelperText>
                      Non è possibile rimuovere il pagamento da un pacchetto fisso
                    </FormHelperText>
                  )}
                  {(!isEditMode && values.package_type === 'open') && (
                    <FormHelperText>
                      In un pacchetto aperto, il pagamento si registra dopo aver accumulato ore
                    </FormHelperText>
                  )}
                </Grid>

                {values.is_paid && (
                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="Data pagamento"
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

                {/* RIGA 6: Informazioni specifiche per pacchetti */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />

                  {values.package_type === 'open' && !values.is_paid && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Un pacchetto aperto permette di accumulare ore di lezione senza una scadenza predefinita.
                        Le ore si accumulano automaticamente aggiungendo lezioni al pacchetto.
                        Al momento del pagamento, dovrai confermare le ore accumulate e impostare il costo totale.
                      </Typography>
                    </Alert>
                  )}

                  {values.package_type === 'open' && values.is_paid && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Questo pacchetto aperto è pagato. Le ore accumulate e il costo sono fissati,
                        ma è possibile continuare ad aggiungere lezioni in futuro.
                      </Typography>
                    </Alert>
                  )}

                  {values.package_type === 'fixed' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        Questo pacchetto ha una durata di 4 settimane e un numero di ore prefissato.
                        La scadenza è calcolata automaticamente come il lunedì della quarta settimana dopo la data di inizio.
                      </Typography>
                    </Alert>
                  )}
                </Grid>

                {/* RIGA 7: Pulsanti di azione */}
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button variant="outlined" onClick={() => navigate('/packages')} disabled={isSubmitting}>
                      Annulla
                    </Button>
                    <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                      {isSubmitting ? <CircularProgress size={24} /> : isEditMode ? 'Aggiorna' : 'Crea'}
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