// src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Grid,
  Typography,
} from '@mui/material';
import {
  startOfWeek,
  endOfWeek,
  isEqual,
  isWithinInterval,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { lessonService, studentService, packageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Importa i componenti modulari
import DashboardCalendar from '../../components/dashboard/DashboardCalendar';
import DashboardSummary from '../../components/dashboard/DashboardSummary';
import AddLessonDialog from '../../components/dashboard/AddLessonDialog';
import LessonDetailsDialog from '../../components/dashboard/LessonDetailsDialog';
import DayDetailsDialog from '../../components/dashboard/DayDetailsDialog';

function DashboardPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentPackages, setStudentPackages] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentTab, setCurrentTab] = useState(0);
  const [periodFilter, setPeriodFilter] = useState('week');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [addLessonDialogOpen, setAddLessonDialogOpen] = useState(false);
  const [dayDetailDialogOpen, setDayDetailDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [studentsMap, setStudentsMap] = useState({});
  const [formError, setFormError] = useState('');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageLessons, setPackageLessons] = useState({});
  
  // Stato per il form di aggiunta lezione
  const [lessonForm, setLessonForm] = useState({
    professor_id: currentUser ? currentUser.id : '',
    student_id: '',
    lesson_date: new Date(),
    start_time: new Date(new Date().setHours(9, 0, 0, 0)), // Default alle 9:00
    duration: 1,
    is_package: false,
    package_id: null,
    hourly_rate: '',
    is_paid: true,
    payment_date: new Date(), // Default oggi
  });

  // Caricamento iniziale dei dati
  useEffect(() => {
    fetchData();
  }, [currentUser?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Recupera le lezioni del professore corrente
      const response = await lessonService.getByProfessor(currentUser.id);
      setLessons(response.data);

      // Recupera i dati degli studenti
      const studentsResponse = await studentService.getAll();
      setStudents(studentsResponse.data);

      const studentsMapData = {};
      studentsResponse.data.forEach(student => {
        studentsMapData[student.id] = `${student.first_name} ${student.last_name}`;
      });
      setStudentsMap(studentsMapData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Impossibile caricare i dati. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per ottenere le lezioni di un giorno specifico
  const getLessonsForDay = (day) => {
    return lessons.filter(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      return isEqual(
        new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
        new Date(day.getFullYear(), day.getMonth(), day.getDate())
      );
    });
  };

  // Funzione per ottenere le lezioni nel periodo selezionato
  const getLessonsForPeriod = () => {
    let startDate, endDate;

    switch (periodFilter) {
      case 'week':
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case 'year':
        startDate = startOfYear(new Date());
        endDate = endOfYear(new Date());
        break;
      default:
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
    }

    return lessons.filter(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      return isWithinInterval(lessonDate, { start: startDate, end: endDate });
    });
  };

  // Calcola il totale guadagnato per un periodo
  const calculateEarnings = (lessonsArray) => {
    return lessonsArray.reduce((total, lesson) => total + parseFloat(lesson.total_payment), 0);
  };

  // Funzione per cambiare settimana
  const handleChangeWeek = (direction) => {
    if (direction === 'next') {
      setCurrentWeekStart(date => new Date(date.setDate(date.getDate() + 7)));
    } else if (direction === 'prev') {
      setCurrentWeekStart(date => new Date(date.setDate(date.getDate() - 7)));
    } else if (direction === 'reset') {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  };

  // Funzione per gestire il click su una lezione
  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setLessonDialogOpen(true);
  };

  // Funzione per gestire il click su un giorno per visualizzare le lezioni
  const handleDayClick = (day) => {
    setSelectedDay(day);
    const dayLessons = getLessonsForDay(day);

    if (dayLessons.length > 0) {
      // Se ci sono lezioni, mostriamo un riepilogo
      setDayDetailDialogOpen(true);
    }
  };

  // Funzione per gestire il click sul pulsante + per aggiungere una lezione
  const handleAddLessonClick = (day, e) => {
    if (e) e.stopPropagation(); // Impedisce la propagazione al click del giorno
    setSelectedDay(day);
    setLessonForm({
      ...lessonForm,
      professor_id: currentUser.id,
      lesson_date: day,
      student_id: '',
      is_package: false,
      package_id: null,
      hourly_rate: '',
      is_paid: true,
    });
    setSelectedPackage(null);
    setStudentPackages([]);
    setAddLessonDialogOpen(true);
    setFormError('');
  };

  // Funzione per chiudere il dialog di dettaglio lezione
  const handleCloseDialog = () => {
    setLessonDialogOpen(false);
  };

  // Funzione per chiudere il dialog di aggiunta lezione
  const handleCloseAddLessonDialog = () => {
    setAddLessonDialogOpen(false);
    setSelectedStudent('');
    setStudentPackages([]);
    setSelectedPackage(null);
    setFormError('');
  };

  // Funzione per navigare alla pagina di dettaglio della lezione
  const handleViewLessonDetails = () => {
    setLessonDialogOpen(false);
    navigate(`/lessons/${selectedLesson.id}`);
  };

  // Funzione per gestire il cambio dello studente nel form
  const handleStudentChange = async (studentId) => {
    setSelectedStudent(studentId);
    setLessonForm({
      ...lessonForm,
      student_id: studentId,
      package_id: null,
    });
    setSelectedPackage(null);

    if (studentId) {
      try {
        // Carica i pacchetti attivi dello studente
        const packagesResponse = await packageService.getByStudent(studentId);
        const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
        setStudentPackages(activePackages);
      } catch (err) {
        console.error('Error fetching student packages:', err);
      }
    } else {
      setStudentPackages([]);
    }
  };

  // Funzione per gestire il cambio del pacchetto nel form
  const handlePackageChange = async (packageId) => {
    const parsedPackageId = parseInt(packageId);
    
    setLessonForm({
      ...lessonForm,
      package_id: parsedPackageId,
    });

    if (!parsedPackageId) {
      setSelectedPackage(null);
      return;
    }

    try {
      // Trova il pacchetto selezionato
      const pkg = studentPackages.find(p => p.id === parsedPackageId);
      setSelectedPackage(pkg);

      // Carica le lezioni associate a questo pacchetto
      const lessonsResponse = await lessonService.getAll();
      const filteredLessons = lessonsResponse.data.filter(lesson => 
        lesson.package_id === parsedPackageId && 
        lesson.is_package
      );
      
      // Salva le lezioni nel dizionario packageLessons
      setPackageLessons(prev => ({
        ...prev,
        [parsedPackageId]: filteredLessons
      }));
    } catch (err) {
      console.error('Error fetching package lessons:', err);
    }
  };

  // Calcola le ore disponibili per un pacchetto
  const calculatePackageHours = (packageId, totalHours) => {
    if (!packageId || !totalHours) return { usedHours: 0, availableHours: 0 };
    
    // Ottiene le lezioni associate al pacchetto
    const packageLessonsList = packageLessons[packageId] || [];
    
    // Calcola le ore utilizzate
    const usedHours = packageLessonsList.reduce((total, lesson) => {
      return total + parseFloat(lesson.duration);
    }, 0);
    
    // Calcola le ore disponibili
    const availableHours = parseFloat(totalHours) - usedHours;
    
    return { usedHours, availableHours };
  };

  // Calcola le lezioni della settimana corrente
  const currentWeekLessons = lessons.filter(lesson => {
    const lessonDate = parseISO(lesson.lesson_date);
    return isWithinInterval(lessonDate, {
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    });
  });

  // Calcola i guadagni della settimana corrente
  const currentWeekEarnings = calculateEarnings(currentWeekLessons);

  // Calcola i guadagni nel periodo selezionato
  const periodLessons = getLessonsForPeriod();
  const periodEarnings = calculateEarnings(periodLessons);
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Le mie lezioni
      </Typography>

      <Grid container spacing={3}>
        {/* Calendario Settimanale */}
        <Grid item xs={12} md={9}>
          <DashboardCalendar
            currentWeekStart={currentWeekStart}
            handleChangeWeek={handleChangeWeek}
            getLessonsForDay={getLessonsForDay}
            studentsMap={studentsMap}
            handleLessonClick={handleLessonClick}
            handleDayClick={handleDayClick}
            handleAddLessonClick={handleAddLessonClick}
          />
        </Grid>

        {/* Pannello laterale con riepilogo guadagni */}
        <Grid item xs={12} md={3}>
          <DashboardSummary
            currentWeekLessons={currentWeekLessons}
            currentWeekEarnings={currentWeekEarnings}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            periodLessons={periodLessons}
            periodEarnings={periodEarnings}
            calculateEarnings={calculateEarnings}
            navigate={navigate}
          />
        </Grid>
      </Grid>

      {/* Dialog con dettagli lezione */}
      <LessonDetailsDialog
        open={lessonDialogOpen}
        onClose={handleCloseDialog}
        onViewDetails={handleViewLessonDetails}
        selectedLesson={selectedLesson}
        studentsMap={studentsMap}
      />

      {/* Dialog con riepilogo delle lezioni del giorno */}
      <DayDetailsDialog
        open={dayDetailDialogOpen}
        onClose={() => setDayDetailDialogOpen(false)}
        onAddLesson={(e) => {
          setDayDetailDialogOpen(false);
          handleAddLessonClick(selectedDay, e);
        }}
        selectedDay={selectedDay}
        dayLessons={selectedDay ? getLessonsForDay(selectedDay) : []}
        studentsMap={studentsMap}
      />

      {/* Dialog per aggiungere una lezione */}
      <AddLessonDialog
        open={addLessonDialogOpen}
        onClose={handleCloseAddLessonDialog}
        selectedDay={selectedDay}
        lessonForm={lessonForm}
        setLessonForm={setLessonForm}
        students={students}
        studentPackages={studentPackages}
        selectedPackage={selectedPackage}
        formError={formError}
        formSubmitting={false}
        handleStudentChange={handleStudentChange}
        handlePackageChange={handlePackageChange}
        calculatePackageHours={calculatePackageHours}
        currentUser={currentUser}
        updateLessons={fetchData}
      />
    </Box>
  );
}

export default DashboardPage;