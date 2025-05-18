// Modifiche a AdminDashboardSummary.jsx
import React, { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  Person as PersonIcon,
  EventNote as LessonIcon,
  Timer as TimerIcon,
  Cancel as CancelIcon,
  MonetizationOn as MoneyIcon,
  GroupAdd as PaymentIcon,
  AccountBalance as TrendingUpIcon,
} from '@mui/icons-material';
import {
  parseISO,
  format,
  isWithinInterval
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PaymentRemindersCard from './PaymentRemindersCard';

function AdminDashboardSummary({
  professorWeeklyData = [],
  professors = [],
  periodFilter = 'week',
  setPeriodFilter,
  periodLessons = [],
  periodPackages = [],
  currentTab = 0,
  setCurrentTab,
  // Props for total packages and lessons
  allPackages = [],
  allLessons = [],
  onNotesUpdate,
  // Date range for the selected period
  periodStartDate,
  periodEndDate
}) {
  const navigate = useNavigate();

  // Function to navigate to packages page with proper filter
  const navigateToPackages = (filter) => {
    if (filter === 'expiring') {
      navigate('/packages?status=expiring');
    } else if (filter === 'unpaid') {
      navigate('/packages?payment=unpaid');
    } else {
      navigate('/packages');
    }
  };

  // Function to navigate to lessons page with filters
  const navigateToLessons = (filter) => {
    if (filter === 'unpaid') {
      navigate('/lessons?payment=unpaid');
    } else {
      navigate('/lessons');
    }
  };

  // Filter and process payments for the selected period with the PaymentCalendar logic
  const paymentsData = useMemo(() => {
    // Format start and end dates for comparisons
    const startDateStr = periodStartDate ? format(periodStartDate, 'yyyy-MM-dd') : null;
    const endDateStr = periodEndDate ? format(periodEndDate, 'yyyy-MM-dd') : null;

    if (!startDateStr || !endDateStr) return { lessons: [], packages: [], totals: { lessons: 0, packages: 0 }};

    // Filter paid lessons (single lessons only, not package lessons)
    const paidLessons = allLessons.filter(lesson => 
      lesson.is_paid && 
      lesson.payment_date && 
      !lesson.is_package &&
      lesson.payment_date >= startDateStr &&
      lesson.payment_date <= endDateStr
    );

    // Filter paid packages
    const paidPackages = allPackages.filter(pkg => 
      pkg.is_paid && 
      pkg.payment_date &&
      pkg.payment_date >= startDateStr &&
      pkg.payment_date <= endDateStr
    );

    // Calculate totals
    const lessonsPriceIncome = paidLessons.reduce((sum, lesson) => sum + parseFloat(lesson.price || 0), 0);
    const packagesPriceIncome = paidPackages.reduce((sum, pkg) => sum + parseFloat(pkg.package_cost || 0), 0);

    // Calculate hours (for lessons)
    const lessonHours = paidLessons.reduce((sum, lesson) => sum + parseFloat(lesson.duration || 0), 0);

    return {
      lessons: paidLessons,
      packages: paidPackages,
      totals: {
        lessons: lessonsPriceIncome,
        packages: packagesPriceIncome,
        total: lessonsPriceIncome + packagesPriceIncome
      },
      hours: {
        lessons: lessonHours
      }
    };
  }, [allLessons, allPackages, periodStartDate, periodEndDate]);

  // NUOVO: Calcola i compensi ai professori per il periodo selezionato
  const professorPaymentsForPeriod = useMemo(() => {
    if (!periodStartDate || !periodEndDate || !Array.isArray(allLessons)) {
      return 0;
    }

    // Filtra le lezioni nel periodo selezionato
    const lessonsInPeriod = allLessons.filter(lesson => {
      if (!lesson.lesson_date) return false;
      
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isWithinInterval(lessonDate, {
          start: periodStartDate,
          end: periodEndDate
        });
      } catch (err) {
        console.error("Error filtering lessons for period in admin summary:", err);
        return false;
      }
    });

    // Calcola il totale dei pagamenti ai professori per questo periodo
    return lessonsInPeriod.reduce((sum, lesson) => {
      return sum + parseFloat(lesson.total_payment || 0);
    }, 0);
  }, [allLessons, periodStartDate, periodEndDate]);

  // Calculate expiring packages
  const expiringPackages = useMemo(() => {
    // Get the Monday of the current week
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 0 for Sunday, transformed to 7
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - dayOfWeek + 1);
    mondayThisWeek.setHours(0, 0, 0, 0);

    // Get the Monday of next week (7 days later)
    const mondayNextWeek = new Date(mondayThisWeek);
    mondayNextWeek.setDate(mondayThisWeek.getDate() + 7);

    // Filter packages expiring this week
    return allPackages.filter(pkg => {
      const expiryDate = parseISO(pkg.expiry_date);

      return (
        pkg.status === 'in_progress' && // Only active packages
        expiryDate >= mondayThisWeek &&
        expiryDate <= mondayNextWeek
      );
    });
  }, [allPackages]);

  // Calculate expired unpaid packages
  const expiredPackages = useMemo(() => {
    return allPackages.filter(pkg => !pkg.is_paid);
  }, [allPackages]);

  // Calculate unpaid lessons
  const unpaidLessons = useMemo(() => {
    return allLessons.filter(lesson => !lesson.is_package && !lesson.is_paid);
  }, [allLessons]);

  // Calculate total lesson hours
  const totalLessonHours = useMemo(() => {
    return periodLessons.reduce((total, lesson) => total + parseFloat(lesson.duration), 0);
  }, [periodLessons]);

  // Period data for display
  const totalIncome = paymentsData.totals.total;
  const totalExpenses = professorPaymentsForPeriod; // Usa il nuovo calcolo per il periodo
  const netProfit = totalIncome - totalExpenses;

  const activeProfessorsCount = professorWeeklyData.length;
  const totalLessonsCount = periodLessons.length;

  const handlePeriodChange = (event) => {
    setPeriodFilter(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Clickable stat block component
  const ClickableStatBlock = ({
    icon,
    label,
    value,
    onClick,
    color = 'text.secondary',
    variant = 'body2'
  }) => (
    <Grid item xs={12} md={4}>
      <Box
        display="flex"
        flexDirection="column"
        sx={{
          cursor: onClick ? 'pointer' : 'default',
          borderRadius: 1,
          transition: 'all 0.2s ease',
          '&:hover': onClick ? {
            backgroundColor: 'rgba(0,0,0,0.04)',
            transform: 'translateY(-2px)',
            boxShadow: 1
          } : {}
        }}
        onClick={onClick}
      >
        <Box display="flex" alignItems="center" mb={1}>
          {React.cloneElement(icon, {
            sx: {
              mr: 1,
              color: color,
              fontSize: 24
            }
          })}
          <Typography variant={variant} color="text.secondary">
            {label}
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight="medium" color={onClick ? color : 'inherit'}>
          {value}
        </Typography>
      </Box>
    </Grid>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* Second Card: Additional Information (fixed, calculated for the current day) */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={3} gutterBottom>
            Riepilogo da incassare
          </Typography>

          <Grid container spacing={2}>
            {/* Clickable stat blocks */}
            <ClickableStatBlock
              icon={<TimerIcon />}
              label="Pacchetti in scadenza"
              value={expiringPackages.length}
              onClick={() => navigateToPackages('expiring')}
              color="warning.main"
            />

            <ClickableStatBlock
              icon={<CancelIcon />}
              label="Pacchetti da saldare"
              value={expiredPackages.length}
              onClick={() => navigateToPackages('unpaid')}
              color="error.main"
            />

            <ClickableStatBlock
              icon={<MoneyIcon />}
              label="Lezioni da saldare"
              value={unpaidLessons.length}
              onClick={() => navigateToLessons('unpaid')}
              color="error.main"
            />
          </Grid>
        </CardContent>
      </Card>

      {/* Payment Reminders Card */}
      <PaymentRemindersCard
        professors={professors}
        onNotesUpdate={onNotesUpdate}
      />
    </Box>
  );
}

export default AdminDashboardSummary;