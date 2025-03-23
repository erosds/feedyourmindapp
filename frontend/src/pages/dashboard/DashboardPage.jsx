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
  DialogContentText,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
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
import { lessonService, studentService, packageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AddIcon from '@mui/icons-material/Add';

function DashboardPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentPackages, setStudentPackages] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentTab, setCurrentTab] = useState(0);
  const [periodFilter, setPeriodFilter] = useState('week');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [addLessonDialogOpen, setAddLessonDialogOpen] = useState(false);
  const [dayDetailDialogOpen, setDayDetailDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [studentsMap, setStudentsMap] = useState({});
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  // Stato per il form di aggiunta lezione
  const [lessonForm, setLessonForm] = useState({
    professor_id: currentUser ? currentUser.id : '',
    student_id: '',
    lesson_date: new Date(),
    duration: 1,
    is_package: false,
    package_id: null,
    hourly_rate: '',
  });
  
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
        setStudents(studentsResponse.data);
        
        const studentsMapData = {};
        studentsResponse.data.forEach(student => {
          studentsMapData[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudentsMap(studentsMapData);
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

  // Funzione per gestire il click su un giorno per visualizzare le lezioni
  const handleDayClick = (day) => {
    setSelectedDay(day);
    const dayLessons = getLessonsForDay(day);
    
    if (dayLessons.length > 0) {
      // Se ci sono lezioni, mostriamo un riepilogo
      setDayDetailDialogOpen(true);
    }
  };
  
  // Funzione per gestire il click sul pulsante + per aggiungere una lezione
  const handleAddLessonClick = (day, e) => {
    if (e) e.stopPropagation(); // Impedisce la propagazione al click del giorno
    setSelectedDay(day);
    setLessonForm({
      ...lessonForm,
      professor_id: currentUser.id,
      lesson_date: day,
    });
    setAddLessonDialogOpen(true);
  };

  // Funzione per chiudere il dialog di dettaglio lezione
  const handleCloseDialog = () => {
    setLessonDialogOpen(false);
  };

  // Funzione per chiudere il dialog di aggiunta lezione
  const handleCloseAddLessonDialog = () => {
    setAddLessonDialogOpen(false);
    setSelectedStudent('');
    setStudentPackages([]);
  };

  // Funzione per navigare alla pagina di dettaglio della lezione
  const handleViewLessonDetails = () => {
    setLessonDialogOpen(false);
    navigate(`/lessons/${selectedLesson.id}`);
  };

  // Funzione per gestire il cambio dello studente nel form
  const handleStudentChange = async (studentId) => {
    setSelectedStudent(studentId);
    setLessonForm({
      ...lessonForm,
      student_id: studentId,
      package_id: null,
    });

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

  // Funzione per gestire i cambiamenti nel form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLessonForm({
      ...lessonForm,
      [name]: value,
    });
  };

  // Funzione per gestire il toggle is_package
  const handlePackageToggle = (e) => {
    setLessonForm({
      ...lessonForm,
      is_package: e.target.checked,
      package_id: e.target.checked ? lessonForm.package_id : null,
    });
  };

  // Funzione per inviare il form
  const handleSubmitLesson = async () => {
    try {
      setFormSubmitting(true);
      
      // Formatta la data per l'API
      const formattedValues = {
        ...lessonForm,
        lesson_date: format(lessonForm.lesson_date, 'yyyy-MM-dd'),
      };

      // Crea la lezione
      await lessonService.create(formattedValues);
      
      // Ricarica le lezioni
      const lessonsResponse = await lessonService.getByProfessor(currentUser.id);
      setLessons(lessonsResponse.data);
      
      // Chiudi il dialog
      setAddLessonDialogOpen(false);
      
      // Reset del form
      setLessonForm({
        professor_id: currentUser.id,
        student_id: '',
        lesson_date: new Date(),
        duration: 1,
        is_package: false,
        package_id: null,
        hourly_rate: '',
      });
      
      setSelectedStudent('');
      setStudentPackages([]);
      
    } catch (err) {
      console.error('Error saving lesson:', err);
      alert('Errore durante il salvataggio della lezione. Verifica i dati e riprova.');
    } finally {
      setFormSubmitting(false);
    }
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
                <Button onClick={() => handleChangeWeek('prev')}>Precedente</Button>
                <Button onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                  Corrente
                </Button>
                <Button onClick={() => handleChangeWeek('next')}>Successiva</Button>
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
                        boxSizing: 'border-box',
                        position: 'relative',
                        '&:hover': {
                          borderColor: 'primary.main',
                          cursor: 'pointer'
                        }
                      }}
                      onClick={() => handleDayClick(day)}
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
                              key={`lesson-${lesson.id}`}
                              divider
                              button
                              onClick={(e) => {
                                e.stopPropagation(); // Impedisce al calendario di aprire il dialogo
                                handleLessonClick(lesson);
                                }}
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
                                <ListItemText
                                primary={studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                                secondary={`${lesson.duration} ore`}
                                primaryTypographyProps={{ variant: 'body2', noWrap: true, color: 'text.primary' }}
                                secondaryTypographyProps={{ variant: 'caption', noWrap: true, color: 'text.secondary' }}
                                />
                                {lesson.is_package && (
                                <Chip
                                  label="P"
                                  size="small"
                                  color="primary"
                                  sx={{ 
                                  position: 'absolute', 
                                  bottom: 10, 
                                  right: 12, 
                                  borderRadius: 1, 
                                  width: 'auto', 
                                  height: 18, 
                                  fontSize: '0.725rem' 
                                  }}
                                />
                                )}
                              </ListItem>
                              ))}
                            </List>
                            )}
                            
                            {/* Pulsante di aggiunta rapida */}
                      <IconButton 
                        size="medium" 
                        color="primary"
                        sx={{ 
                          position: 'absolute', 
                          bottom: 5, 
                          right: 5,
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'primary.light' },
                          width: 42,
                          height: 42,
                          boxShadow: 1
                        }}
                        onClick={(e) => handleAddLessonClick(day, e)}
                      >
                        <AddIcon />
                      </IconButton>
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
                  Guadagni settimana in corso
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
                  <ListItemText primary="Studente" secondary={studentsMap[selectedLesson.student_id] || `Studente #${selectedLesson.student_id}`} />
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
      
      {/* Dialog con riepilogo delle lezioni del giorno */}
      <Dialog 
        open={dayDetailDialogOpen} 
        onClose={() => setDayDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedDay && (
          <>
            <DialogTitle>
              Lezioni per {format(selectedDay, "EEEE d MMMM yyyy", { locale: it })}
            </DialogTitle>
            <DialogContent>
              {getLessonsForDay(selectedDay).length > 0 ? (
                <List>
                  {getLessonsForDay(selectedDay).map((lesson) => (
                    <ListItem key={lesson.id} divider>
                      <Box sx={{ width: '100%' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle1" fontWeight="medium">
                            {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                          </Typography>
                          {lesson.is_package && (
                            <Chip
                              label="Pacchetto"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        
                        <Grid container spacing={2} sx={{ mt: 0.5 }}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Durata</Typography>
                            <Typography variant="body1">{lesson.duration} ore</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Tariffa</Typography>
                            <Typography variant="body1">€{parseFloat(lesson.hourly_rate).toFixed(2)}</Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">Totale</Typography>
                            <Typography variant="body1" fontWeight="bold">€{parseFloat(lesson.total_payment).toFixed(2)}</Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                  Nessuna lezione in questo giorno
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDayDetailDialogOpen(false)}>Chiudi</Button>
              <Button 
                onClick={(e) => {
                  setDayDetailDialogOpen(false);
                  handleAddLessonClick(selectedDay, e);
                }} 
                color="primary"
                variant="contained"
                startIcon={<AddIcon />}
              >
                Aggiungi Lezione
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog per aggiungere una lezione */}
      <Dialog
        open={addLessonDialogOpen}
        onClose={handleCloseAddLessonDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Aggiungi Lezione per {selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: it }) : ""}
        </DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            Inserisci i dettagli della lezione
          </DialogContentText>
          
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="student-label">Studente</InputLabel>
                <Select
                  labelId="student-label"
                  name="student_id"
                  value={lessonForm.student_id}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  label="Studente"
                  required
                >
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data lezione"
                value={lessonForm.lesson_date}
                onChange={(date) => setLessonForm({ ...lessonForm, lesson_date: date })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="duration"
                label="Durata (ore)"
                type="number"
                value={lessonForm.duration}
                onChange={handleFormChange}
                inputProps={{
                  min: 0.5,
                  step: 0.5,
                }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="hourly_rate"
                label="Tariffa oraria"
                type="number"
                value={lessonForm.hourly_rate}
                onChange={handleFormChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_package"
                    checked={lessonForm.is_package}
                    onChange={handlePackageToggle}
                  />
                }
                label="Parte di un pacchetto"
              />
            </Grid>

            {lessonForm.is_package && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="package-label">Pacchetto</InputLabel>
                  <Select
                    labelId="package-label"
                    name="package_id"
                    value={lessonForm.package_id || ''}
                    onChange={handleFormChange}
                    label="Pacchetto"
                    disabled={studentPackages.length === 0}
                  >
                    {studentPackages.length === 0 ? (
                      <MenuItem disabled>
                        Nessun pacchetto attivo per questo studente
                      </MenuItem>
                    ) : (
                      studentPackages.map((pkg) => (
                        <MenuItem key={pkg.id} value={pkg.id}>
                          {`Pacchetto #${pkg.id} - ${pkg.remaining_hours} ore rimanenti`}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Totale calcolato automaticamente */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Totale lezione"
                value={`€ ${(lessonForm.duration * lessonForm.hourly_rate).toFixed(2) || '0.00'}`}
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddLessonDialog}>Annulla</Button>
          <Button 
            onClick={handleSubmitLesson} 
            color="primary" 
            variant="contained"
            disabled={
              formSubmitting || 
              !lessonForm.student_id || 
              !lessonForm.hourly_rate || 
              (lessonForm.is_package && !lessonForm.package_id)
            }
          >
            {formSubmitting ? <CircularProgress size={24} /> : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DashboardPage;