// src/pages/dashboard/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  parseISO,
  isEqual,
  isWithinInterval,
  addMinutes,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { lessonService, professorService, packageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Import the modular components
import ProfessorWeeklyTable from '../../components/dashboard/ProfessorWeeklyTable';
import AdminDashboardCalendar from '../../components/dashboard/AdminDashboardCalendar';
import AdminDashboardSummary from '../../components/dashboard/AdminDashboardSummary';
import DayProfessorsDialog from '../../components/dashboard/DayProfessorsDialog';

function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Basic state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [packages, setPackages] = useState([]);
  const [professors, setProfessors] = useState([]);

  // Week and period selection state
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [periodFilter, setPeriodFilter] = useState('week');
  const [currentTab, setCurrentTab] = useState(0);
  const [periodStartDate, setPeriodStartDate] = useState(null);
  const [periodEndDate, setPeriodEndDate] = useState(null);

  // Dialog state
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [professorSchedules, setProfessorSchedules] = useState([]);

  // Check admin access
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Load all data
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [lessonsResponse, packagesResponse, professorsResponse] = await Promise.all([
          lessonService.getAll(),
          packageService.getAll(),
          professorService.getAll()
        ]);

        setLessons(lessonsResponse.data || []);
        setPackages(packagesResponse.data || []);
        setProfessors(professorsResponse.data || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Impossibile caricare i dati. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Update period dates when filter or week changes
  useEffect(() => {
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
      case 'lastMonth':
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'year':
        startDate = startOfYear(new Date());
        endDate = endOfYear(new Date());
        break;
      default:
        startDate = currentWeekStart;
        endDate = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    }

    setPeriodStartDate(startDate);
    setPeriodEndDate(endDate);
  }, [periodFilter, currentWeekStart]);

  // Function to fetch professors (used for updates)
  const fetchProfessors = async () => {
    try {
      const response = await professorService.getAll();
      setProfessors(response.data || []);
    } catch (err) {
      console.error('Error updating professors:', err);
    }
  };

  // Week navigation handlers
  const handleChangeWeek = (direction) => {
    if (direction === 'next') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    } else if (direction === 'prev') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    } else if (direction === 'reset') {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  };

  // Navigation handlers
  const navigateToManageProfessors = () => {
    navigate('/professors');
  };

  const handleProfessorClick = (professorId) => {
    navigate(`/professors/${professorId}`);
  };

  // Calendar utility functions
  const getProfessorsForDay = (day) => {
    // Get lessons for that day
    const dayLessons = lessons.filter(lesson => {
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isEqual(
          new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
          new Date(day.getFullYear(), day.getMonth(), day.getDate())
        );
      } catch (err) {
        return false;
      }
    });

    // Get unique professor IDs for the day
    const professorIds = [...new Set(dayLessons.map(lesson => lesson.professor_id))];

    // Return professors with lessons on that day
    return professors.filter(professor => professorIds.includes(professor.id));
  };

  // Handle calendar day click
  const handleDayClick = (day) => {
    setSelectedDay(day);

    // Get professors with lessons on this day
    const professorsList = getProfessorsForDay(day);

    // Get lessons for this day
    const dayLessons = lessons.filter(lesson => {
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isEqual(
          new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
          new Date(day.getFullYear(), day.getMonth(), day.getDate())
        );
      } catch (err) {
        return false;
      }
    });

    // Calculate schedule details for each professor
    const schedules = professorsList.map(professor => {
      // Get lessons for this professor
      const professorLessons = dayLessons.filter(
        lesson => lesson.professor_id === professor.id
      );

      // Sort lessons by start time
      const sortedLessons = [...professorLessons].sort((a, b) => {
        const timeA = a.start_time || "00:00:00";
        const timeB = b.start_time || "00:00:00";
        return timeA.localeCompare(timeB);
      });

      // Calculate time range
      const firstLesson = sortedLessons[0];
      const lastLesson = sortedLessons[sortedLessons.length - 1];

      const startTime = firstLesson?.start_time
        ? firstLesson.start_time.substring(0, 5)
        : "00:00";

      let endTime = "00:00";
      if (lastLesson && lastLesson.start_time) {
        // Parse the time components
        const [hours, minutes] = lastLesson.start_time.split(':').map(Number);
        const durationHours = parseFloat(lastLesson.duration);
        const durationMinutes = Math.round(durationHours * 60);

        // Create date objects for calculation
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0);
        const endDate = addMinutes(startDate, durationMinutes);

        // Format the end time
        endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      }

      // Calculate total hours
      const totalHours = professorLessons.reduce(
        (sum, lesson) => sum + parseFloat(lesson.duration), 0
      );

      return {
        ...professor,
        lessons: professorLessons,
        startTime,
        endTime,
        totalHours
      };
    });

    setProfessorSchedules(schedules);
    setDayDialogOpen(true);
  };

  // Get lessons for the selected period
  const getLessonsForPeriod = () => {
    if (!periodStartDate || !periodEndDate || !Array.isArray(lessons)) {
      return [];
    }

    return lessons.filter(lesson => {
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isWithinInterval(lessonDate, {
          start: periodStartDate,
          end: periodEndDate
        });
      } catch (err) {
        return false;
      }
    });
  };

  // Weekly lessons for professors table
  const getCurrentWeekLessons = () => {
    return lessons.filter(lesson => {
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isWithinInterval(lessonDate, {
          start: currentWeekStart,
          end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
        });
      } catch (err) {
        return false;
      }
    });
  };

  // Computed values
  const currentWeekLessons = getCurrentWeekLessons();
  const periodLessons = getLessonsForPeriod();

  // Calculate weekly data for professors
  const professorWeeklyData = professors.map(professor => {
    // Get lessons for this professor in current week
    const professorLessons = currentWeekLessons.filter(
      lesson => lesson.professor_id === professor.id
    );

    // Skip if no lessons
    if (professorLessons.length === 0) {
      return null;
    }

    // Calculate total payment
    const totalPayment = professorLessons.reduce(
      (sum, lesson) => sum + parseFloat(lesson.total_payment || 0),
      0
    );

    // Find the last lesson date
    let lastLessonDate = null;
    if (professorLessons.length > 0) {
      lastLessonDate = professorLessons.reduce((lastDate, lesson) => {
        const lessonDate = parseISO(lesson.lesson_date);
        return lastDate ? (lessonDate > lastDate ? lessonDate : lastDate) : lessonDate;
      }, null);
    }

    return {
      ...professor,
      weeklyLessons: professorLessons,
      totalPayment,
      lastLessonDate,
    };
  }).filter(Boolean); // Remove null entries (professors with no lessons)

  // Total payments for all professors this week
  const totalProfessorPayments = professorWeeklyData.reduce(
    (sum, prof) => sum + prof.totalPayment,
    0
  );

  // Loading and error states
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
        Dashboard Amministrazione
      </Typography>

      {/* Week selector header */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 'bold',
              color: 'primary.contrastText',
              fontSize: '1.2rem',
              mb: { xs: 2, sm: 0 }
            }}
          >
            {format(currentWeekStart, "d MMMM yyyy", { locale: it })} -
            {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), " d MMMM yyyy", { locale: it })}
          </Typography>

          <ButtonGroup size="small" sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}>
            <Button
              onClick={() => handleChangeWeek('prev')}
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Precedente
            </Button>
            <Button
              onClick={() => handleChangeWeek('reset')}
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Corrente
            </Button>
            <Button
              onClick={() => handleChangeWeek('next')}
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Successiva
            </Button>
          </ButtonGroup>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        {/* Calendar showing professors for each day */}
        <Grid item xs={12}>
          <AdminDashboardCalendar
            currentWeekStart={currentWeekStart}
            getProfessorsForDay={getProfessorsForDay}
            handleProfessorClick={handleProfessorClick}
            handleDayClick={handleDayClick}
          />
        </Grid>

        {/* Weekly professors summary table */}
        <Grid item xs={12} md={6}>
          <ProfessorWeeklyTable
            currentWeekStart={currentWeekStart}
            endOfWeek={endOfWeek}
            navigateToManageProfessors={navigateToManageProfessors}
            professorWeeklyData={professorWeeklyData}
            totalProfessorPayments={totalProfessorPayments}
            handleProfessorClick={handleProfessorClick}
          />
        </Grid>

        {/* Financial summary and stats */}
        <Grid item xs={12} md={6}>
          <AdminDashboardSummary
            currentWeekStart={currentWeekStart}
            professorWeeklyData={professorWeeklyData}
            professors={professors}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            periodLessons={periodLessons}
            periodStartDate={periodStartDate}
            periodEndDate={periodEndDate}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            allPackages={packages}
            allLessons={lessons}
            onNotesUpdate={fetchProfessors}
          />
        </Grid>
      </Grid>

      {/* Dialog for showing professors on a specific day */}
      <DayProfessorsDialog
        open={dayDialogOpen}
        onClose={() => setDayDialogOpen(false)}
        selectedDay={selectedDay}
        professorSchedules={professorSchedules}
        handleProfessorClick={handleProfessorClick}
      />
    </Box>
  );
}

export default AdminDashboardPage;