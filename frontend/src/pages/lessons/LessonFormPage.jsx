// src/pages/lessons/LessonFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import { professorService, studentService, packageService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import StudentAutocomplete from '../../components/common/StudentAutocomplete';
import LessonForm from './components/LessonForm';
import PackageOverflowDialog from './components/PackageOverflowDialog';
import { checkPackageOverflow } from './utils/packageUtils';
import { checkLessonOverlap } from '../../utils/lessonOverlapUtils';
import LessonOverlapDialog from '../../components/lessons/LessonOverlapDialog';

function LessonFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');

  // Dati principali
  const [professors, setProfessors] = useState([]);
  const [students, setStudents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [lessonsInPackage, setLessonsInPackage] = useState([]);
  const [originalLesson, setOriginalLesson] = useState(null);

  // Dialog di overflow
  const [overflowDialogOpen, setOverflowDialogOpen] = useState(false);
  const [overflowLessonData, setOverflowLessonData] = useState(null);
  const [overflowDetails, setOverflowDetails] = useState({
    totalHours: 0,
    remainingHours: 0,
    overflowHours: 0
  });

  // Dialog di sovrapposizione
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);
  const [overlapLesson, setOverlapLesson] = useState(null);

  // Lezioni dello studente selezionato
  const [studentLessons, setStudentLessons] = useState([]);

  // Valori iniziali predefiniti
  const [initialValues, setInitialValues] = useState({
    professor_id: currentUser ? currentUser.id : '',
    student_id: location.state?.student_id || '',
    lesson_date: new Date(),
    start_time: new Date(new Date().setHours(9, 0, 0, 0)), // Default alle 9:00
    duration: 1,
    is_package: location.state?.is_package || false,
    package_id: location.state?.package_id || null,
    hourly_rate: '',
    is_paid: true,
    payment_date: new Date(), // Default oggi
  });

  // Carica i dati necessari
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Carica i professori in base ai permessi
        if (isAdmin()) {
          const professorsResponse = await professorService.getAll();
          setProfessors(professorsResponse.data);
        } else {
          setProfessors([currentUser]);
        }

        // Carica tutti gli studenti
        const studentsResponse = await studentService.getAll();
        setStudents(studentsResponse.data);

        // Carica pacchetti per lo studente selezionato
        if (location.state?.student_id) {
          await loadStudentPackages(location.state.student_id);

          // Carica lezioni per il pacchetto selezionato
          if (location.state?.package_id) {
            await loadPackageLessons(location.state.package_id);
          }
        }

        // Se in modalità modifica, carica i dati della lezione
        if (isEditMode) {
          await loadLessonData();
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
      handleOverflowLessonInit();
    }
  }, [location.state]);

  // Carica i dati della lezione esistente (in modalità modifica)
  const loadLessonData = async () => {
    const lessonResponse = await lessonService.getById(id);
    const lesson = lessonResponse.data;

    // Salva la lezione originale
    setOriginalLesson(lesson);

    // Carica pacchetti per lo studente (indipendentemente dal tipo di lezione)
    await loadStudentPackages(lesson.student_id);

    // Carica lezioni per il pacchetto selezionato se la lezione è parte di un pacchetto
    if (lesson.is_package && lesson.package_id) {
      await loadPackageLessons(lesson.package_id, lesson.id);
    }

    // Carica lezioni dello studente per verificare sovrapposizioni
    await loadStudentLessons(lesson.student_id);

    // Imposta i valori iniziali del form
    const lessonDate = new Date(lesson.lesson_date);
    let startTime = null;

    if (lesson.start_time) {
      // Se start_time esiste nel formato "HH:MM:SS", lo convertiamo in un oggetto Date
      const [hours, minutes] = lesson.start_time.split(':').map(Number);
      startTime = new Date();
      startTime.setHours(hours, minutes, 0, 0);
    } else {
      // Default alle 9:00 se non esiste
      startTime = new Date();
      startTime.setHours(9, 0, 0, 0);
    }

    // Gestisci la data di pagamento
    let paymentDate = null;
    if (lesson.is_paid && lesson.payment_date) {
      paymentDate = new Date(lesson.payment_date);
    } else if (lesson.is_paid) {
      paymentDate = new Date(); // Default oggi se è pagata ma non ha data
    }

    setInitialValues({
      professor_id: lesson.professor_id,
      student_id: lesson.student_id,
      lesson_date: lessonDate,
      start_time: startTime,
      duration: lesson.duration,
      is_package: lesson.is_package,
      package_id: lesson.package_id,
      hourly_rate: lesson.hourly_rate,
      is_paid: lesson.is_paid !== undefined ? lesson.is_paid : true,
      payment_date: paymentDate
    });
  };

  // Carica i pacchetti di uno studente
  const loadStudentPackages = async (studentId) => {
    const packagesResponse = await packageService.getByStudent(studentId);
    const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
    setPackages(activePackages);
    return activePackages;
  };

  // Carica le lezioni di un pacchetto
  const loadPackageLessons = async (packageId, excludeLessonId = null) => {
    const lessonsResponse = await lessonService.getAll();
    const packageLessons = lessonsResponse.data.filter(
      lesson => lesson.package_id === packageId &&
        lesson.is_package &&
        (!excludeLessonId || lesson.id !== parseInt(excludeLessonId))
    );
    setLessonsInPackage(packageLessons);
    return packageLessons;
  };

  // Gestione dell'inizializzazione della lezione da overflow
  const handleOverflowLessonInit = () => {
    const {
      student_id,
      professor_id,
      overflow_hours,
      lesson_date,
      start_time,
      original_hourly_rate
    } = location.state;

    // Crea una data per l'orario di inizio
    let startTimeDate = new Date();
    if (start_time) {
      // Se c'è un orario nella forma "HH:MM:SS"
      const [hours, minutes] = start_time.split(':').map(Number);
      startTimeDate.setHours(hours, minutes, 0, 0);
    } else {
      // Default alle 9:00
      startTimeDate.setHours(9, 0, 0, 0);
    }

    // Pre-compila il form
    setInitialValues({
      ...initialValues,
      student_id: student_id,
      professor_id: professor_id,
      lesson_date: new Date(lesson_date),
      start_time: startTimeDate,
      duration: overflow_hours,
      is_package: false,
      package_id: null,
      hourly_rate: original_hourly_rate || '',
      is_paid: false,
      payment_date: null,
    });

    setInfoMessage(`Stai creando una lezione singola per ${overflow_hours} ore eccedenti da un'altra lezione. Puoi modificare la tariffa oraria o altri dettagli se necessario.`);
  };

  // Gestisce il cambio dello studente
  const handleStudentChange = async (studentId, setFieldValue) => {
    if (!studentId) return;

    try {
      setFieldValue('student_id', studentId);
      setFieldValue('package_id', null);
      setLessonsInPackage([]);

      // Carica i pacchetti dello studente
      await loadStudentPackages(studentId);

      // Carica le lezioni dello studente per verificare le sovrapposizioni
      await loadStudentLessons(studentId);
    } catch (err) {
      console.error('Error fetching student data:', err);
    }
  };

  // Carica le lezioni dello studente
  const loadStudentLessons = async (studentId) => {
    try {
      const response = await lessonService.getByStudent(studentId);
      setStudentLessons(response.data);
      return response.data;
    } catch (err) {
      console.error('Error loading student lessons:', err);
      setError('Impossibile caricare le lezioni dello studente');
      return [];
    }
  };

  // Gestisce il cambio del pacchetto
  const handlePackageChange = async (packageId, setFieldValue) => {
    if (!packageId) {
      setLessonsInPackage([]);
      return;
    }

    try {
      setFieldValue('package_id', packageId);
      await loadPackageLessons(packageId, isEditMode ? id : null);
    } catch (err) {
      console.error('Error fetching package lessons:', err);
    }
  };

  // Gestisce la chiusura del dialog di overflow
  const handleCloseOverflowDialog = () => {
    setOverflowDialogOpen(false);
  };

  // Gestisce l'azione scelta nel dialog di overflow
  const handleOverflowAction = (action) => {
    setOverflowDialogOpen(false);

    if (action === 'use_package') {
      navigateToNewLesson();
    } else if (action === 'create_new_package') {
      navigateToNewPackage();
    }

    // Salva la lezione originale utilizzando solo le ore disponibili
    savePartialLesson();
  };

  // Naviga alla creazione di una nuova lezione per ore in eccesso
  const navigateToNewLesson = () => {
    navigate('/lessons/new', {
      state: {
        student_id: overflowLessonData.student_id,
        overflow_from_lesson: true,
        overflow_hours: overflowDetails.overflowHours,
        lesson_date: overflowLessonData.lesson_date,
        start_time: overflowLessonData.start_time,
        professor_id: overflowLessonData.professor_id,
        original_hourly_rate: overflowLessonData.hourly_rate,
      }
    });
  };

  // Naviga alla creazione di un nuovo pacchetto per ore in eccesso
  const navigateToNewPackage = () => {
    navigate('/packages/new', {
      state: {
        student_id: overflowLessonData.student_id,
        overflow_from_lesson: true,
        overflow_hours: overflowDetails.overflowHours,
        suggested_hours: Math.ceil(overflowDetails.overflowHours * 2),
        create_lesson_after: true,
        lesson_data: {
          professor_id: overflowLessonData.professor_id,
          lesson_date: overflowLessonData.lesson_date,
          start_time: overflowLessonData.start_time,
          duration: overflowDetails.overflowHours,
          hourly_rate: overflowLessonData.hourly_rate
        }
      }
    });
  };

  // Salva la lezione con durata limitata alle ore disponibili nel pacchetto
  const savePartialLesson = async () => {
    try {
      setLoading(true);

      // Crea una copia dei dati della lezione con la durata limitata alle ore disponibili
      const partialLessonData = {
        ...overflowLessonData,
        duration: overflowDetails.remainingHours,
        total_payment: overflowDetails.remainingHours * parseFloat(overflowLessonData.hourly_rate)
      };

      if (isEditMode) {
        await lessonService.update(id, partialLessonData);
      } else {
        await lessonService.create(partialLessonData);
      }
      return true;
    } catch (err) {
      console.error('Error saving partial lesson:', err);
      alert('Si è verificato un errore nel salvare la lezione principale. Si prega di verificare e riprovare.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Controlla se la durata supera le ore disponibili nel pacchetto
  // Nel componente LessonFormPage.jsx
  const handlePackageOverflow = async (formattedValues) => {
    // Se è un pacchetto aperto, non gestire l'overflow
    if (formattedValues.is_package && packages.find(p =>
      p.id === parseInt(formattedValues.package_id) &&
      p.package_type === 'open')
    ) {
      return false;
    }

    const { hasOverflow, details } = checkPackageOverflow({
      formValues: formattedValues,
      packages,
      packageLessons: lessonsInPackage,
      originalLesson: isEditMode ? originalLesson : null
    });

    if (hasOverflow) {
      setOverflowLessonData(formattedValues);
      setOverflowDetails(details);
      setOverflowDialogOpen(true);
      return true;
    }

    return false;
  };

  // Calcola le ore disponibili nel pacchetto selezionato
  const calculatePackageHours = (packageId, totalHours) => {
    if (!packageId || !totalHours) return { usedHours: 0, availableHours: 0 };

    // Calcola la somma delle ore di lezione già usate in questo pacchetto
    const usedHours = lessonsInPackage.reduce((total, lesson) =>
      total + parseFloat(lesson.duration), 0);

    // Ore originali della lezione (se stiamo modificando una lezione esistente)
    const originalLessonHours = isEditMode && originalLesson &&
      originalLesson.is_package &&
      originalLesson.package_id === packageId
      ? parseFloat(originalLesson.duration) : 0;

    // Calcola le ore disponibili
    const availableHours = parseFloat(totalHours) - usedHours;

    return {
      usedHours,
      availableHours,
      totalAvailable: availableHours + originalLessonHours
    };
  };

  // Salva la lezione e naviga
  const saveLesson = async (formattedValues) => {
    if (isEditMode) {
      await lessonService.update(id, formattedValues);
    } else {
      await lessonService.create(formattedValues);
    }

    // Se siamo ritornati dal pacchetto, torniamo alla pagina del pacchetto
    if (location.state?.returnToPackage && formattedValues.is_package && formattedValues.package_id) {
      navigate(`/packages/${formattedValues.package_id}`, { state: { refreshPackage: true } });
    } else {
      navigate('/lessons');
    }
  };

  // Gestisce l'invio del form
  const handleSubmit = async (values) => {
    try {
      setError(null);

      // Formatta le date e l'orario per l'API
      const formattedValues = {
        ...values,
        lesson_date: format(values.lesson_date, 'yyyy-MM-dd'),
        start_time: values.start_time ? format(values.start_time, 'HH:mm:ss') : null,
        payment_date: values.is_paid && values.payment_date ? format(values.payment_date, 'yyyy-MM-dd') : null,
      };

      // Se non è un pacchetto, rimuovi l'ID del pacchetto
      if (!formattedValues.is_package) {
        formattedValues.package_id = null;
      }

      // Verifica sovrapposizioni con la funzione utility
      const { hasOverlap, overlappingLesson } = checkLessonOverlap(
        formattedValues,
        studentLessons,
        isEditMode ? parseInt(id) : null
      );

      if (hasOverlap) {
        setOverlapLesson(overlappingLesson);
        setOverlapDialogOpen(true);
        return false;
      }

      // Controlla l'overflow delle ore se è un pacchetto
      if (formattedValues.is_package && formattedValues.package_id) {
        const shouldShowOverflowDialog = await handlePackageOverflow(formattedValues);
        if (shouldShowOverflowDialog) return false;
      }

      // Salva la lezione
      await saveLesson(formattedValues);
      return true;
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError('Errore durante il salvataggio. Verifica i dati e riprova.');
      return false;
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
        <LessonForm
          initialValues={initialValues}
          professors={professors}
          students={students}
          packages={packages}
          isEditMode={isEditMode}
          isAdmin={isAdmin()}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/lessons')}
          onStudentChange={handleStudentChange}
          onPackageChange={handlePackageChange}
          calculatePackageHours={calculatePackageHours}
          originalLesson={originalLesson}
        />
      </Paper>

      {/* Dialog per gestire l'overflow delle ore */}
      <PackageOverflowDialog
        open={overflowDialogOpen}
        onClose={handleCloseOverflowDialog}
        onAction={handleOverflowAction}
        details={overflowDetails}
      />

      {/* Dialog per gestire le sovrapposizioni delle lezioni */}
      {/* Use our common LessonOverlapDialog component */}
      <LessonOverlapDialog
        open={overlapDialogOpen}
        onClose={() => setOverlapDialogOpen(false)}
        overlappingLesson={overlapLesson}
      />
    </Box>
  );
}

export default LessonFormPage;