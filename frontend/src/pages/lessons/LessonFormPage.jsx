// src/pages/lessons/LessonFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { professorService, studentService, packageService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { format, parseISO } from 'date-fns';

const LessonSchema = Yup.object().shape({
  professor_id: Yup.number().required('Professore obbligatorio'),
  student_id: Yup.number().required('Studente obbligatorio'),
  lesson_date: Yup.date().required('Data obbligatoria'),
  duration: Yup.number()
    .positive('La durata deve essere positiva')
    .required('Durata obbligatoria'),
  is_package: Yup.boolean(),
  package_id: Yup.number().nullable().when('is_package', {
    is: true,
    then: () => Yup.number().required('Pacchetto obbligatorio quando si seleziona un pacchetto'),
    otherwise: () => Yup.number().nullable(),
  }),
  hourly_rate: Yup.number()
    .positive('La tariffa oraria deve essere positiva')
    .required('Tariffa oraria obbligatoria'),
  is_paid: Yup.boolean(), // Validazione per il campo is_paid
});

function LessonFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [professors, setProfessors] = useState([]);
  const [students, setStudents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [dynamicRemainingHours, setDynamicRemainingHours] = useState(0);

  // Dialog di overflow
  const [overflowDialogOpen, setOverflowDialogOpen] = useState(false);
  const [overflowLessonData, setOverflowLessonData] = useState(null);
  const [overflowAction, setOverflowAction] = useState('use_package');
  const [overflowDetails, setOverflowDetails] = useState({
    totalHours: 0,
    remainingHours: 0,
    overflowHours: 0
  });

  // Valori iniziali predefiniti
  const [initialValues, setInitialValues] = useState({
    professor_id: currentUser ? currentUser.id : '',
    student_id: location.state?.student_id || '',
    lesson_date: new Date(),
    duration: 1,
    is_package: location.state?.is_package || false,
    package_id: location.state?.package_id || null,
    hourly_rate: '',
    is_paid: true, // Stato pagamento inizializzato a true
  });

  // Carica i dati necessari
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Carica tutti i professori (solo admin può vedere tutti i professori)
        if (isAdmin()) {
          const professorsResponse = await professorService.getAll();
          setProfessors(professorsResponse.data);
        } else {
          // Professore normale vede solo se stesso
          setProfessors([currentUser]);
        }

        // Carica tutti gli studenti
        const studentsResponse = await studentService.getAll();
        setStudents(studentsResponse.data);

        // Se è stato passato uno studente_id, carica i suoi pacchetti
        if (location.state?.student_id) {
          const packagesResponse = await packageService.getByStudent(location.state.student_id);
          const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
          setPackages(activePackages);

          // Se è stato passato anche un package_id, seleziona quel pacchetto
          if (location.state?.package_id) {
            const selectedPkg = activePackages.find(pkg => pkg.id === location.state.package_id);
            setSelectedPackage(selectedPkg);
          }
        }

        // Se in modalità modifica, carica i dati della lezione
        if (isEditMode) {
          const lessonResponse = await lessonService.getById(id);
          const lesson = lessonResponse.data;

          // Carica i pacchetti relativi allo studente se necessario
          if (lesson.is_package) {
            const packagesResponse = await packageService.getByStudent(lesson.student_id);
            // Per la modifica, dobbiamo ottenere anche il pacchetto attuale della lezione anche se è completato
            const allPackages = packagesResponse.data;
            const activePackages = allPackages.filter(pkg => pkg.status === 'in_progress');

            // Se il pacchetto della lezione è completato ma non è tra i pacchetti attivi, 
            // aggiungerlo manualmente alla lista
            if (lesson.package_id) {
              const packageResponse = await packageService.getById(lesson.package_id);
              const currentPackage = packageResponse.data;

              // Verifica se il pacchetto è già nella lista dei pacchetti attivi
              const packageExists = activePackages.some(pkg => pkg.id === currentPackage.id);

              if (!packageExists) {
                // Aggiungi il pacchetto corrente alla lista dei pacchetti disponibili
                activePackages.push(currentPackage);
              }

              setPackages(activePackages);
              setSelectedPackage(currentPackage);
            } else {
              setPackages(activePackages);
            }
          }

          setInitialValues({
            professor_id: lesson.professor_id,
            student_id: lesson.student_id,
            lesson_date: parseISO(lesson.lesson_date),
            duration: lesson.duration,
            is_package: lesson.is_package,
            package_id: lesson.package_id,
            hourly_rate: lesson.hourly_rate,
            is_paid: lesson.is_paid !== undefined ? lesson.is_paid : true
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
  }, [id, isEditMode, currentUser, isAdmin, location.state]);

  // Gestione del caso di lezione creata da un overflow
  useEffect(() => {
    if (location.state?.overflow_from_lesson) {
      // Se stiamo creando una lezione da un overflow
      const { 
        student_id, 
        professor_id,
        overflow_hours, 
        lesson_date,
        original_hourly_rate
      } = location.state;
      
      // Pre-compila automaticamente il form
      setInitialValues({
        ...initialValues,
        student_id: student_id,
        professor_id: professor_id,
        lesson_date: parseISO(lesson_date),
        duration: overflow_hours,
        is_package: false, // Lezione singola
        package_id: null,
        hourly_rate: original_hourly_rate || '',
        is_paid: false, // Pagamento da verificare separatamente
      });
      
      // Mostra un messaggio informativo
      setInfoMessage(`Stai creando una lezione singola per ${overflow_hours} ore eccedenti da un'altra lezione. Puoi modificare la tariffa oraria o altri dettagli se necessario.`);
    }
  }, [location.state]);

  // Aggiorna il calcolo delle ore rimanenti disponibili quando cambia il pacchetto selezionato
  useEffect(() => {
    if (selectedPackage) {
      let calculatedRemaining = parseFloat(selectedPackage.remaining_hours);

      // In modalità modifica, aggiungi la durata originale della lezione
      if (isEditMode && initialValues.duration) {
        calculatedRemaining += parseFloat(initialValues.duration);
      }

      setDynamicRemainingHours(calculatedRemaining);
    }
  }, [selectedPackage, isEditMode, initialValues.duration]);

  // Quando cambia lo studente, carica i suoi pacchetti
  const handleStudentChange = async (studentId, setFieldValue) => {
    if (!studentId) return;

    try {
      setFieldValue('student_id', studentId);
      setFieldValue('package_id', null);
      setSelectedPackage(null);

      const packagesResponse = await packageService.getByStudent(studentId);
      const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
      setPackages(activePackages);
    } catch (err) {
      console.error('Error fetching student packages:', err);
    }
  };

  // Quando cambia il pacchetto, salva i dettagli
  const handlePackageChange = async (packageId, setFieldValue) => {
    if (!packageId) {
      setSelectedPackage(null);
      return;
    }

    try {
      setFieldValue('package_id', packageId);
      const packageResponse = await packageService.getById(packageId);
      setSelectedPackage(packageResponse.data);
    } catch (err) {
      console.error('Error fetching package details:', err);
    }
  };

  const handleDurationChange = (e, setFieldValue) => {
    const newDuration = e.target.value;
    setFieldValue('duration', newDuration);

    // Qui puoi aggiungere logica aggiuntiva se necessario
  };

  const handleCloseOverflowDialog = () => {
    setOverflowDialogOpen(false);
  };

  const handleActionChange = (event) => {
    setOverflowAction(event.target.value);
  };

  const handleOverflowProceed = () => {
    setOverflowDialogOpen(false);
    
    if (overflowAction === 'use_package') {
      // Naviga al form di creazione lezione con dati pre-compilati per le ore eccedenti
      navigate('/lessons/new', { 
        state: { 
          student_id: overflowLessonData.student_id,
          overflow_from_lesson: true,
          overflow_hours: overflowDetails.overflowHours,
          lesson_date: overflowLessonData.lesson_date,
          professor_id: overflowLessonData.professor_id,
          original_hourly_rate: overflowLessonData.hourly_rate,
        } 
      });
    } else if (overflowAction === 'create_new_package') {
      // Naviga al form di creazione pacchetto con dati pre-compilati
      // e aggiunge un flag per creare automaticamente una lezione per questo pacchetto
      navigate('/packages/new', { 
        state: { 
          student_id: overflowLessonData.student_id,
          overflow_from_lesson: true,
          overflow_hours: overflowDetails.overflowHours,
          suggested_hours: Math.ceil(overflowDetails.overflowHours * 2), // Suggerisce il doppio delle ore di overflow
          create_lesson_after: true, // Flag per creare una lezione dopo il pacchetto
          lesson_data: {
            professor_id: overflowLessonData.professor_id,
            lesson_date: overflowLessonData.lesson_date,
            duration: overflowDetails.overflowHours,
            hourly_rate: overflowLessonData.hourly_rate
          }
        } 
      });
    }
    
    // Salva la lezione originale utilizzando solo le ore disponibili nel pacchetto
    savePartialLesson();
  };

  const savePartialLesson = async () => {
    try {
      setLoading(true);
      
      // Crea una copia dei dati della lezione con la durata limitata alle ore disponibili nel pacchetto
      const partialLessonData = {
        ...overflowLessonData,
        duration: overflowDetails.remainingHours,
        // Ricalcola il pagamento totale
        total_payment: overflowDetails.remainingHours * parseFloat(overflowLessonData.hourly_rate)
      };
      
      if (isEditMode) {
        await lessonService.update(id, partialLessonData);
      } else {
        await lessonService.create(partialLessonData);
      }
      
      // Non naviga, perché saremo già in navigazione verso un altro form
    } catch (err) {
      console.error('Error saving partial lesson:', err);
      // Mostra un messaggio all'utente (toast o notifica)
      alert('Si è verificato un errore nel salvare la lezione principale. Si prega di verificare e riprovare.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setError(null);

      // Formatta la data per l'API
      const formattedValues = {
        ...values,
        lesson_date: format(values.lesson_date, 'yyyy-MM-dd'),
      };

      // Se non è un pacchetto, rimuovi l'ID del pacchetto
      if (!formattedValues.is_package) {
        formattedValues.package_id = null;
      }

      // Se utilizza un pacchetto, verifica se la durata supera le ore rimanenti
      if (formattedValues.is_package && selectedPackage) {
        const duration = parseFloat(formattedValues.duration);
        let remainingHours = parseFloat(selectedPackage.remaining_hours);

        // Se stiamo modificando una lezione esistente, dobbiamo aggiungere
        // le ore originali della lezione al calcolo delle ore rimanenti
        if (isEditMode) {
          const originalLessonDuration = parseFloat(initialValues.duration);
          remainingHours += originalLessonDuration;
        }

        if (duration > remainingHours) {
          // Se supera, mostra il dialog di overflow
          const overflowHours = duration - remainingHours;

          setOverflowLessonData(formattedValues);
          setOverflowDetails({
            totalHours: duration,
            remainingHours: remainingHours,
            overflowHours: overflowHours
          });
          setOverflowDialogOpen(true);
          setSubmitting(false);
          return;
        }
      }

      if (isEditMode) {
        await lessonService.update(id, formattedValues);
        navigate('/lessons');
      } else {
        await lessonService.create(formattedValues);
        navigate('/lessons');
      }
    } catch (err) {
      console.error('Error saving lesson:', err);
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
        {isEditMode ? 'Modifica Lezione' : 'Nuova Lezione'}
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
          validationSchema={LessonSchema}
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
                  <FormControl fullWidth error={touched.professor_id && Boolean(errors.professor_id)}>
                    <InputLabel id="professor-label">Professore</InputLabel>
                    <Select
                      labelId="professor-label"
                      name="professor_id"
                      value={values.professor_id}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      label="Professore"
                      disabled={!isAdmin() || isEditMode}
                    >
                      {professors.map((professor) => (
                        <MenuItem key={professor.id} value={professor.id}>
                          {professor.first_name} {professor.last_name}
                        </MenuItem>
                      ))}
                    </Select>
                    {touched.professor_id && errors.professor_id && (
                      <FormHelperText>{errors.professor_id}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth error={touched.student_id && Boolean(errors.student_id)}>
                    <InputLabel id="student-label">Studente</InputLabel>
                    <Select
                      labelId="student-label"
                      name="student_id"
                      value={values.student_id}
                      onChange={(e) => handleStudentChange(e.target.value, setFieldValue)}
                      onBlur={handleBlur}
                      label="Studente"
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
                    label="Data lezione"
                    value={values.lesson_date}
                    onChange={(date) => setFieldValue('lesson_date', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: touched.lesson_date && Boolean(errors.lesson_date),
                        helperText: touched.lesson_date && errors.lesson_date,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="duration"
                    label="Durata (ore)"
                    type="number"
                    value={values.duration}
                    onChange={(e) => handleDurationChange(e, setFieldValue)}
                    onBlur={handleBlur}
                    error={touched.duration && Boolean(errors.duration)}
                    helperText={touched.duration && errors.duration}
                    inputProps={{
                      min: 0.5,
                      step: 0.5,
                    }}
                    required
                  />
                  {selectedPackage && values.is_package && (
                    <FormHelperText>
                      Ore disponibili per questa lezione: {dynamicRemainingHours.toFixed(1)}
                      {parseFloat(values.duration) > dynamicRemainingHours && (
                        <span style={{ color: 'red' }}>
                          {' '}(Attenzione: la durata supera le ore disponibili)
                        </span>
                      )}
                    </FormHelperText>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="is_package"
                        checked={values.is_package}
                        onChange={(e) => {
                          setFieldValue('is_package', e.target.checked);
                          if (!e.target.checked) {
                            setFieldValue('package_id', null);
                            setSelectedPackage(null);
                          }
                        }}
                      />
                    }
                    label="Parte di un pacchetto"
                  />
                </Grid>

                {values.is_package && (
                  <Grid item xs={12} md={6}>
                    <FormControl
                      fullWidth
                      error={touched.package_id && Boolean(errors.package_id)}
                    >
                      <InputLabel id="package-label">Pacchetto</InputLabel>
                      <Select
                        labelId="package-label"
                        name="package_id"
                        value={values.package_id || ''}
                        onChange={(e) => handlePackageChange(e.target.value, setFieldValue)}
                        onBlur={handleBlur}
                        label="Pacchetto"
                      >
                        {packages.length === 0 ? (
                          <MenuItem disabled>
                            Nessun pacchetto attivo per questo studente
                          </MenuItem>
                        ) : (
                          packages.map((pkg) => (
                            <MenuItem key={pkg.id} value={pkg.id}>
                              {`Pacchetto #${pkg.id} - ${pkg.remaining_hours} ore rimanenti`}
                              {pkg.status === 'completed' && ' (Completato)'}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {touched.package_id && errors.package_id && (
                        <FormHelperText>{errors.package_id}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    name="hourly_rate"
                    label="Tariffa oraria"
                    type="number"
                    value={values.hourly_rate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.hourly_rate && Boolean(errors.hourly_rate)}
                    helperText={touched.hourly_rate && errors.hourly_rate}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    }}
                    required
                  />
                </Grid>

                {/* Campo per indicare se la lezione è stata pagata (solo per lezioni singole) */}
                {!values.is_package && (
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="is_paid"
                          checked={values.is_paid}
                          onChange={handleChange}
                        />
                      }
                      label="Lezione pagata"
                    />
                  </Grid>
                )}

                {/* Totale calcolato automaticamente */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Totale lezione"
                    value={`€ ${(values.duration * values.hourly_rate).toFixed(2) || '0.00'}`}
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/lessons')}
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

      {/* Dialog per gestire l'overflow delle ore */}
      <Dialog
        open={overflowDialogOpen}
        onClose={handleCloseOverflowDialog}
        aria-labelledby="overflow-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="overflow-dialog-title">
          Durata della lezione supera le ore disponibili
        </DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            La durata della lezione ({overflowDetails.totalHours} ore)
            supera le ore disponibili nel pacchetto ({overflowDetails.remainingHours} ore).
            Come vuoi gestire le {overflowDetails.overflowHours} ore in eccesso?
          </DialogContentText>

          <Box sx={{ mt: 3 }}>
            <RadioGroup
              aria-label="overflow-action"
              name="overflow-action"
              value={overflowAction}
              onChange={handleActionChange}
            >
              <FormControlLabel
                value="use_package"
                control={<Radio />}
                label="Crea una lezione singola per le ore eccedenti"
              />
              <FormControlLabel
                value="create_new_package"
                control={<Radio />}
                label="Crea un nuovo pacchetto per le ore eccedenti"
              />
            </RadioGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOverflowDialog} color="primary">
            Annulla
          </Button>
          <Button onClick={handleOverflowProceed} color="primary" variant="contained">
            {loading ? <CircularProgress size={24} /> : 'Procedi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LessonFormPage;