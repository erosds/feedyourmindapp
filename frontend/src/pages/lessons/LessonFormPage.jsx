// src/pages/lessons/LessonFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
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

// Sostituisci lo schema di validazione in LessonFormPage.jsx
// con questo schema corretto:

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
});

// Assicurati anche di modificare il componente Formik aggiungendo:
// validateOnChange={false}
// validateOnBlur={false}

function LessonFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const isEditMode = !!id;
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [professors, setProfessors] = useState([]);
  const [students, setStudents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [initialValues, setInitialValues] = useState({
    professor_id: currentUser ? currentUser.id : '',
    student_id: '',
    lesson_date: new Date(),
    duration: 1,
    is_package: false,
    package_id: null,
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
        
        // Se in modalità modifica, carica i dati della lezione
        if (isEditMode) {
          const lessonResponse = await lessonService.getById(id);
          const lesson = lessonResponse.data;
          
          // Carica i pacchetti relativi allo studente se necessario
          if (lesson.is_package) {
            const packagesResponse = await packageService.getByStudent(lesson.student_id);
            setPackages(packagesResponse.data);
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
  }, [id, isEditMode, currentUser, isAdmin]);

  // Quando cambia lo studente, carica i suoi pacchetti
  const handleStudentChange = async (studentId, setFieldValue) => {
    if (!studentId) return;
    
    try {
      setFieldValue('student_id', studentId);
      setFieldValue('package_id', null);
      
      const packagesResponse = await packageService.getByStudent(studentId);
      const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
      setPackages(activePackages);
    } catch (err) {
      console.error('Error fetching student packages:', err);
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
      
      if (isEditMode) {
        await lessonService.update(id, formattedValues);
      } else {
        await lessonService.create(formattedValues);
      }
      
      navigate('/lessons');
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
                        onChange={handleChange}
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
                              {`Pacchetto ${pkg.id} - ${pkg.remaining_hours} ore rimanenti`}
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
                    value={`€ ${(values.duration * values.hourly_rate).toFixed(2)}`}
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
    </Box>
  );
}

export default LessonFormPage;