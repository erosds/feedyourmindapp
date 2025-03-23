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

// Schema di validazione (modificato per rimuovere status)
const PackageSchema = Yup.object().shape({
  student_id: Yup.number().required('Studente obbligatorio'),
  start_date: Yup.date()
    .required('Data inizio obbligatoria'),
  total_hours: Yup.number()
    .positive('Il numero di ore deve essere positivo')
    .required('Numero di ore obbligatorio')
    .test('min-overflow-hours', 'Le ore totali devono essere almeno pari alle ore eccedenti della lezione',
      function (value) {
        // Accedi al contesto per verificare se il pacchetto proviene da un overflow
        const { from } = this.options;
        // Se c'è un overflow_hours nel contesto e le ore totali sono inferiori, fallisce
        if (from && from.context && from.context.overflow_hours && value < from.context.overflow_hours) {
          return false;
        }
        return true;
      }),
  package_cost: Yup.number()
    .min(0, 'Il costo non può essere negativo')
    .required('Costo pacchetto obbligatorio'),
  is_paid: Yup.boolean(),
  remaining_hours: Yup.number()
    .min(0, 'Le ore rimanenti non possono essere negative')
    .required('Ore rimanenti obbligatorie'),
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
  const [calculatedRemainingHours, setCalculatedRemainingHours] = useState(0);
  const [packageStatus, setPackageStatus] = useState('in_progress');
  const [initialValues, setInitialValues] = useState({
    student_id: '',
    start_date: new Date(),
    total_hours: '',
    package_cost: '',
    is_paid: false,
    remaining_hours: '',
  });
  const [overflowHours, setOverflowHours] = useState(0);


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

          // Calcola ore rimanenti (totale - utilizzate)
          const remainingHours = parseFloat(packageData.total_hours) - usedHours;
          setCalculatedRemainingHours(remainingHours);

          // Imposta lo stato del pacchetto in base alle ore rimanenti
          setPackageStatus(remainingHours > 0 ? 'in_progress' : 'completed');

          setInitialValues({
            student_id: packageData.student_id,
            start_date: parseISO(packageData.start_date),
            total_hours: packageData.total_hours,
            package_cost: packageData.package_cost,
            is_paid: packageData.is_paid,
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

  // Gestione delle ore di overflow da lezione
  useEffect(() => {
    if (location.state?.overflow_from_lesson) {
      const { student_id, overflow_hours, suggested_hours } = location.state;

      // Salva le ore eccedenti per uso futuro
      setOverflowHours(overflow_hours);

      // Calcola le ore totali suggerite (doppio delle ore di overflow o almeno 5)
      const totalHours = suggested_hours || Math.max(5, Math.ceil(overflow_hours * 2));

      // Calcola le ore rimanenti sottraendo già le ore eccedenti
      const remainingHours = totalHours - overflow_hours;

      // Pre-compila automaticamente il form
      setInitialValues({
        ...initialValues,
        student_id: student_id,
        total_hours: totalHours,
        package_cost: '', // L'utente dovrà impostare il costo
        is_paid: false,
        remaining_hours: remainingHours, // Ore rimanenti già ridotte
      });

      // Mostra un messaggio informativo aggiornato
      setInfoMessage(`Stai creando un nuovo pacchetto per gestire ${overflow_hours} ore eccedenti da una lezione. Il pacchetto avrà già dedotte queste ore eccedenti dal totale.`);
    }
  }, [location.state]);


  // Funzione per gestire il cambiamento delle ore totali
  const handleTotalHoursChange = (e, setFieldValue, setFieldError) => {
    const newTotalHours = parseFloat(e.target.value);

    // Aggiorna il valore nel form
    setFieldValue('total_hours', e.target.value);

    if (isEditMode) {
      // Validazione in modalità modifica (codice esistente)
      // ...
    } else {
      // In modalità creazione, il comportamento dipende dalla presenza di ore di overflow
      const isFromOverflow = location.state?.overflow_from_lesson;

      if (isFromOverflow && overflowHours > 0) {
        // Verifica esplicita che le ore totali siano almeno pari alle ore eccedenti
        if (newTotalHours < overflowHours) {
          setFieldError('total_hours', `Il pacchetto deve avere almeno ${overflowHours} ore per coprire le ore eccedenti`);
          return; // Esci dalla funzione per evitare calcoli errati
        }

        // Per pacchetti creati da overflow, sottrai le ore eccedenti dalle ore totali
        const newRemainingHours = Math.max(0, newTotalHours - overflowHours);
        setFieldValue('remaining_hours', newRemainingHours);
      } else {
        // Pacchetto standard: le ore rimanenti sono uguali alle ore totali
        setFieldValue('remaining_hours', e.target.value);
      }

      // Un nuovo pacchetto è sempre in corso
      setPackageStatus('in_progress');
    }
  };


  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      setError(null);

      // Controlla se le ore totali sono inferiori alle ore utilizzate
      if (isEditMode && parseFloat(values.total_hours) < hoursUsed) {
        setFieldError('total_hours', `Non puoi impostare meno di ${hoursUsed} ore (ore già utilizzate)`);
        setSubmitting(false);
        return; // Interrompi il salvataggio
      }

      // Formatta la data per l'API
      const formattedValues = {
        ...values,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        // Aggiungi lo stato determinato automaticamente
        status: packageStatus
      };

      // Se nuovo pacchetto normale (non da overflow), imposta ore rimanenti uguali a ore totali
      if (!isEditMode && !location.state?.overflow_from_lesson) {
        formattedValues.remaining_hours = formattedValues.total_hours;
      }
      // Se nuovo pacchetto da overflow, utilizziamo le ore rimanenti già calcolate

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

          // Mostra un feedback positivo o aggiorna lo stato del pacchetto se necessario
          setInfoMessage("Pacchetto e lezione creati con successo!");
        } catch (lessonError) {
          console.error('Error creating associated lesson:', lessonError);
          // Mostriamo un errore ma non blocchiamo la navigazione, il pacchetto è già stato creato
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
          // Passa le ore di overflow al contesto di validazione
          context={{ overflow_hours: overflowHours }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            setFieldValue,
            setFieldError,
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
                    // Rimuovere questa riga: maxDate={new Date()}
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
                    onChange={(e) => handleTotalHoursChange(e, setFieldValue, setFieldError)}
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
                    value={packageStatus === 'in_progress' ? 'In corso' : 'Terminato'}
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
                    name="remaining_hours"
                    label="Ore rimanenti"
                    value={isEditMode ? calculatedRemainingHours : values.remaining_hours}
                    InputProps={{
                      readOnly: true,
                      inputProps: {
                        style: {
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none',
                          margin: 0
                        }
                      }
                    }}
                    sx={{
                      '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                        '-webkit-appearance': 'none',
                        margin: 0,
                      },
                      '& input[type=number]': {
                        '-moz-appearance': 'textfield',
                      },
                    }}
                    helperText="Le ore rimanenti sono calcolate automaticamente come differenza tra ore totali e ore utilizzate"
                  />
                </Grid>

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