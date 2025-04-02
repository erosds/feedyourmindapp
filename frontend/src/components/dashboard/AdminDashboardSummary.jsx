import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
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
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  EuroSymbol as EuroIcon,
  Person as PersonIcon,
  EventNote as LessonIcon,
  Timer as TimerIcon,
  Cancel as CancelIcon,
  MonetizationOn as MoneyIcon,
  GroupAdd as PaymentIcon,
  AccountBalance as TrendingUpIcon,
} from '@mui/icons-material';
import {
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isAfter,
  isBefore,
  addDays
} from 'date-fns';
import { useNavigate } from 'react-router-dom';

function AdminDashboardSummary({
  currentWeekStart,
  professorWeeklyData = [],
  periodFilter = 'week',
  setPeriodFilter,
  periodLessons = [],
  periodPackages = [],
  lessonsPriceIncome = 0,
  packagesPriceIncome = 0,
  professorsPayments = 0,
  currentTab = 0,
  setCurrentTab,
  // Props for total packages and lessons
  allPackages = [],
  allLessons = [],
}) {
  const navigate = useNavigate();

  // Function to navigate to packages page with proper filter
  const navigateToPackages = (filter) => {
    if (filter === 'expiring') {
      // Naviga alla pagina pacchetti con filtro per pacchetti in scadenza
      navigate('/packages', {
        state: {
          initialFilter: 'expiring',
          statusFilter: 'expiring'
        }
      });
    } else if (filter === 'unpaid') {
      // Naviga alla pagina pacchetti con filtro per pacchetti non pagati
      navigate('/packages', {
        state: {
          initialFilter: 'expired',
          paymentFilter: 'unpaid'
        }
      });
    } else {
      // Navigazione di default senza filtri
      navigate('/packages');
    }
  };

  // Function to navigate to lessons page with proper filter
  const navigateToLessons = (filter) => {
    if (filter === 'unpaid') {
      // Navigate to lessons page with filter for unpaid lessons
      navigate('/lessons', {
        state: {
          initialFilter: 'unpaid'
        }
      });
    } else {
      // Default navigation without filters
      navigate('/lessons');
    }
  };

  // Function to get the period interval
  const getPeriodInterval = () => {
    const today = new Date();
    switch (periodFilter) {
      case 'week':
        return {
          start: startOfWeek(today, { weekStartsOn: 1 }),
          end: endOfWeek(today, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(today),
          end: endOfMonth(today)
        };
      case 'year':
        return {
          start: startOfYear(today),
          end: endOfYear(today)
        };
      default:
        return {
          start: startOfWeek(today, { weekStartsOn: 1 }),
          end: endOfWeek(today, { weekStartsOn: 1 })
        };
    }
  };

  // Calculate expiring packages
  const expiringPackages = useMemo(() => {
    // Ottieni il lunedì della settimana corrente
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 0 per domenica, trasformato in 7
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - dayOfWeek + 1); // Lunedì della settimana corrente
    mondayThisWeek.setHours(0, 0, 0, 0); // Inizio della giornata
    
    // Ottieni il lunedì della settimana prossima (7 giorni dopo)
    const mondayNextWeek = new Date(mondayThisWeek);
    mondayNextWeek.setDate(mondayThisWeek.getDate() + 7);
    
    // Filtra i pacchetti in scadenza
    return allPackages.filter(pkg => {
      const expiryDate = parseISO(pkg.expiry_date);
      
      // Pacchetti la cui scadenza è compresa tra il lunedì di questa settimana e il lunedì della prossima (inclusi)
      return (
        pkg.status === 'in_progress' && // Solo pacchetti in corso
        expiryDate >= mondayThisWeek && 
        expiryDate <= mondayNextWeek
      );
    });
  }, [allPackages]);

  // Calculate expired unpaid packages
  const expiredPackages = useMemo(() => {
    return allPackages.filter(pkg =>
      pkg.status === 'expired' && !pkg.is_paid
    );
  }, [allPackages]);

  // Calculate unpaid lessons
  const unpaidLessons = useMemo(() => {
    return allLessons.filter(lesson =>
      !lesson.is_package && !lesson.is_paid
    );
  }, [allLessons]);

  // Calculate total lesson hours
  const totalLessonHours = useMemo(() => {
    return periodLessons.reduce((total, lesson) =>
      total + parseFloat(lesson.duration), 0
    );
  }, [periodLessons]);

  const totalIncome = lessonsPriceIncome + packagesPriceIncome;
  const totalExpenses = professorsPayments;
  const netProfit = totalIncome - totalExpenses;

  const activeProfessorsCount = professorWeeklyData.length;
  const totalLessonsCount = periodLessons.length;

  const handlePeriodChange = (event) => {
    setPeriodFilter(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Modified ClickableStatBlock component to make the entire block clickable
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
          p: 1,
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
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Statistiche
        </Typography>

        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="Riepilogo" />
          <Tab label="Dettaglio" />
        </Tabs>

        {currentTab === 0 ? (
          <Box>
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel id="period-filter-label">Periodo</InputLabel>
              <Select
                labelId="period-filter-label"
                value={periodFilter}
                label="Periodo"
                onChange={handlePeriodChange}
              >
                <MenuItem value="week">Questa Settimana</MenuItem>
                <MenuItem value="month">Questo Mese</MenuItem>
                <MenuItem value="year">Questo Anno</MenuItem>
              </Select>
            </FormControl>

            <Grid container spacing={2} sx={{ mt: 1 }}>

              {/* Financial details */}
              <ClickableStatBlock
                icon={<MoneyIcon />}
                label="Entrate"
                value={`€${totalIncome.toFixed(2)}`}
                color="primary.main"
              />

              <ClickableStatBlock
                icon={<PaymentIcon />}
                label="Pagamenti"
                value={`€${totalExpenses.toFixed(2)}`}
                color="secondary.main"
              />

              <ClickableStatBlock
                icon={<TrendingUpIcon />}
                label="Ricavi"
                value={`€${netProfit.toFixed(2)}`}
                color={netProfit >= 0 ? 'success.main' : 'error.main'}
              />
              <Grid item xs={12}>
                <Divider/>
              </Grid>

              {/* Next row - clickable blocks */}
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

              <Grid item xs={12}>
                <Divider/>
              </Grid>

              {/* Active professors */}
              <ClickableStatBlock
                icon={<PersonIcon />}
                label="Professori attivi"
                value={activeProfessorsCount}
              />

              {/* Lessons in period */}
              <ClickableStatBlock
                icon={<LessonIcon />}
                label="Lezioni nel periodo"
                value={totalLessonsCount}
              />

              {/* Total lesson hours */}
              <ClickableStatBlock
                icon={<LessonIcon />}
                label="Ore di lezione totali"
                value={totalLessonHours.toFixed(1)}
              />

            </Grid>
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Dettagli per tipologia
            </Typography>

            <List dense>
              <ListItem>
                <ListItemText
                  primary="Entrate da pacchetti"
                  secondary={`€${packagesPriceIncome.toFixed(2)}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Entrate da lezioni singole"
                  secondary={`€${lessonsPriceIncome.toFixed(2)}`}
                />
              </ListItem>

              <ListItem>
                <ListItemText
                  primary="Pagamenti ai professori"
                  secondary={`€${professorsPayments.toFixed(2)}`}
                />
              </ListItem>

              {/* Additional details */}
              <ListItem>
                <ListItemText
                  primary="Pacchetti in scadenza"
                  secondary={`${expiringPackages.length} pacchetti`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Pacchetti non saldati"
                  secondary={`${expiredPackages.length} pacchetti`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Lezioni non pagate"
                  secondary={`${unpaidLessons.length} lezioni`}
                />
              </ListItem>
            </List>

            <Box mt={2} display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => navigateToPackages('expiring')}
                  fullWidth
                  sx={{ mr: 1 }}
                  startIcon={<TimerIcon />}
                >
                  Pacchetti in scadenza
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => navigateToPackages('unpaid')}
                  fullWidth
                  sx={{ ml: 1 }}
                  startIcon={<CancelIcon />}
                >
                  Pacchetti da saldare
                </Button>
              </Box>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => navigateToLessons('unpaid')}
                fullWidth
                startIcon={<MoneyIcon />}
              >
                Lezioni da saldare
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminDashboardSummary;