import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
import { lessonService, studentService, professorService, packageService } from '../../services/api';
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
  const [professors, setProfessors] = useState([]);
  const [selectedProfessor, setSelectedProfessor] = useState(currentUser?.id || '');
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
  // Stato per il form di aggiunta lezione
  const [lessonForm, setLessonForm] = useState({
    professor_id: selectedProfessor || (currentUser ? currentUser.id : ''), // Usa selectedProfessor se disponibile
    student_id: '',
    lesson_date: new Date(),
    start_time: new Date(new Date().setHours(14, 0, 0, 0)), // Default alle 14:00
    duration: 1,
    is_package: false,
    package_id: null,
    hourly_rate: '12.5',
    is_paid: false,
    payment_date: new Date(), // Default oggi
  });

  // Aggiorna lessonForm quando cambia selectedProfessor
  // Add this useEffect in DashboardPage.jsx
  useEffect(() => {
    if (currentUser && selectedProfessor) {
      fetchData(selectedProfessor);
      if (currentUser.is_admin) {
        fetchProfessors();
      }
    }
  }, [currentUser?.id, selectedProfessor]);

  useEffect(() => {
    if (lessonForm.lesson_date && lessonForm.is_paid) {
      setLessonForm(prev => ({
        ...prev,
        payment_date: prev.lesson_date // Aggiorniamo payment_date per corrispondere a lesson_date
      }));
    }
  }, [lessonForm.lesson_date]);

  const fetchData = async (professorId) => {
    if (!professorId) return;

    try {
      setLoading(true);

      // Recupera le lezioni del professore selezionato
      const response = await lessonService.getByProfessor(professorId);
      setLessons(response.data || []);

      // Recupera i dati degli studenti
      const studentsResponse = await studentService.getAll();
      const studentsData = studentsResponse.data || [];
      setStudents(studentsData);

      const studentsMapData = {};
      studentsData.forEach(student => {
        if (student && student.id) {
          studentsMapData[student.id] = `${student.first_name} ${student.last_name}`;
        }
      });
      setStudentsMap(studentsMapData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Impossibile caricare i dati. Prova a riaggiornare la pagina.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfessors = async () => {
    try {
      const response = await professorService.getAll();
      setProfessors(response.data || []);
    } catch (err) {
      console.error('Error fetching professors:', err);
    }
  };

  const handleProfessorChange = (event) => {
    setSelectedProfessor(event.target.value);
  };

  // Funzione per cambiare la settimana
  const handleChangeWeek = (newWeekStart) => {
    // Riceviamo direttamente la nuova data di inizio settimana dal calendario
    setCurrentWeekStart(newWeekStart);
  };

  // Funzione per ottenere le lezioni di un giorno specifico
  const getLessonsForDay = (day) => {
    if (!day || !Array.isArray(lessons)) return [];

    return lessons.filter(lesson => {
      if (!lesson || !lesson.lesson_date) return false;
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isEqual(
          new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
          new Date(day.getFullYear(), day.getMonth(), day.getDate())
        );
      } catch (err) {
        console.error('Error parsing lesson date:', err);
        return false;
      }
    });
  };

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setLessonDialogOpen(true);
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setDayDetailDialogOpen(true);
  };

  const handleAddLessonClick = (day) => {
    setSelectedDay(day);
    setLessonForm(prevForm => ({
      ...prevForm,
      lesson_date: day || new Date(),
    }));
    setAddLessonDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setLessonDialogOpen(false);
  };

  const handleViewLessonDetails = () => {
    if (selectedLesson) {
      setLessonDialogOpen(false);
      navigate(`/lessons/${selectedLesson.id}`);
    }
  };

  const handleCloseAddLessonDialog = () => {
    setAddLessonDialogOpen(false);
  };

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
      const lessonsResponse = await lessonService.getByPackage(parsedPackageId);
      const packageLessonsData = lessonsResponse.data || [];

      // Salva le lezioni nel dizionario packageLessons
      setPackageLessons(prev => ({
        ...prev,
        [parsedPackageId]: packageLessonsData
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

  // Funzione per ottenere le lezioni nel periodo selezionato
  const getLessonsForPeriod = () => {
    if (!Array.isArray(lessons)) return [];

    let startDate, endDate;

    switch (periodFilter) {
      case 'week':
        startDate = currentWeekStart;
        endDate = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
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
        startDate = currentWeekStart;
        endDate = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    }

    return lessons.filter(lesson => {
      if (!lesson || !lesson.lesson_date) return false;

      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isWithinInterval(lessonDate, { start: startDate, end: endDate });
      } catch (err) {
        console.error('Error filtering lessons by date:', err);
        return false;
      }
    });
  };

  // Calcola le lezioni della settimana corrente
  const currentWeekLessons = lessons.filter(lesson => {
    if (!lesson || !lesson.lesson_date) return false;

    try {
      const lessonDate = parseISO(lesson.lesson_date);
      return isWithinInterval(lessonDate, {
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
      });
    } catch (err) {
      console.error('Error filtering current week lessons:', err);
      return false;
    }
  });

  // Calcola i guadagni
  const calculateEarnings = (lessonsArray) => {
    if (!Array.isArray(lessonsArray)) return 0;

    return lessonsArray.reduce((total, lesson) => {
      if (!lesson) return total;

      // Assicuriamoci che total_payment sia un numero
      const payment = parseFloat(lesson.total_payment);
      if (isNaN(payment)) return total;

      return total + payment;
    }, 0);
  };

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
      <Typography variant="h4" gutterBottom mb={3}>
        Dashboard Personale
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
          {currentUser?.is_admin && (
            <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
              <InputLabel id="select-professor-label">Seleziona Professore</InputLabel>
              <Select
                labelId="select-professor-label"
                id="select-professor"
                value={selectedProfessor}
                onChange={handleProfessorChange}
                label="Seleziona Professore"
              >
                {professors
                  .sort((a, b) => {
                    // Ordinamento alfabetico per nome
                    const firstNameA = a.first_name.toLowerCase();
                    const firstNameB = b.first_name.toLowerCase();

                    // Se i nomi sono uguali, ordina per cognome
                    if (firstNameA === firstNameB) {
                      return a.last_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
                    }

                    return firstNameA.localeCompare(firstNameB);
                  })
                  .map(professor => (
                    <MenuItem key={professor.id} value={professor.id}>
                      {professor.first_name} {professor.last_name}
                    </MenuItem>
                  ))
                }
              </Select>
            </FormControl>
          )}
          <DashboardSummary
            currentWeekLessons={currentWeekLessons}
            currentWeekEarnings={currentWeekEarnings}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            periodLessons={periodLessons} // Utilizziamo le lezioni filtrate per periodo
            periodEarnings={periodEarnings} // Utilizziamo i guadagni calcolati per periodo
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
        onAddLesson={() => {
          setDayDetailDialogOpen(false);
          handleAddLessonClick(selectedDay);
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
        selectedProfessor={selectedProfessor} // Aggiungi questa riga
        updateLessons={() => fetchData(selectedProfessor)}
        lessons={lessons}
      />
    </Box>
  );
}

export default DashboardPage;