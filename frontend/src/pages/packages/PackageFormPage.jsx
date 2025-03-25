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
import { studentService, packageService, lessonService } from '../../services/api';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';
import StudentAutocomplete from '../../components/common/StudentAutocomplete';


// Schema di validazione
const PackageSchema = Yup.object().shape({
  student_id: Yup.number().required('Studente obbligatorio'),
  start_date: Yup.date()
    .required('Data inizio obbligatoria'),
  total_hours: Yup.number()
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
  package_cost: Yup.number()
    .min(0, 'Il costo non può essere negativo')
    .required('Costo pacchetto obbligatorio'),
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

      // Formatta la data per l'API
      const formattedValues = {
        ...values,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        status: status,
        remaining_hours: remainingHours,
        payment_date: paymentDate
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
              <Form>
                <Grid container spacing={3}>
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

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      name="total_hours"
                      label="Totale ore"
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

                  {/* Mostra lo stato come campo di sola lettura */}
                  <Grid item xs={12} md={6}>
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

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Ore rimanenti"
                      value={isNaN(remainingHours) ? '' : remainingHours.toFixed(1)}
                      InputProps={{
                        readOnly: true,
                      }}
                      helperText="Le ore rimanenti sono calcolate automaticamente come differenza tra ore totali e ore utilizzate"
                    />
                  </Grid>

                  {values.is_paid && (
                    <Grid item xs={12} md={6}>
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