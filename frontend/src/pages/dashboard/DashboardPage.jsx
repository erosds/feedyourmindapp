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
import { lessonService, studentService, professorService } from '../../services/api';
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
    if (currentUser && selectedProfessor) {
      fetchData(selectedProfessor);
      if (currentUser.is_admin) {
        fetchProfessors();
      }
    }
  }, [currentUser?.id, selectedProfessor]);

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
      setError('Impossibile caricare i dati. Riprova più tardi.');
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

  const handleChangeWeek = (newWeekStart) => {
    // Assicuriamoci che newWeekStart sia un oggetto Date valido
    if (newWeekStart instanceof Date && !isNaN(newWeekStart)) {
      setCurrentWeekStart(newWeekStart);
    } else {
      console.error('Invalid date provided to handleChangeWeek:', newWeekStart);
    }
  };

  const getLessonsForDay = (day) => {
    if (!day || !Array.isArray(lessons)) return [];

    return lessons.filter(lesson => {
      if (!lesson || !lesson.lesson_date) return false;
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isEqual(lessonDate, day);
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

  const handleViewLessonDetails = (lesson) => {
    navigate(`/lessons/${lesson.id}`);
  };

  const handleCloseAddLessonDialog = () => {
    setAddLessonDialogOpen(false);
  };

  const handleStudentChange = (event) => {
    setSelectedStudent(event.target.value);
  };

  const handlePackageChange = (event) => {
    setSelectedPackage(event.target.value);
  };

  const calculatePackageHours = (packageId) => {
    const selectedPackage = studentPackages.find(pkg => pkg && pkg.id === packageId);
    return selectedPackage ? selectedPackage.hours : 0;
  };

  // Calcola le lezioni del periodo corrente in modo sicuro
  const getFilteredLessons = () => {
    if (!Array.isArray(lessons)) return [];

    return lessons.filter(lesson => {
      if (!lesson || !lesson.lesson_date) return false;

      try {
        const lessonDate = parseISO(lesson.lesson_date);

        switch (periodFilter) {
          case 'month':
            return isWithinInterval(lessonDate, {
              start: startOfMonth(currentWeekStart),
              end: endOfMonth(currentWeekStart),
            });
          case 'year':
            return isWithinInterval(lessonDate, {
              start: startOfYear(currentWeekStart),
              end: endOfYear(currentWeekStart),
            });
          default: // week
            return isWithinInterval(lessonDate, {
              start: currentWeekStart,
              end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
            });
        }
      } catch (err) {
        console.error('Error filtering lessons by date:', err);
        return false;
      }
    });
  };

  const currentWeekLessons = getFilteredLessons();

  const calculateEarnings = (filteredLessons) => {
    if (!Array.isArray(filteredLessons)) return 0;

    return filteredLessons.reduce((total, lesson) => {
      if (!lesson || typeof lesson.hourly_rate !== 'number' || typeof lesson.duration !== 'number') {
        return total;
      }
      return total + lesson.hourly_rate * lesson.duration;
    }, 0);
  };

  const currentWeekEarnings = calculateEarnings(currentWeekLessons);

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
                {[...professors]
                  .sort((a, b) => {
                    // Ordinamento alfabetico per cognome
                    const firstNameA = a.first_name.toLowerCase();
                    const firstNameB = b.first_name.toLowerCase();

                    // Se i cognomi sono uguali, ordina per nome
                    if (firstNameA === firstNameB) {
                      return a.first_name.toLowerCase().localeCompare(b.last_name.toLowerCase());
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
            periodLessons={currentWeekLessons} // Utilizziamo lo stesso array filtrato
            periodEarnings={currentWeekEarnings} // Utilizziamo lo stesso calcolo
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
        updateLessons={() => fetchData(selectedProfessor)}
      />
    </Box>
  );
}

export default DashboardPage;