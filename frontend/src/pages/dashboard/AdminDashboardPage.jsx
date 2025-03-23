// src/pages/dashboard/AdminDashboardPage.jsx
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
  ListItemAvatar,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  isWithinInterval,
  max,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { lessonService, professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Person as PersonIcon,
  Euro as EuroIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';

function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Genera i giorni della settimana a partire dal lunedì
  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  useEffect(() => {
    // Redirect if not admin
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Recupera tutti i professori
        const professorsResponse = await professorService.getAll();
        setProfessors(professorsResponse.data);

        // Recupera tutte le lezioni
        const lessonsResponse = await lessonService.getAll();
        setLessons(lessonsResponse.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Impossibile caricare i dati. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, navigate]);

  // Funzione per cambiare settimana
  const handleChangeWeek = (direction) => {
    if (direction === 'next') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    } else {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    }
  };

  // Funzione per ottenere i professori con lezioni in un giorno specifico
  const getProfessorsForDay = (day) => {
    // Ottiene le lezioni per quel giorno
    const dayLessons = lessons.filter(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      return isEqual(
        new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
        new Date(day.getFullYear(), day.getMonth(), day.getDate())
      );
    });

    // Ottiene gli ID dei professori che hanno lezioni quel giorno
    const professorIds = [...new Set(dayLessons.map(lesson => lesson.professor_id))];

    // Filtra l'array dei professori per ottenere solo quelli con lezioni
    return professors.filter(professor => professorIds.includes(professor.id));
  };

  // Calcola le lezioni della settimana corrente
  const currentWeekLessons = lessons.filter(lesson => {
    const lessonDate = parseISO(lesson.lesson_date);
    return isWithinInterval(lessonDate, {
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    });
  });

  // Calcola i dati dei professori per la settimana corrente
  const professorWeeklyData = professors.map(professor => {
    // Filtra le lezioni di questo professore nella settimana
    const professorLessons = currentWeekLessons.filter(
      lesson => lesson.professor_id === professor.id
    );

    // Calcola il totale pagato a questo professore
    const totalPayment = professorLessons.reduce(
      (sum, lesson) => sum + parseFloat(lesson.total_payment),
      0
    );

    // Trova l'ultimo giorno di lezione della settimana per questo professore
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
  }).filter(prof => prof.weeklyLessons > 0); // Filtra solo i professori che hanno lezioni questa settimana

  // Calcola il totale delle paghe di tutti i professori per la settimana
  const totalProfessorPayments = professorWeeklyData.reduce(
    (sum, prof) => sum + prof.totalPayment,
    0
  );

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
        {/* Professori Attivi (Tabella a larghezza piena in alto) */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: '100%', mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Riepilogo Settimanale Professori
              </Typography>
              <Box>
                <ButtonGroup size="small" sx={{ mr: 2 }}>
                  <Button onClick={() => handleChangeWeek('prev')}>Settimana Precedente</Button>
                  <Button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                    Settimana Corrente
                  </Button>
                  <Button onClick={() => handleChangeWeek('next')}>Settimana Successiva</Button>
                </ButtonGroup>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/professors')}
                  endIcon={<ArrowForwardIcon />}
                >
                  Gestione Professori
                </Button>
              </Box>
            </Box>

            <Typography
              variant="subtitle1"
              align="center"
              sx={{
                fontWeight: 'bold',
                fontSize: '1.1rem',
                mb: 3,
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                py: 1,
                borderRadius: 1
              }}
            >
              {format(currentWeekStart, "d MMMM yyyy", { locale: it })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: it })}
            </Typography>

            {professorWeeklyData.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Nessun professore attivo questa settimana
              </Typography>
            ) : (
              <TableContainer sx={{ mb: 2 }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Professore</TableCell>
                      <TableCell align="center">Lezioni in questa settimana</TableCell>
                      <TableCell align="right">Ultimo giorno</TableCell>
                      <TableCell align="right">Pagamento</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {professorWeeklyData.map((prof) => (
                      <TableRow
                        key={prof.id}
                        hover
                        onClick={() => navigate(`/professors/${prof.id}`)}
                        sx={{cursor: 'pointer', height: 20}}
                        
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar
                              sx={{
                                width: 24,
                                height: 24,
                                mr: 1,
                                bgcolor: prof.is_admin ? 'secondary.main' : 'primary.main',
                                fontSize: '0.875rem'
                              }}
                            >
                              {prof.first_name.charAt(0)}
                            </Avatar>
                            <Typography variant="body1">
                              {prof.first_name} {prof.last_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body1">
                            {prof.weeklyLessons}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1">
                            {prof.lastLessonDate ? format(prof.lastLessonDate, "EEEE dd/MM", { locale: it }) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1">
                            €{prof.totalPayment.toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                        <Typography variant="subtitle1" fontWeight="medium">Totale Pagamenti</Typography>
                      </TableCell>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          €{totalProfessorPayments.toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Calendario Settimanale dei Professori (spostato sotto, a sinistra) */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                Calendario Professori in Sede
              </Typography>
            </Box>

            <Grid container spacing={1} sx={{ flexGrow: 1, mt: 0 }}>
              {daysOfWeek.map(day => {
                const dayProfessors = getProfessorsForDay(day);
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

                      {dayProfessors.length === 0 ? (
                        <Box textAlign="center" py={2} sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}>
                            Nessun professore in sede
                          </Typography>
                        </Box>
                      ) : (
                        <List dense disablePadding sx={{ flexGrow: 1 }}>
                          {dayProfessors.map(professor => (
                            <ListItem
                              key={professor.id}
                              button
                              onClick={() => navigate(`/professors/${professor.id}`)}
                              sx={{
                                mb: 0.5,
                                bgcolor: 'background.paper',
                                borderRadius: 1,
                                color: 'text.primary',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: professor.is_admin ? 'secondary.main' : 'primary.main',width: 24,
                                height: 24}}>
                                  {professor.first_name.charAt(0)}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText
                                primary={`${professor.first_name} ${professor.last_name}`}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  noWrap: true,
                                  color: 'text.primary'                            
                                }}
                              />
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

        {/* Pannello laterale con riepilogo professori (spostato sotto, a destra) */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Riepilogo Settimanale
              </Typography>
              <Box mt={3}>
                <Typography variant="body1" color="text.secondary">
                  Professori attivi questa settimana
                </Typography>
                <Typography variant="h3" color="primary" gutterBottom>
                  {professorWeeklyData.length}
                </Typography>
                <Typography variant="body1" color="text.secondary" mt={3}>
                  Totale pagamenti
                </Typography>
                <Typography variant="h3" color="primary" gutterBottom>
                  €{totalProfessorPayments.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminDashboardPage;