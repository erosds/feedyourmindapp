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
  Tooltip
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
  // Aggiungi prop per packages e lessons totali
  allPackages = [],
  allLessons = [],
  // Aggiungi funzioni di navigazione
  navigateToPackages,
  navigateToLessons,
}) {
  // Funzione per ottenere l'intervallo del periodo selezionato
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

  // Calcolo pacchetti in scadenza
  const expiringPackages = useMemo(() => {
    const { start, end } = getPeriodInterval();
    return allPackages.filter(pkg => {
      const expiryDate = parseISO(pkg.expiry_date);
      // Pacchetti che scadono nell'intervallo corrente
      return (
        isWithinInterval(expiryDate, { start, end }) &&
        (pkg.status === 'in_progress' || pkg.status === 'expired')
      );
    });
  }, [allPackages, periodFilter]);

  // Calcolo pacchetti scaduti non pagati
  const expiredPackages = useMemo(() => {
    return allPackages.filter(pkg =>
      pkg.status === 'expired' && !pkg.is_paid
    );
  }, [allPackages]);

  // Calcolo lezioni non pagate
  const unpaidLessons = useMemo(() => {
    return allLessons.filter(lesson =>
      !lesson.is_package && !lesson.is_paid
    );
  }, [allLessons]);

  // Calcoli esistenti
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

  // Componente per blocchi statistici cliccabili
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
        alignItems="center"
        mb={1}
        sx={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <IconButton
          onClick={onClick}
          disabled={!onClick}
          sx={{
            mr: 1,
            color: color,
            '&:hover': onClick ? {
              backgroundColor: 'rgba(0,0,0,0.1)'
            } : {}
          }}
        >
          {icon}
        </IconButton>
        <Typography variant={variant} color="text.secondary">
          {label}
        </Typography>
      </Box>
      <Typography variant="h5">
        {value}
      </Typography>
    </Grid>
  );

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Riepilogo Statistiche
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

            <Grid container spacing={2} sx={{ mt: 2 }}>

              {/* Dettaglio finanziario */}
              <Grid item xs={12} md={4} container alignItems="center" justifyContent="center">
                <Grid item>
                  <MoneyIcon color="primary" sx={{ mr: 2, fontSize: 20 }} />
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    Entrate
                  </Typography>
                  <Typography variant="h6" color="primary">
                    €{totalIncome.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>

              <Grid item xs={12} md={4} container alignItems="center" justifyContent="center">
                <Grid item>
                  <PaymentIcon color="secondary" sx={{ mr: 2, fontSize: 20 }} />
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    Pagamenti
                  </Typography>
                  <Typography variant="h6" color="secondary.main">
                    €{totalExpenses.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>

              <Grid item xs={12} md={4} container alignItems="center" justifyContent="center">
                <Grid item>
                  <TrendingUpIcon
                    color={netProfit >= 0 ? 'success' : 'error'}
                    sx={{ mr: 2, fontSize: 20 }}
                  />
                </Grid>
                <Grid item>
                  <Typography variant="body2" color="text.secondary">
                    Ricavi
                  </Typography>
                  <Typography
                    variant="h6"
                    color={netProfit >= 0 ? 'success.main' : 'error.main'}
                  >
                    €{netProfit.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* Professori attivi */}
              <ClickableStatBlock
                icon={<PersonIcon />}
                label="Professori attivi"
                value={activeProfessorsCount}
              />

              {/* Lezioni nel periodo */}
              <ClickableStatBlock
                icon={<LessonIcon />}
                label="Lezioni nel periodo"
                value={totalLessonsCount}
              />

              {/* Ore totali di lezione */}
              <ClickableStatBlock
                icon={<LessonIcon />}
                label="Ore di lezione totali"
                value={totalLessonHours.toFixed(1)}
              />

              {/* Riga successiva - blocchi cliccabili */}
              <ClickableStatBlock
                icon={<TimerIcon />}
                label="Pacchetti in scadenza"
                value={expiringPackages.length}
                onClick={navigateToPackages}
                color="warning.main"
              />

              <ClickableStatBlock
                icon={<CancelIcon />}
                label="Pacchetti da saldare"
                value={expiredPackages.length}
                onClick={navigateToPackages}
                color="error.main"
              />

              <ClickableStatBlock
                icon={<MoneyIcon />}
                label="Lezioni da saldare"
                value={unpaidLessons.length}
                onClick={navigateToLessons}
                color="secondary.main"
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

              {/* Dettagli aggiuntivi */}
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
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminDashboardSummary;