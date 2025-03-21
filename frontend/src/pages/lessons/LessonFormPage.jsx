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
  lesson_date: Yup.date()
    .required('Data obbligatoria')
    .max(new Date(), 'La data della lezione non può essere nel futuro'),
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
});

function LessonFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [professors, setProfessors] = useState([]);
  const [students, setStudents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);

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
            const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
            setPackages(activePackages);

            // Seleziona il pacchetto corrente
            if (lesson.package_id) {
              const packageResponse = await packageService.getById(lesson.package_id);
              setSelectedPackage(packageResponse.data);
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

  const handleCloseOverflowDialog = () => {
    setOverflowDialogOpen(false);
  };

  const handleActionChange = (event) => {
    setOverflowAction(event.target.value);
  };

  const handleOverflowConfirm = async () => {
    try {
      setLoading(true);

      // Prepara i dati per la richiesta
      const requestData = {
        action: overflowAction,
        package_id: overflowLessonData.package_id,
        lesson_data: overflowLessonData,
        lesson_hours_in_package: overflowDetails.remainingHours,
        overflow_hours: overflowDetails.overflowHours
      };

      // Effettua la richiesta al backend
      await lessonService.handleOverflow(requestData);

      // Chiudi il dialog e naviga alla lista lezioni
      setOverflowDialogOpen(false);
      navigate('/lessons');
    } catch (err) {
      console.error('Error handling overflow:', err);
      setError('Errore durante la gestione dell\'overflow: ' + (err.response?.data?.detail || err.message));
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
        const remainingHours = parseFloat(selectedPackage.remaining_hours);

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
                    maxDate={new Date()} // Aggiunge questa riga
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
                    onChange={handleChange}
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
                      Ore rimanenti nel pacchetto: {selectedPackage.remaining_hours}
                      {parseFloat(values.duration) > parseFloat(selectedPackage.remaining_hours) && (
                        <Typography component="span" color="error">
                          {' '}(Attenzione: la durata supera le ore disponibili)
                        </Typography>
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
      >
        <DialogTitle id="overflow-dialog-title">
          Durata della lezione supera le ore disponibili
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            La durata della lezione ({overflowDetails.totalHours} ore)
            supera le ore disponibili nel pacchetto ({overflowDetails.remainingHours} ore).
            Come vuoi gestire le {overflowDetails.overflowHours} ore in eccesso?
          </DialogContentText>
          <Box sx={{ mt: 2 }}>
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
          <Button onClick={handleOverflowConfirm} color="primary" variant="contained">
            {loading ? <CircularProgress size={24} /> : 'Conferma'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LessonFormPage;