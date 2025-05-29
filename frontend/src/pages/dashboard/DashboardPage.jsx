// src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CircularProgress,
  Grid,
  Typography,
  Paper,
} from '@mui/material';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isEqual,
  isWithinInterval,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns';

import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { lessonService, studentService, professorService, packageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// Importa i componenti modulari
import DashboardCalendar from '../../components/dashboard/DashboardCalendar';
import AddLessonDialog from '../../components/dashboard/AddLessonDialog';
import LessonDetailsDialog from '../../components/dashboard/LessonDetailsDialog';
import DayDetailsDialog from '../../components/dashboard/DayDetailsDialog';

import {
  addMonths,
  subMonths,
} from 'date-fns';
import ViewToggleComponent from '../../components/dashboard/ViewToggleComponent';

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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
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

  // Aggiungi questa parte all'interno del tuo componente DashboardPage, dopo le altre dichiarazioni useState

  // Stato per le date del periodo selezionato
  const [periodStartDate, setPeriodStartDate] = useState(null);
  const [periodEndDate, setPeriodEndDate] = useState(null);

  // Aggiungi questi stati dopo gli stati esistenti
  const [viewMode, setViewMode] = useState('week');
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  // Effetto per calcolare le date del periodo quando cambia il periodFilter
  // Effetto per calcolare le date del periodo quando cambia il periodFilter o viewMode
  useEffect(() => {
    let startDate, endDate;

    if (viewMode === 'week') {
      startDate = currentWeekStart;
      endDate = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    } else if (viewMode === 'month') {
      startDate = currentMonth;
      endDate = endOfMonth(currentMonth);
    } else {
      // Fallback per altri filtri esistenti
      switch (periodFilter) {
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
    }

    setPeriodStartDate(startDate);
    setPeriodEndDate(endDate);
  }, [viewMode, currentWeekStart, currentMonth, periodFilter]);

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
    is_online: false // Add this line
  });

  // Aggiorna lessonForm quando cambia selectedProfessor
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

  const handleChangeWeek = (direction) => {
    setCurrentWeekStart(prev => {
      const currentDate = prev instanceof Date && !isNaN(prev.getTime()) ? prev : new Date();

      if (direction === 'next') {
        return addWeeks(currentDate, 1);
      } else if (direction === 'prev') {
        return subWeeks(currentDate, 1);
      } else if (direction === 'reset') {
        return startOfWeek(new Date(), { weekStartsOn: 1 });
      }
      return currentDate;
    });
  };

  const handleChangeMonth = (direction) => {
    setCurrentMonth(prev => {
      const currentDate = prev instanceof Date && !isNaN(prev.getTime()) ? prev : new Date();

      if (direction === 'next') {
        return addMonths(currentDate, 1);
      } else if (direction === 'prev') {
        return subMonths(currentDate, 1);
      } else if (direction === 'reset') {
        return startOfMonth(new Date());
      }
      return currentDate;
    });
  };

  const handlePeriodChange = (direction) => {
    if (viewMode === 'week') {
      handleChangeWeek(direction);
    } else {
      handleChangeMonth(direction);
    }
  };

  const formatPeriodHeader = () => {
    if (viewMode === 'week') {
      // Assicurati che currentWeekStart sia una data valida
      if (!currentWeekStart || !(currentWeekStart instanceof Date) || isNaN(currentWeekStart.getTime())) {
        return 'Data non valida';
      }
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      return `${format(currentWeekStart, "d MMMM yyyy", { locale: it })} - ${format(weekEnd, "d MMMM yyyy", { locale: it })}`;
    } else {
      // Assicurati che currentMonth sia una data valida
      if (!currentMonth || !(currentMonth instanceof Date) || isNaN(currentMonth.getTime())) {
        return 'Data non valida';
      }
      return format(currentMonth, "MMMM yyyy", { locale: it });
    }
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
  // Funzione per ottenere le lezioni nel periodo selezionato
  const getLessonsForPeriod = () => {
    if (!periodStartDate || !periodEndDate || !Array.isArray(lessons)) {
      return [];
    }

    return lessons.filter(lesson => {
      if (!lesson || !lesson.lesson_date) return false;

      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isWithinInterval(lessonDate, {
          start: periodStartDate,
          end: periodEndDate
        });
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
        MyDashboard
      </Typography>

      {/* Week/Month selector header */}
      <Card sx={{ mb: 1, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            gap: { xs: 2, sm: 2, md: 0 }
          }}
        >
          {/* Prima riga: Toggle View */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            width: { xs: '100%', md: 'auto' },
            justifyContent: { xs: 'center', md: 'flex-start' }
          }}>
            <ViewToggleComponent viewMode={viewMode} setViewMode={setViewMode} />
          </Box>

          {/* Seconda riga: Periodo selezionato */}
          <Box sx={{
            width: { xs: '100%', md: 'auto' },
            textAlign: 'center'
          }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 'bold',
                color: 'primary.contrastText',
                fontSize: '1.2rem'
              }}
            >
              {formatPeriodHeader()}
            </Typography>
          </Box>

          {/* Terza riga: Navigazione */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            width: { xs: '100%', md: 'auto' },
            justifyContent: { xs: 'center', md: 'flex-end' }
          }}>
            <ButtonGroup size="small">
              <Button
                onClick={() => handlePeriodChange('prev')}
                sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
              >
                Precedente
              </Button>
              <Button
                onClick={() => handlePeriodChange('reset')}
                sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
              >
                Corrente
              </Button>
              <Button
                onClick={() => handlePeriodChange('next')}
                sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
              >
                Successiva
              </Button>
            </ButtonGroup>
          </Box>
        </Box>
      </Card>

      {/* Riepilogo settimanale - nuovo layout a larghezza piena */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Statistiche a sinistra */}
          <Grid item xs={12} sm={9}>
            <Grid container spacing={2}>
              {/* Guadagno totale */}
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Guadagno totale
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  €{periodEarnings.toFixed(2)}
                </Typography>
              </Grid>

              {/* Ore svolte */}
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Ore svolte
                </Typography>
                <Typography variant="h5">
                  {periodLessons.reduce((total, lesson) => total + parseFloat(lesson.duration || 0), 0).toFixed(1)}
                </Typography>
              </Grid>

              {/* Ore lezioni singole */}
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Ore lezioni singole
                </Typography>
                <Typography variant="h5">
                  {periodLessons.filter(lesson => !lesson.is_package)
                    .reduce((total, lesson) => total + parseFloat(lesson.duration || 0), 0).toFixed(1)}
                </Typography>
              </Grid>

              {/* Lezioni singole pagate */}
              {/* Lezioni singole pagate - reso cliccabile */}
              <Grid item xs={12} md={3}>
                <Box
                  onClick={() => {
                    // Format dates for URL parameters
                    const periodFilter = 'custom';
                    const startDateParam = format(periodStartDate, 'yyyy-MM-dd');
                    const endDateParam = format(periodEndDate, 'yyyy-MM-dd');

                    // Navigate to lessons page with proper filter parameters
                    navigate(`/lessons?type=single&time=${periodFilter}&startDate=${startDateParam}&endDate=${endDateParam}&isRange=true&order=asc&orderBy=is_paid&mine=true`);
                  }}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 1,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.04)',
                      transform: 'translateY(-2px)',
                      boxShadow: 1
                    }
                  }}
                >
                  <Typography variant="body2" color="primary.main">
                    Lezioni singole saldate
                  </Typography>
                  <Typography variant="h5" color="text.primary">
                    {(() => {
                      const singleLessons = periodLessons.filter(lesson => !lesson.is_package);
                      const paidSingleLessons = singleLessons.filter(lesson => lesson.is_paid);
                      return `${paidSingleLessons.length}/${singleLessons.length}`;
                    })()}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={3}>
            {/* Selettore professore a destra (solo per admin) */}
            {currentUser?.is_admin && (
              <FormControl fullWidth sx={{ mb: 0 }} variant="outlined">
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
          </Grid>
        </Grid>
      </Paper>

      {/* Calendario a larghezza piena */}
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <DashboardCalendar
            currentWeekStart={viewMode === 'week' ? currentWeekStart : currentMonth}
            viewMode={viewMode} // Aggiungi questa prop
            handleChangeWeek={handleChangeWeek}
            getLessonsForDay={getLessonsForDay}
            studentsMap={studentsMap}
            handleLessonClick={handleLessonClick}
            handleDayClick={handleDayClick}
            handleAddLessonClick={handleAddLessonClick}
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
        selectedProfessor={selectedProfessor}
        updateLessons={() => fetchData(selectedProfessor)}
        lessons={lessons}
      />
    </Box>
  );
}

export default DashboardPage;