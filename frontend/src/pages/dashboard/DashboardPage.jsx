// src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
  Paper,
  ButtonGroup,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  parseISO,
  isEqual,
  getDay,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { lessonService, studentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';


function DashboardPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentTab, setCurrentTab] = useState(0);
  const [periodFilter, setPeriodFilter] = useState('week');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [students, setStudents] = useState({});

  // Genera i giorni della settimana a partire dal lunedì
  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Recupera le lezioni del professore corrente
        const response = await lessonService.getByProfessor(currentUser.id);
        setLessons(response.data);

        // Recupera i dati degli studenti
        const studentsResponse = await studentService.getAll();
        const studentsMap = {};
        studentsResponse.data.forEach(student => {
          studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudents(studentsMap);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Impossibile caricare i dati. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser.id]);

  // Funzione per cambiare settimana
  const handleChangeWeek = (direction) => {
    if (direction === 'next') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    } else {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    }
  };

  // Funzione per ottenere le lezioni di un giorno specifico
  const getLessonsForDay = (day) => {
    return lessons.filter(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      return isEqual(
        new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
        new Date(day.getFullYear(), day.getMonth(), day.getDate())
      );
    });
  };

  // Funzione per ottenere le lezioni nel periodo selezionato
  const getLessonsForPeriod = () => {
    let startDate, endDate;

    switch (periodFilter) {
      case 'week':
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
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
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
    }

    return lessons.filter(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      return isWithinInterval(lessonDate, { start: startDate, end: endDate });
    });
  };

  // Calcola il totale guadagnato per un periodo
  const calculateEarnings = (lessonsArray) => {
    return lessonsArray.reduce((total, lesson) => total + parseFloat(lesson.total_payment), 0);
  };

  // Funzione per gestire il click su una lezione
  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setLessonDialogOpen(true);
  };

  // Funzione per chiudere il dialog
  const handleCloseDialog = () => {
    setLessonDialogOpen(false);
  };

  // Funzione per navigare alla pagina di dettaglio della lezione
  const handleViewLessonDetails = () => {
    setLessonDialogOpen(false);
    navigate(`/lessons/${selectedLesson.id}`);
  };

  // Calcola le lezioni della settimana corrente
  const currentWeekLessons = lessons.filter(lesson => {
    const lessonDate = parseISO(lesson.lesson_date);
    return isWithinInterval(lessonDate, {
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    });
  });

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
      <Typography variant="h4" gutterBottom>
        Le mie lezioni
      </Typography>

      <Grid container spacing={3}>
        {/* Calendario Settimanale */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6">
                Calendario Settimanale
              </Typography>
              <ButtonGroup size="small">
                <Button onClick={() => handleChangeWeek('prev')}>Settimana Precedente</Button>
                <Button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                  Oggi
                </Button>
                <Button onClick={() => handleChangeWeek('next')}>Settimana Successiva</Button>
              </ButtonGroup>
            </Box>

            <Typography variant="subtitle1" align="center" gutterBottom
              sx={{ fontWeight: 'bold', fontSize: '1.2rem', my: 2 }}>
              {format(currentWeekStart, "d MMMM yyyy", { locale: it })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: it })}
            </Typography>

            <Grid container spacing={1} sx={{ flexGrow: 1, mt: 0 }}>
              {daysOfWeek.map(day => {
                const dayLessons = getLessonsForDay(day);
                const isCurrentDay = isToday(day);
                return (
                  <Grid item xs sx={{ width: 'calc(100% / 7)' }} key={day.toString()}>
                    <Paper
                      elevation={isCurrentDay ? 3 : 1}
                      sx={{
                        p: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: isCurrentDay ? 'primary.light' : 'background.paper',
                        color: isCurrentDay ? 'primary.contrastText' : 'text.primary',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxSizing: 'border-box'
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        align="center"
                        sx={{
                          fontWeight: isCurrentDay ? 'bold' : 'normal',
                          mb: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          pb: 0.5
                        }}
                      >
                        {format(day, "EEEE d", { locale: it })}
                      </Typography>

                      {dayLessons.length === 0 ? (
                        <Box textAlign="center" py={2} sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}>
                            Nessuna lezione
                          </Typography>
                        </Box>
                      ) : (
                        <List dense disablePadding sx={{ flexGrow: 1 }}>
                          {dayLessons.map(lesson => (
                            <ListItem
                              key={lesson.id}
                              button
                              onClick={() => handleLessonClick(lesson)}
                              sx={{
                                mb: 0.5,
                                bgcolor: 'background.paper',
                                borderRadius: 1,
                                color: 'text.primary', // Assicura che il testo sia sempre scuro
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              <ListItemText
                                primary={students[lesson.student_id] || `Studente #${lesson.student_id}`}
                                secondary={`${lesson.duration} ore - €${parseFloat(lesson.total_payment).toFixed(2)}`}
                                primaryTypographyProps={{ variant: 'body2', noWrap: true, color: 'text.primary' }}
                                secondaryTypographyProps={{ variant: 'caption', noWrap: true, color: 'text.secondary' }}
                              />
                              {lesson.is_package && (
                                <Chip
                                  label="P"
                                  size="small"
                                  color="primary"
                                  sx={{ width: 24, height: 24, fontSize: '0.625rem' }}
                                />
                              )}
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* Pannello laterale con riepilogo guadagni */}
        <Grid item xs={12} md={3}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Riepilogo Settimana
              </Typography>
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary">
                  Lezioni questa settimana
                </Typography>
                <Typography variant="h4" color="primary">
                  {currentWeekLessons.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={2}>
                  Guadagni settimana
                </Typography>
                <Typography variant="h4" color="primary">
                  €{currentWeekEarnings.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Paper sx={{ p: 2 }}>
            <Tabs
              value={currentTab}
              onChange={(event, newValue) => setCurrentTab(newValue)}
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
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="period-filter-label">Periodo</InputLabel>
                  <Select
                    labelId="period-filter-label"
                    value={periodFilter}
                    label="Periodo"
                    onChange={(e) => setPeriodFilter(e.target.value)}
                  >
                    <MenuItem value="week">Questa Settimana</MenuItem>
                    <MenuItem value="month">Questo Mese</MenuItem>
                    <MenuItem value="year">Questo Anno</MenuItem>
                  </Select>
                </FormControl>

                <Box mt={3}>
                  <Typography variant="body2" color="text.secondary">
                    Lezioni nel periodo
                  </Typography>
                  <Typography variant="h5">
                    {periodLessons.length}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="body2" color="text.secondary">
                    Guadagni nel periodo
                  </Typography>
                  <Typography variant="h5" color="primary">
                    €{periodEarnings.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Lezioni per tipo
                </Typography>

                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Lezioni singole"
                      secondary={`${periodLessons.filter(l => !l.is_package).length} lezioni`}
                    />
                    <Typography>
                      €{calculateEarnings(periodLessons.filter(l => !l.is_package)).toFixed(2)}
                    </Typography>
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Lezioni da pacchetti"
                      secondary={`${periodLessons.filter(l => l.is_package).length} lezioni`}
                    />
                    <Typography>
                      €{calculateEarnings(periodLessons.filter(l => l.is_package)).toFixed(2)}
                    </Typography>
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  Media per lezione
                </Typography>
                <Typography variant="h6">
                  €{periodLessons.length > 0 ? (periodEarnings / periodLessons.length).toFixed(2) : '0.00'}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box display="flex" justifyContent="space-between">
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => navigate('/lessons')}
                    fullWidth
                  >
                    Visualizza tutte le lezioni
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog con dettagli lezione */}
      <Dialog open={lessonDialogOpen} onClose={handleCloseDialog}>
        {selectedLesson && (
          <>
            <DialogTitle>
              Dettagli Lezione #{selectedLesson.id}
            </DialogTitle>
            <DialogContent>
              <List dense>
                <ListItem>
                  <ListItemText primary="Data" secondary={format(parseISO(selectedLesson.lesson_date), "EEEE d MMMM yyyy", { locale: it })} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Studente" secondary={students[selectedLesson.student_id] || `Studente #${selectedLesson.student_id}`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Durata" secondary={`${selectedLesson.duration} ore`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Tipo" secondary={selectedLesson.is_package ? `Pacchetto #${selectedLesson.package_id}` : 'Lezione singola'} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Tariffa oraria" secondary={`€${parseFloat(selectedLesson.hourly_rate).toFixed(2)}`} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Totale" secondary={`€${parseFloat(selectedLesson.total_payment).toFixed(2)}`} />
                </ListItem>
              </List>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Chiudi</Button>
              <Button onClick={handleViewLessonDetails} color="primary">
                Vedi tutti i dettagli
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default DashboardPage;