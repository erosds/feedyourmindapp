// src/pages/dashboard/AdminDashboardPage.jsx
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
  addWeeks,
  subWeeks,
  parseISO,
  isEqual,
  isToday,
  isWithinInterval,
  addMinutes,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  format
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { lessonService, professorService, packageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Import the modular components
import ProfessorWeeklyTable from '../../components/dashboard/ProfessorWeeklyTable';
import AdminDashboardCalendar from '../../components/dashboard/AdminDashboardCalendar';
import AdminProfessorSummary from '../../components/dashboard/AdminProfessorSummary';
import AdminDashboardSummary from '../../components/dashboard/AdminDashboardSummary';
import DayProfessorsDialog from '../../components/dashboard/DayProfessorsDialog';

function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [packages, setPackages] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [periodFilter, setPeriodFilter] = useState('week');
  const [currentTab, setCurrentTab] = useState(0);

  // State for day professors dialog
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [professorSchedules, setProfessorSchedules] = useState([]);

  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Retrieve all professors
        const professorsResponse = await professorService.getAll();
        setProfessors(professorsResponse.data);

        // Retrieve all lessons
        const lessonsResponse = await lessonService.getAll();
        setLessons(lessonsResponse.data);

        // Retrieve all packages
        const packagesResponse = await packageService.getAll();
        setPackages(packagesResponse.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Impossibile caricare i dati. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, navigate]);

  // Function to change the week
  const handleChangeWeek = (direction) => {
    if (direction === 'next') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    } else if (direction === 'prev') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    }
  };

  // Reset to current week
  const resetToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Navigate to professors management
  const navigateToManageProfessors = () => {
    navigate('/professors');
  };

  // Navigate to professor detail
  const handleProfessorClick = (professorId) => {
    navigate(`/professors/${professorId}`);
  };

  // Function to get professors with lessons on a specific day
  const getProfessorsForDay = (day) => {
    // Get lessons for that day
    const dayLessons = lessons.filter(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      return isEqual(
        new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
        new Date(day.getFullYear(), day.getMonth(), day.getDate())
      );
    });

    // Get IDs of professors who have lessons that day
    const professorIds = [...new Set(dayLessons.map(lesson => lesson.professor_id))];

    // Filter the professors array to get only those with lessons
    return professors.filter(professor => professorIds.includes(professor.id));
  };

  // Function to handle day click and show professor details dialog
  const handleDayClick = (day) => {
    setSelectedDay(day);

    // Get professors with lessons on this day
    const professorsList = getProfessorsForDay(day);

    // Get lessons for this day
    const dayLessons = lessons.filter(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      return isEqual(
        new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
        new Date(day.getFullYear(), day.getMonth(), day.getDate())
      );
    });

    // Calculate schedule details for each professor
    const schedules = professorsList.map(professor => {
      // Get this professor's lessons for the day
      const professorLessons = dayLessons.filter(
        lesson => lesson.professor_id === professor.id
      );

      // Sort lessons by start time
      const sortedLessons = [...professorLessons].sort((a, b) => {
        const timeA = a.start_time || "00:00:00";
        const timeB = b.start_time || "00:00:00";
        return timeA.localeCompare(timeB);
      });

      // Find first and last lesson
      const firstLesson = sortedLessons[0];
      const lastLesson = sortedLessons[sortedLessons.length - 1];

      // Calculate start and end times
      const startTime = firstLesson?.start_time ? firstLesson.start_time.substring(0, 5) : "00:00";

      // Calculate end time by adding duration to the start time of the last lesson
      let endTime = "00:00";
      if (lastLesson) {
        const startTimeParts = lastLesson.start_time ? lastLesson.start_time.split(':') : ['0', '0'];
        const startHour = parseInt(startTimeParts[0]);
        const startMinute = parseInt(startTimeParts[1]);
        const durationHours = parseFloat(lastLesson.duration);

        // Convert duration to minutes (e.g., 1.5 hours = 90 minutes)
        const durationMinutes = Math.round(durationHours * 60);

        // Create a date object with the start time
        const startDate = new Date();
        startDate.setHours(startHour, startMinute, 0);

        // Add duration minutes to get the end time
        const endDate = addMinutes(startDate, durationMinutes);

        // Format the end time as "HH:MM"
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

  // Function to get lessons for the period
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

  // Function to get packages created/paid in the period
  const getPackagesForPeriod = () => {
    if (!Array.isArray(packages)) return [];

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

    return packages.filter(pkg => {
      if (!pkg || !pkg.is_paid || !pkg.payment_date) return false;

      try {
        const paymentDate = parseISO(pkg.payment_date);
        return isWithinInterval(paymentDate, { start: startDate, end: endDate });
      } catch (err) {
        console.error('Error filtering packages by date:', err);
        return false;
      }
    });
  };

  // Calculate lessons for the current week
  const currentWeekLessons = lessons.filter(lesson => {
    const lessonDate = parseISO(lesson.lesson_date);
    return isWithinInterval(lessonDate, {
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    });
  });

  // Calculate professor data for the current week
  const professorWeeklyData = professors.map(professor => {
    // Filter lessons for this professor in the week
    const professorLessons = currentWeekLessons.filter(
      lesson => lesson.professor_id === professor.id
    );

    // Calculate total payment for this professor
    const totalPayment = professorLessons.reduce(
      (sum, lesson) => sum + parseFloat(lesson.total_payment),
      0
    );

    // Find the last lesson date of the week for this professor
    let lastLessonDate = null;
    if (professorLessons.length > 0) {
      lastLessonDate = professorLessons.reduce((lastDate, lesson) => {
        const lessonDate = parseISO(lesson.lesson_date);
        return lastDate ? (lessonDate > lastDate ? lessonDate : lastDate) : lessonDate;
      }, null);
    }

    return {
      ...professor,
      weeklyLessons: professorLessons.length,
      totalPayment,
      lastLessonDate,
    };
  }).filter(prof => prof.weeklyLessons > 0); // Filter only professors with lessons this week

  // Calculate total payments for all professors for the week
  const totalProfessorPayments = professorWeeklyData.reduce(
    (sum, prof) => sum + prof.totalPayment,
    0
  );

  // Filtered lessons for the selected period
  const periodLessons = getLessonsForPeriod();
  
  // Filtered packages for the selected period
  const periodPackages = getPackagesForPeriod();

  // Calculate income from single lessons (price field)
  const lessonsPriceIncome = periodLessons
    .filter(lesson => !lesson.is_package && lesson.is_paid)
    .reduce((sum, lesson) => sum + parseFloat(lesson.price || 0), 0);

  // Calculate income from packages (package_cost field)
  const packagesPriceIncome = periodPackages
    .reduce((sum, pkg) => sum + parseFloat(pkg.package_cost || 0), 0);

  // Calculate payments to professors (total_payment field from all lessons)
  const professorsPayments = periodLessons
    .reduce((sum, lesson) => sum + parseFloat(lesson.total_payment || 0), 0);

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
        Dashboard Amministrazione
      </Typography>

      <Grid container spacing={3}>
        {/* Calendar */}
        <Grid item xs={12}>
          <AdminDashboardCalendar
            currentWeekStart={currentWeekStart}
            handleChangeWeek={handleChangeWeek}
            getProfessorsForDay={getProfessorsForDay}
            handleProfessorClick={handleProfessorClick}
            handleDayClick={handleDayClick}
          />
        </Grid>
        
        {/* Professors Weekly Table */}
        <Grid item xs={12} md={7}>
          <ProfessorWeeklyTable
            currentWeekStart={currentWeekStart}
            endOfWeek={endOfWeek}
            navigateToManageProfessors={navigateToManageProfessors}
            professorWeeklyData={professorWeeklyData}
            totalProfessorPayments={totalProfessorPayments}
            handleProfessorClick={handleProfessorClick}
          />
        </Grid>
        
        {/* Admin Dashboard Summary */}
        <Grid item xs={12} md={5}>
          <AdminDashboardSummary
            currentWeekStart={currentWeekStart}
            professorWeeklyData={professorWeeklyData}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            periodLessons={periodLessons}
            periodPackages={periodPackages}
            lessonsPriceIncome={lessonsPriceIncome}
            packagesPriceIncome={packagesPriceIncome}
            professorsPayments={professorsPayments}
            currentTab={currentTab}
            setCurrentTab={setCurrentTab}
            allPackages={packages}
            allLessons={lessons}
          />
        </Grid>
      </Grid>

      {/* Dialog for day professors */}
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