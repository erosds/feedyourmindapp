// src/pages/packages/PackageFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
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
import { studentService, packageService, lessonService } from '../../services/api';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';
import StudentAutocomplete from '../../components/common/StudentAutocomplete';
import { startOfWeek, addDays } from 'date-fns';

// Schema di validazione
const PackageSchema = Yup.object().shape({
  student_id: Yup.number().required('Studente obbligatorio'),
  start_date: Yup.date()
    .required('Data inizio obbligatoria'),
  package_type: Yup.string().required('Tipo di pacchetto obbligatorio'),
  total_hours: Yup.number()
    .when('package_type', {
      is: 'fixed',
      then: () => Yup.number()
        .positive('Il numero di ore deve essere positivo')
        .required('Numero di ore obbligatorio')
        .test('min-overflow-hours', 'Le ore totali devono essere almeno pari alle ore eccedenti della lezione',
          function (value) {
            const { from } = this.options;
            if (from && from.context && from.context.overflow_hours && value < from.context.overflow_hours) {
              return false;
            }
            return true;
          }),
      otherwise: () => Yup.number().nullable(),
    }),
  package_cost: Yup.number()
    .when('package_type', {
      is: 'fixed',
      then: () => Yup.number()
        .min(0, 'Il costo non può essere negativo')
        .required('Costo pacchetto obbligatorio'),
      otherwise: () => Yup.number().nullable(),
    }),
  is_paid: Yup.boolean(),
});

function PackageFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [students, setStudents] = useState([]);
  const [hoursUsed, setHoursUsed] = useState(0);
  const [packageStatus, setPackageStatus] = useState('in_progress');
  const [overflowHours, setOverflowHours] = useState(0);
  const [initialValues, setInitialValues] = useState({
    student_id: '',
    start_date: new Date(),
    total_hours: '',
    package_cost: '',
    is_paid: false,
    payment_date: null,  // Nuovo campo
    package_type: 'fixed',  // Nuovo campo, default "fixed" (pacchetto 4 settimane)
    expiry_date: null,  // Nuovo campo
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Carica tutti gli studenti
        const studentsResponse = await studentService.getAll();
        setStudents(studentsResponse.data);

        // Se in modalità modifica, carica i dati del pacchetto e le lezioni associate
        if (isEditMode) {
          const packageResponse = await packageService.getById(id);
          const packageData = packageResponse.data;

          // Carica le lezioni associate a questo pacchetto
          const lessonsResponse = await lessonService.getAll();
          const packageLessons = lessonsResponse.data.filter(
            lesson => lesson.package_id === parseInt(id) && lesson.is_package
          );

          // Calcola le ore utilizzate
          const usedHours = packageLessons.reduce((total, lesson) => total + parseFloat(lesson.duration), 0);
          setHoursUsed(usedHours);

          // Imposta lo stato del pacchetto in base alle ore rimanenti
          const remainingHours = parseFloat(packageData.total_hours) - usedHours;
          setPackageStatus(remainingHours > 0 ? 'in_progress' : 'completed');

          setInitialValues({
            student_id: packageData.student_id,
            start_date: parseISO(packageData.start_date),
            total_hours: packageData.total_hours,
            package_cost: packageData.package_cost,
            is_paid: packageData.is_paid,
            package_type: packageData.package_type || 'fixed',
            expiry_date: packageData.expiry_date ? parseISO(packageData.expiry_date) : null,
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

  // Gestione delle ore di overflow da lezione
  useEffect(() => {
    if (location.state?.overflow_from_lesson) {
      const { student_id, overflow_hours, suggested_hours } = location.state;

      // Salva le ore eccedenti per uso futuro
      setOverflowHours(overflow_hours);

      // Calcola le ore totali suggerite (doppio delle ore di overflow o almeno 5)
      const totalHours = suggested_hours || Math.max(5, Math.ceil(overflow_hours * 2));

      // Pre-compila automaticamente il form
      setInitialValues({
        ...initialValues,
        student_id: student_id,
        total_hours: totalHours,
        package_cost: '', // L'utente dovrà impostare il costo
        is_paid: false,
      });

      // Mostra un messaggio informativo aggiornato
      setInfoMessage(`Stai creando un nuovo pacchetto per gestire ${overflow_hours} ore eccedenti da una lezione. Il pacchetto avrà già dedotte queste ore eccedenti dal totale.`);
    }
  }, [location.state]);

  // Calcola le ore rimanenti in base alle ore totali e ore usate
  const calculateRemainingHours = (totalHours) => {
    if (isEditMode) {
      return parseFloat(totalHours) - hoursUsed;
    } else if (location.state?.overflow_from_lesson && overflowHours > 0) {
      return parseFloat(totalHours) - overflowHours;
    } else {
      return parseFloat(totalHours);
    }
  };

  // Funzione per calcolare automaticamente la data di scadenza
  const calculateExpiryDate = (startDate) => {
    if (!startDate) return null;

    // Troviamo il lunedì della settimana corrente
    const currentWeekMonday = startOfWeek(startDate, { weekStartsOn: 1 });

    // Aggiungiamo 4 settimane (28 giorni)
    const expiryDate = addDays(currentWeekMonday, 28);

    return expiryDate;
  };

  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      setError(null);

      // Controlla se le ore totali sono inferiori alle ore utilizzate
      if (isEditMode && parseFloat(values.total_hours) < hoursUsed) {
        setFieldError('total_hours', `Non puoi impostare meno di ${hoursUsed} ore (ore già utilizzate)`);
        setSubmitting(false);
        return;
      }

      // Calcola le ore rimanenti
      const remainingHours = calculateRemainingHours(values.total_hours);

      // Determina lo stato del pacchetto
      const status = remainingHours > 0 ? 'in_progress' : 'completed';

      // Gestione della data di pagamento
      let paymentDate = null;
      if (values.is_paid && values.payment_date) {
        paymentDate = format(values.payment_date, 'yyyy-MM-dd');
      }

      const formattedValues = {
        ...values,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        status: status,
        remaining_hours: remainingHours,
        payment_date: paymentDate,
        // Calcola la data di scadenza per pacchetti a durata fissa
        expiry_date: values.package_type === 'fixed'
          ? format(calculateExpiryDate(values.start_date), 'yyyy-MM-dd')
          : null,
      };

      let newPackageId;

      if (isEditMode) {
        await packageService.update(id, formattedValues);
      } else {
        // Per un nuovo pacchetto, prendi l'ID restituito
        const response = await packageService.create(formattedValues);
        newPackageId = response.data.id;
      }

      // Se abbiamo un flag per creare una lezione dopo la creazione del pacchetto
      if (location.state?.create_lesson_after && newPackageId && location.state?.lesson_data) {
        try {
          const lessonData = {
            ...location.state.lesson_data,
            student_id: values.student_id,
            is_package: true,
            package_id: newPackageId,
            lesson_date: format(parseISO(location.state.lesson_data.lesson_date), 'yyyy-MM-dd'),
            // Calcola il pagamento totale
            total_payment: location.state.lesson_data.duration * location.state.lesson_data.hourly_rate
          };

          // Crea la lezione (ma ora non modifica le ore rimanenti, poiché sono già state dedotte)
          await lessonService.create(lessonData);

          // Mostra un feedback positivo
          setInfoMessage("Pacchetto e lezione creati con successo!");
        } catch (lessonError) {
          console.error('Error creating associated lesson:', lessonError);
          alert('Il pacchetto è stato creato, ma c\'è stato un errore nel creare la lezione associata.');
        }
      }

      // Naviga alla lista pacchetti
      navigate('/packages');
    } catch (err) {
      console.error('Error saving package:', err);
      setError('Errore durante il salvataggio. Probabilmente lo studente ha già un pacchetto aperto.');
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
          enableReinitialize
          context={{ overflow_hours: overflowHours }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            setFieldValue,
            isSubmitting,
          }) => {
            // Calcola le ore rimanenti in tempo reale
            const remainingHours = calculateRemainingHours(values.total_hours || 0);

            return (
              // Parte di visualizzazione ristrutturata - form della pagina PackageFormPage.jsx
              <Form>
                <Grid container spacing={3}>
                  {/* Informazioni di base del pacchetto */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Informazioni di base
                    </Typography>
                  </Grid>

                  {/* Selezione dello studente */}
                  <Grid item xs={12} md={6}>
                    <StudentAutocomplete
                      value={values.student_id}
                      onChange={(studentId) => {
                        setFieldValue('student_id', studentId);
                      }}
                      error={touched.student_id && Boolean(errors.student_id)}
                      helperText={touched.student_id && errors.student_id}
                      disabled={isEditMode} // Non permettere di cambiare lo studente in modalità modifica
                      required={true}
                      students={students}
                    />
                  </Grid>

                  {/* Data inizio */}
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Data inizio"
                      value={values.start_date}
                      onChange={(date) => setFieldValue('start_date', date)}
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

                  {/* Tipo di pacchetto (radio group) */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Tipo di pacchetto</FormLabel>
                      <RadioGroup
                        row
                        name="package_type"
                        value={values.package_type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setFieldValue('package_type', newType);

                          // Se cambiamo da aperto a fisso, calcoliamo la data di scadenza
                          if (newType === 'fixed') {
                            setFieldValue('expiry_date', calculateExpiryDate(values.start_date));
                          } else {
                            // Se cambiamo da fisso ad aperto, resettiamo alcuni campi
                            if (!isEditMode) {
                              setFieldValue('total_hours', '');
                              setFieldValue('package_cost', '');
                            }
                          }
                        }}
                      >
                        <FormControlLabel value="fixed" control={<Radio />} label="Pacchetto 4 settimane" />
                        <FormControlLabel value="open" control={<Radio />} label="Pacchetto aperto" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {/* Data di scadenza (solo per pacchetti a termine fisso) */}
                  {values.package_type === 'fixed' && (
                    <Grid item xs={12} md={6}>
                      <DatePicker
                        label="Data di scadenza (calcolata automaticamente)"
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

                  {/* Totale ore */}
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
                        (isEditMode ? `Ore già utilizzate: ${hoursUsed}` : '') ||
                        (!isEditMode && overflowHours > 0 ? `Minimo: ${overflowHours} ore (eccedenti dalla lezione originale)` : '')
                      }
                      inputProps={{
                        min: isEditMode ? hoursUsed : (overflowHours > 0 ? overflowHours : 0.5),
                        step: 0.5,
                      }}
                      required={values.package_type === 'fixed'}
                      disabled={values.package_type === 'open' && !values.is_paid && !isEditMode}
                    />
                  </Grid>

                  {/* Costo del pacchetto */}
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
                      required={values.package_type === 'fixed'}
                      disabled={values.package_type === 'open' && !values.is_paid && !isEditMode}
                    />
                  </Grid>

                  {/* Divisore per lo stato del pacchetto */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Stato del pacchetto
                    </Typography>
                  </Grid>

                  {/* Stato del pacchetto (campo di sola lettura) */}
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Stato"
                      value={remainingHours > 0 ? 'In corso' : 'Terminato'}
                      InputProps={{
                        readOnly: true,
                      }}
                      helperText="Lo stato è determinato automaticamente in base alle ore rimanenti"
                    />
                  </Grid>

                  {/* Ore rimanenti (campo di sola lettura) */}
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Ore rimanenti"
                      value={isNaN(remainingHours) ? '' : remainingHours.toFixed(1)}
                      InputProps={{
                        readOnly: true,
                      }}
                      helperText="Le ore rimanenti sono calcolate automaticamente"
                    />
                  </Grid>

                  {/* Switch per il pagamento */}
                  <Grid item xs={12} md={3}>
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

                  {/* Data di pagamento (solo se il pacchetto è pagato) */}
                  {values.is_paid && (
                    <Grid item xs={12} md={3}>
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
            );
          }}
        </Formik>
      </Paper>
    </Box>
  );
}

export default PackageFormPage;