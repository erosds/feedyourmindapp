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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* First Card: Period-based Statistics */}
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
                {/* Single Lessons column */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Lezioni Singole
                  </Typography>
                  <List dense>
                    <ListItem>
                      {(() => {
                        const paidSingleLessons = paymentsData.lessons;
                        const singleLessons = periodLessons.filter(lesson => !lesson.is_package);
                        const paidLessonsCount = paidSingleLessons.length;
                        const totalLessonsCount = singleLessons.length;

                        return (
                          <ListItemText
                            primary="Numero lezioni"
                            secondary={
                              <Typography variant="body2">
                                {totalLessonsCount} <Typography component="span" variant="caption" color="text.secondary">(di cui pagate: {paidLessonsCount})</Typography>
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      {(() => {
                        const paidLessonsHours = paymentsData.hours.lessons;
                        const totalHours = periodLessons
                          .filter(lesson => !lesson.is_package)
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
                        // Get all single lessons in the period
                        const singleLessons = periodLessons.filter(lesson => !lesson.is_package);

                        // Actual income (only paid lessons with price > 0)
                        const actualIncome = paymentsData.totals.lessons;

                        // Theoretical income (sum of all lesson prices, even if not paid)
                        const theoreticalIncome = singleLessons.reduce((total, lesson) =>
                          total + parseFloat(lesson.price || 0), 0);

                        // Check if there are lessons with zero price
                        const zeroPrice = paymentsData.lessons.some(lesson =>
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

                {/* Package Lessons column */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Lezioni da Pacchetti
                  </Typography>
                  <List dense>
                    <ListItem>
                      {(() => {
                        // Get unique package IDs used in this period
                        const packageLessons = periodLessons.filter(lesson => lesson.is_package);
                        const uniquePackageIds = [...new Set(packageLessons.map(lesson => lesson.package_id))];
                        const totalPackages = uniquePackageIds.length;

                        // Count paid packages in the period
                        const paidPackagesCount = paymentsData.packages.length;

                        return (
                          <ListItemText
                            primary="Numero pacchetti"
                            secondary={
                              <Typography variant="body2">
                                {totalPackages} {totalPackages === 1 ? 'pacchetto' : 'pacchetti'} in uso
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {paidPackagesCount > 0 ? 
                                    ` (${paidPackagesCount} pagat${paidPackagesCount === 1 ? 'o' : 'i'} nel periodo)` : 
                                    ''}
                                </Typography>
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      {(() => {
                        const packageLessons = periodLessons.filter(lesson => lesson.is_package);
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
                              €{paymentsData.totals.packages.toFixed(2)}
                            </Typography>
                            {paymentsData.packages.some(pkg => (!pkg.package_cost || parseFloat(pkg.package_cost) === 0) && pkg.is_paid) && (
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

      {/* Second Card: Additional Information (fixed, calculated for the current day) */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informazioni Aggiuntive
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