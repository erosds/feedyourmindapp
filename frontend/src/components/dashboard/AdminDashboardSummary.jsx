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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Prima Card: Statistiche basate sul periodo selezionato */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Statistiche per Periodo
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
                  <MenuItem value="week">Settimana Selezionata</MenuItem>
                  <MenuItem value="month">Mese Corrente</MenuItem>
                  <MenuItem value="lastMonth">Mese Scorso</MenuItem>
                  <MenuItem value="year">Anno Corrente</MenuItem>
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
                  label="Ore di lezione"
                  value={totalLessonHours.toFixed(1)}
                />
              </Grid>
            </Box>
          ) : (
            <Box>
              <Grid container spacing={2}>
                {/* Colonna lezioni singole */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Lezioni Singole
                  </Typography>
                  <List dense>
                    <ListItem>
                      {(() => {
                        const singleLessons = periodLessons.filter(lesson => !lesson.is_package);
                        const paidLessons = singleLessons.filter(lesson => lesson.is_paid).length;
                        const totalLessons = singleLessons.length;
                        
                        return (
                          <ListItemText
                            primary="Numero lezioni"
                            secondary={
                              <Typography variant="body2">
                                {totalLessons} <Typography component="span" variant="caption" color="text.secondary">(di cui pagate: {paidLessons})</Typography>
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      {(() => {
                        const singleLessons = periodLessons.filter(lesson => !lesson.is_package);
                        const paidLessonsHours = singleLessons
                          .filter(lesson => lesson.is_paid)
                          .reduce((total, lesson) => total + parseFloat(lesson.duration), 0);
                        const totalHours = singleLessons
                          .reduce((total, lesson) => total + parseFloat(lesson.duration), 0);
                          
                        return (
                          <ListItemText
                            primary="Ore di lezione"
                            secondary={
                              <Typography variant="body2">
                                {totalHours.toFixed(1)} <Typography component="span" variant="caption" color="text.secondary">(di cui pagate: {paidLessonsHours.toFixed(1)})</Typography>
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      {(() => {
                        // Ottieni tutte le lezioni singole nel periodo
                        const singleLessons = periodLessons.filter(lesson => !lesson.is_package);
                        
                        // Entrate effettive (solo lezioni pagate con prezzo > 0)
                        const actualIncome = lessonsPriceIncome;
                        
                        // Entrate teoriche (somma di tutti i prezzi delle lezioni, anche se non pagate)
                        const theoreticalIncome = singleLessons.reduce((total, lesson) => 
                          total + parseFloat(lesson.price || 0), 0);
                        
                        // Verifica se ci sono lezioni con prezzo a zero
                        const zeroPrice = singleLessons.some(lesson => 
                          (!lesson.price || parseFloat(lesson.price) === 0) && lesson.is_paid);
                        
                        return (
                          <ListItemText
                            primary="Entrate lezioni"
                            secondary={
                              <Box>
                                <Typography variant="body2" component="span">
                                  €{actualIncome.toFixed(2)}/{theoreticalIncome.toFixed(2)}
                                </Typography>
                                {zeroPrice && (
                                  <Typography 
                                    variant="caption" 
                                    component="div" 
                                    color="error.main" 
                                    sx={{ mt: 0.5 }}
                                  >
                                    * Esistono lezioni pagate senza prezzo impostato
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                  </List>
                </Grid>
                
                {/* Colonna lezioni da pacchetti */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Lezioni da Pacchetti
                  </Typography>
                  <List dense>
                    <ListItem>
                      {(() => {
                        const packageLessons = periodLessons.filter(lesson => lesson.is_package);
                        const paidPackageIds = new Set(
                          periodPackages
                            .filter(pkg => pkg.is_paid)
                            .map(pkg => pkg.id)
                        );
                        const paidLessons = packageLessons.filter(lesson => 
                          paidPackageIds.has(lesson.package_id)
                        ).length;
                        const totalLessons = packageLessons.length;
                        
                        return (
                          <ListItemText
                            primary="Numero lezioni"
                            secondary={
                              <Typography variant="body2">
                                {totalLessons} 
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      {(() => {
                        const packageLessons = periodLessons.filter(lesson => lesson.is_package);
                        const paidPackageIds = new Set(
                          periodPackages
                            .filter(pkg => pkg.is_paid)
                            .map(pkg => pkg.id)
                        );
                        const paidLessonsHours = packageLessons
                          .filter(lesson => paidPackageIds.has(lesson.package_id))
                          .reduce((total, lesson) => total + parseFloat(lesson.duration), 0);
                        const totalHours = packageLessons
                          .reduce((total, lesson) => total + parseFloat(lesson.duration), 0);

                        return (
                          <ListItemText
                            primary="Ore di lezione"
                            secondary={
                              <Typography variant="body2">
                                {totalHours.toFixed(1)}
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Entrate pacchetti"
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              €{packagesPriceIncome.toFixed(2)}
                            </Typography>
                            {periodPackages.some(pkg => (!pkg.package_cost || parseFloat(pkg.package_cost) === 0) && pkg.is_paid) && (
                              <Typography 
                                variant="caption" 
                                component="div" 
                                color="error.main" 
                                sx={{ mt: 0.5 }}
                              >
                                * Esistono pacchetti pagati con prezzo a zero
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Seconda Card: Informazioni Aggiuntive (fisse, calcolate al giorno attuale) */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informazioni Aggiuntive
          </Typography>
          
          <Grid container spacing={2}>
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
              label="Lezioni singole da saldare"
              value={unpaidLessons.length}
              onClick={() => navigateToLessons('unpaid')}
              color="error.main"
            />
          </Grid>

          
        </CardContent>
      </Card>
    </Box>
  );
}

export default AdminDashboardSummary;