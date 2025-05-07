// src/pages/lessons/LessonFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Alert,
  Button,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { professorService, studentService, packageService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LessonForm from './components/LessonForm';
import PackageOverflowDialog from './components/PackageOverflowDialog';
import { checkPackageOverflow } from './utils/packageUtils';
import { checkLessonOverlap } from '../../utils/lessonOverlapUtils';
import LessonOverlapDialog from '../../components/lessons/LessonOverlapDialog';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

function LessonFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const isEditMode = !!id;

  // Determine if we're in a package detail context
  const isPackageDetailContext = location.state?.fromPackageDetail === true;
  const fixedPackageId = isPackageDetailContext ? parseInt(location.state?.package_id) : null;
  const [packageStudents, setPackageStudents] = useState([]); // Store students from the package

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');

  // Main data
  const [professors, setProfessors] = useState([]);
  const [students, setStudents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [lessonsInPackage, setLessonsInPackage] = useState([]);
  const [originalLesson, setOriginalLesson] = useState(null);
  const [expiredPackages, setExpiredPackages] = useState([]);
  // Nella sezione degli stati in LessonFormPage.jsx
  const [recentlyEndedPackages, setRecentlyEndedPackages] = useState([]);

  // Overflow dialog
  const [overflowDialogOpen, setOverflowDialogOpen] = useState(false);
  const [overflowLessonData, setOverflowLessonData] = useState(null);
  const [overflowDetails, setOverflowDetails] = useState({
    totalHours: 0,
    remainingHours: 0,
    overflowHours: 0
  });

  // Overlap dialog
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);
  const [overlapLesson, setOverlapLesson] = useState(null);

  // Selected student's lessons
  const [studentLessons, setStudentLessons] = useState([]);

  // Default initial values
  const [initialValues, setInitialValues] = useState({
    professor_id: currentUser ? currentUser.id : '',
    student_id: location.state?.student_id || '',
    lesson_date: new Date(),
    start_time: new Date(new Date().setHours(9, 0, 0, 0)), // Default to 9:00
    duration: 1,
    is_package: isPackageDetailContext ? true : (location.state?.is_package || false),
    package_id: isPackageDetailContext ? fixedPackageId : (location.state?.package_id || null),
    hourly_rate: '12.5',
    is_paid: isPackageDetailContext ? true : false,
    payment_date: new Date(), // Default to today
    price: 20, // Default price
    is_online: false
  });

  // Load required data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Load professors based on permissions
        if (isAdmin()) {
          const professorsResponse = await professorService.getAll();
          setProfessors(professorsResponse.data);
        } else {
          setProfessors([currentUser]);
        }

        // Load all students
        const studentsResponse = await studentService.getAll();
        setStudents(studentsResponse.data);

        // Special handling for package detail context
        if (isPackageDetailContext && fixedPackageId) {
          // Load the specific package
          const packageResponse = await packageService.getById(fixedPackageId);
          setPackages([packageResponse.data]);

          // Extract student IDs from the package and fetch their details
          const studentIds = packageResponse.data.student_ids || [];
          if (studentIds.length > 0) {
            // Find the students from all students that match the IDs in the package
            const packageStudentsList = studentsResponse.data.filter(student =>
              studentIds.includes(student.id)
            );
            setPackageStudents(packageStudentsList);

            // If student_id is not set in location.state, use the first student from package
            if (!location.state?.student_id && packageStudentsList.length > 0) {
              setInitialValues(prev => ({
                ...prev,
                student_id: packageStudentsList[0].id
              }));
            }
          }

          // Load lessons for the package
          await loadPackageLessons(fixedPackageId);
        } else if (location.state?.student_id) {
          // Load packages for the selected student (non-package-detail flow)
          await loadStudentPackages(location.state.student_id);

          // Load lessons for the selected package
          if (location.state?.package_id) {
            await loadPackageLessons(location.state.package_id);
          }
        }

        // If in edit mode, load lesson data
        if (isEditMode) {
          await loadLessonData();
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Unable to load data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode, currentUser, isAdmin, location.state, isPackageDetailContext, fixedPackageId]);

  // Handle case of lesson created from overflow
  useEffect(() => {
    if (location.state?.overflow_from_lesson) {
      handleOverflowLessonInit();
    }
  }, [location.state]);

  // Load existing lesson data (in edit mode)
  const loadLessonData = async () => {
    const lessonResponse = await lessonService.getById(id);
    const lesson = lessonResponse.data;

    // Save original lesson
    setOriginalLesson(lesson);

    // Load packages for the student
    await loadStudentPackages(lesson.student_id);

    // Load lessons for the package if the lesson is part of a package
    if (lesson.is_package && lesson.package_id) {
      await loadPackageLessons(lesson.package_id, lesson.id);
    }

    // Load student lessons to check for overlaps
    await loadStudentLessons(lesson.student_id);

    // Set initial form values
    const lessonDate = new Date(lesson.lesson_date);
    let startTime = null;

    if (lesson.start_time) {
      // If start_time exists in "HH:MM:SS" format, convert it to Date object
      const [hours, minutes] = lesson.start_time.split(':').map(Number);
      startTime = new Date();
      startTime.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 9:00 if it doesn't exist
      startTime = new Date();
      startTime.setHours(9, 0, 0, 0);
    }

    // Handle payment date
    let paymentDate = null;
    if (lesson.is_paid && lesson.payment_date) {
      paymentDate = new Date(lesson.payment_date);
    } else if (lesson.is_paid) {
      paymentDate = new Date(); // Default to today if paid but no date
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
      payment_date: paymentDate,
      price: !lesson.is_package ? (lesson.price || lesson.duration * 20) : 0,
      is_online: lesson.is_online !== undefined ? lesson.is_online : false
    });
  };

  // Load student packages
  const loadStudentPackages = async (studentId) => {
    const packagesResponse = await packageService.getByStudent(studentId);
    const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
    setPackages(activePackages);
    return activePackages;
  };

  // Load lessons for a package
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

  // Initialize the form for overflow lesson
  const handleOverflowLessonInit = () => {
    const {
      student_id,
      professor_id,
      overflow_hours,
      lesson_date,
      start_time,
      original_hourly_rate
    } = location.state;

    // Create a date for the start time
    let startTimeDate = new Date();
    if (start_time) {
      // If there's a time in "HH:MM:SS" format
      const [hours, minutes] = start_time.split(':').map(Number);
      startTimeDate.setHours(hours, minutes, 0, 0);
    } else {
      // Default to 9:00
      startTimeDate.setHours(9, 0, 0, 0);
    }

    // Calcola il prezzo predefinito in base alle ore eccedenti
    const defaultPrice = 20 * overflow_hours;

    // Pre-fill the form
    setInitialValues({
      ...initialValues,
      student_id: student_id,
      professor_id: professor_id,
      lesson_date: new Date(lesson_date),
      start_time: startTimeDate,
      duration: overflow_hours,
      is_package: false,
      package_id: null,
      hourly_rate: original_hourly_rate || '12.5',
      is_paid: false,
      payment_date: null,
      price: defaultPrice,
    });

    setInfoMessage(`Stai creando una lezione singola per ${overflow_hours} ore in eccesso da un'altra lezione. Puoi modificare la tariffa oraria o altri dettagli se necessario.`);
  };

  // Modifica la funzione handleStudentChange in LessonFormPage.jsx
  const handleStudentChange = async (studentId, setFieldValue) => {
    if (!studentId) return;

    try {
      setFieldValue('student_id', studentId);

      // Important: Preserve is_package and package_id in package detail context
      if (isPackageDetailContext) {
        // Ensure we keep is_package as true and package_id set properly
        setFieldValue('is_package', true);
        setFieldValue('package_id', fixedPackageId);
      } else {
        // Original behavior for non-package-detail context
        setFieldValue('package_id', null);
        setLessonsInPackage([]);

        // Load student packages
        const packagesResponse = await packageService.getByStudent(studentId);

        // Separa i pacchetti in categorie
        const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');

        // Identifica i pacchetti scaduti con ore rimanenti
        const expiredWithHoursPackages = packagesResponse.data.filter(pkg =>
          pkg.status === 'expired' && parseFloat(pkg.remaining_hours) > 0
        );

        // Trova pacchetti terminati recentemente (ultimi 14 giorni)
        const today = new Date();
        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(today.getDate() - 14);

        const recentlyEnded = packagesResponse.data.filter(pkg => {
          // Pacchetti scaduti con 0 ore o pacchetti completati
          const isEndedPackage = (pkg.status === 'expired' && parseFloat(pkg.remaining_hours) <= 0) ||
            (pkg.status === 'completed');

          // Verifica se è terminato negli ultimi 14 giorni
          const expiryDate = parseISO(pkg.expiry_date);
          const isRecent = expiryDate >= twoWeeksAgo && expiryDate <= today;

          return isEndedPackage && isRecent;
        });

        setPackages(activePackages);
        setExpiredPackages(expiredWithHoursPackages);
        setRecentlyEndedPackages(recentlyEnded);
      }

      // Load student lessons to check for overlaps
      await loadStudentLessons(studentId);
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('Errore nel caricamento dei dati dello studente');
      setRecentlyEndedPackages([]);
    }
  };

  // Load student lessons
  const loadStudentLessons = async (studentId) => {
    try {
      const response = await lessonService.getByStudent(studentId);
      setStudentLessons(response.data);
      return response.data;
    } catch (err) {
      console.error('Error loading student lessons:', err);
      setError('Unable to load student lessons. Please try refreshing the page.');
      return [];
    }
  };

  // Handle package change
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

  // Handle closing overflow dialog
  const handleCloseOverflowDialog = () => {
    setOverflowDialogOpen(false);
  };

  // Handle chosen action in overflow dialog
  const handleOverflowAction = (action) => {
    setOverflowDialogOpen(false);

    if (action === 'use_package') {
      navigateToNewLesson();
    } else if (action === 'create_new_package') {
      navigateToNewPackage();
    }

    // Save the original lesson using only available hours
    savePartialLesson();
  };

  // Navigate to create a new lesson for excess hours
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

  // Navigate to create a new package for excess hours
  const navigateToNewPackage = () => {
    navigate('/packages/new', {
      state: {
        student_id: overflowLessonData.student_id,
        overflow_from_lesson: true,
        overflow_hours: overflowDetails.overflowHours,
        suggested_hours: Math.ceil(overflowDetails.overflowHours * 2),
        create_lesson_after: true,
        allow_multiple: true,  // Add this flag
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

  // Save lesson with duration limited to available hours in the package
  const savePartialLesson = async () => {
    try {
      setLoading(true);

      // Create a copy of the lesson data with duration limited to available hours
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
      alert('Si è verificato un errore durante il salvataggio della lezione principale. Si prega di verificare e riprovare.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Check if duration exceeds available hours in the package
  const handlePackageOverflow = async (formattedValues) => {
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

  // Calculate available hours in the selected package
  const calculatePackageHours = (packageId, totalHours) => {
    if (!packageId || !totalHours) return { usedHours: 0, availableHours: 0 };

    // Calculate sum of hours already used in this package
    const usedHours = lessonsInPackage.reduce((total, lesson) =>
      total + parseFloat(lesson.duration), 0);

    // Original lesson hours (if editing an existing lesson)
    const originalLessonHours = isEditMode && originalLesson &&
      originalLesson.is_package &&
      originalLesson.package_id === packageId
      ? parseFloat(originalLesson.duration) : 0;

    // Calculate available hours
    const availableHours = parseFloat(totalHours) - usedHours;

    return {
      usedHours,
      availableHours,
      totalAvailable: availableHours + originalLessonHours
    };
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setError(null);

      // Format dates and time for API
      const formattedValues = {
        ...values,
        lesson_date: format(values.lesson_date, 'yyyy-MM-dd'),
        start_time: values.start_time ? format(values.start_time, 'HH:mm:ss') : null,
        payment_date: values.is_paid && values.payment_date ? format(values.payment_date, 'yyyy-MM-dd') : null,
        price: values.is_package ? 0 : (values.price || values.duration * 20), // Set to 0 for package, otherwise use provided price or default
        is_online: values.is_online || false  // Ensure this is included
      };

      // If in package detail context, ensure is_package is true and package_id is set
      if (isPackageDetailContext) {
        formattedValues.is_package = true;
        formattedValues.package_id = fixedPackageId;
      } else if (!formattedValues.is_package) {
        // If not a package, remove package ID
        formattedValues.package_id = null;
      }

      // Check for overlaps with utility function
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

      // Check for hour overflow if it's a package
      if (formattedValues.is_package && formattedValues.package_id) {
        const shouldShowOverflowDialog = await handlePackageOverflow(formattedValues);
        if (shouldShowOverflowDialog) return false;
      }

      // Quando salvi la lezione:
      if (isEditMode) {
        await lessonService.update(id, formattedValues);
        // Dopo l'aggiornamento, torna al dettaglio lezione invece che alla lista
        navigate(`/lessons/${id}`, {
          // Passiamo l'URL di ritorno originale (se presente) per mantenere il percorso completo
          state: location.state?.returnUrl ? { returnUrl: location.state.returnUrl } : undefined
        });
      } else {
        // Per una nuova lezione, crea e poi vai al dettaglio
        const response = await lessonService.create(formattedValues);
        // Supponendo che l'API restituisca l'ID della nuova lezione
        const newLessonId = response.data.id;
        navigate(`/lessons/${newLessonId}`);
      }

      return true;
    } catch (err) {
      console.error('Error saving lesson:', err);
      setError('Errore durante il salvataggio. Controlla i dati e riprova.');
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

      {/* Alert per pacchetti terminati recentemente */}
      {recentlyEndedPackages.length > 0 && packages.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {recentlyEndedPackages.length === 1
              ? "È stato rilevato un pacchetto terminato recentemente."
              : `Sono stati rilevati ${recentlyEndedPackages.length} pacchetti terminati recentemente.`}
            {" "}
            Se lo studente intende proseguire con un nuovo pacchetto, crealo prima gi aggiungere la lezione.
          </Typography>

          {recentlyEndedPackages.map((pkg, idx) => (
            <Box component="div" key={pkg.id} sx={{ mt: 1.5, display: 'flex', alignItems: 'center' }}>
              <Chip
                component={Link}
                to={`/packages/${pkg.id}`}
                label={`Pacchetto #${pkg.id}`}
                color="default"
                variant="outlined"
                clickable
                sx={{
                  mr: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                  }
                }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {`${pkg.status === 'completed' ? 'Completato' : 'Scaduto (senza ore residue)'} il ${format(parseISO(pkg.expiry_date), 'dd/MM/yyyy')}`}
              </Typography>
            </Box>
          ))}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex' }}>
            <Button
              component={Link}
              to={`/packages/new?student=${encodeURIComponent(students[initialValues.student_id] || '')}`}
              variant="contained"
              color="primary"
              size="small"
              sx={{ fontSize: '0.8rem' }}
            >
              Crea nuovo pacchetto
            </Button>
          </Box>
        </Alert>
      )}

      {/* Alert per pacchetti scaduti */}
      {expiredPackages.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Attenzione: lo studente ha {expiredPackages.length} pacchett{expiredPackages.length === 1 ? 'o' : 'i'} scadut{expiredPackages.length === 1 ? 'o' : 'i'} con ore residue.
            Valuta di estenderl{expiredPackages.length === 1 ? 'o' : 'i'} cliccando sul pacchetto.
          </Typography>
          {expiredPackages.map((pkg, idx) => (
            <Box component="div" key={pkg.id} sx={{ mt: 1.5, display: 'flex', alignItems: 'center' }}>
              <Chip
                component={Link}
                to={`/packages/${pkg.id}`}
                label={`Pacchetto #${pkg.id}`}
                color="primary"
                variant="outlined"
                clickable
                sx={{
                  mr: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                  }
                }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {`iniziato il ${format(parseISO(pkg.start_date), 'dd/MM/yyyy')} e scaduto il ${format(parseISO(pkg.expiry_date), 'dd/MM/yyyy')} - ${parseFloat(pkg.remaining_hours).toFixed(1)} ore rimanenti.`}
              </Typography>
            </Box>
          ))}
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
          onCancel={() => isPackageDetailContext ? navigate(`/packages/${fixedPackageId}`) : navigate('/lessons')}
          onStudentChange={handleStudentChange}
          onPackageChange={handlePackageChange}
          calculatePackageHours={calculatePackageHours}
          originalLesson={originalLesson}
          // Pass context props
          context={isPackageDetailContext ? 'packageDetail' : 'default'}
          fixedPackageId={fixedPackageId}
          packageStudents={packageStudents}
        />
      </Paper>

      {/* Dialog for handling hour overflow */}
      <PackageOverflowDialog
        open={overflowDialogOpen}
        onClose={handleCloseOverflowDialog}
        onAction={handleOverflowAction}
        details={overflowDetails}
      />

      {/* Dialog for handling lesson overlaps */}
      <LessonOverlapDialog
        open={overlapDialogOpen}
        onClose={() => setOverlapDialogOpen(false)}
        overlappingLesson={overlapLesson}
      />
    </Box>
  );
}

export default LessonFormPage;