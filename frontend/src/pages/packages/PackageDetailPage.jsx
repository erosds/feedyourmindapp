// src/pages/packages/PackageDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AddTask as AddLessonIcon,
} from '@mui/icons-material';
import { format, parseISO, getYear, getMonth, getDaysInMonth, startOfMonth, getDay, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { packageService, studentService, lessonService, professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function PackageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [packageData, setPackageData] = useState(null);
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [professors, setProfessors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Carica i dati del pacchetto
        const packageResponse = await packageService.getById(id);
        setPackageData(packageResponse.data);
        
        // Carica i dati dello studente
        const studentResponse = await studentService.getById(packageResponse.data.student_id);
        setStudent(studentResponse.data);
        
        // Carica le lezioni relative al pacchetto
        const lessonsResponse = await lessonService.getAll();
        const packageLessons = lessonsResponse.data.filter(
          lesson => lesson.package_id === parseInt(id)
        );
        setLessons(packageLessons);
        
        // Inizializza il mese corrente al mese della prima lezione o oggi se non ci sono lezioni
        if (packageLessons.length > 0) {
          setCurrentMonth(parseISO(packageLessons[0].lesson_date));
        }
        
        // Carica tutti i professori e crea un dizionario per nome/cognome
        const professorsResponse = await professorService.getAll();
        const professorsMap = {};
        professorsResponse.data.forEach(professor => {
          professorsMap[professor.id] = `${professor.first_name} ${professor.last_name}`;
        });
        setProfessors(professorsMap);
      } catch (err) {
        console.error('Error fetching package data:', err);
        setError('Impossibile caricare i dati del pacchetto. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditPackage = () => {
    navigate(`/packages/edit/${id}`);
  };

  const handleBackToPackages = () => {
    navigate('/packages');
  };

  const handleAddLesson = () => {
    navigate('/lessons/new', { 
      state: { 
        student_id: packageData?.student_id, 
        package_id: packageData?.id,
        is_package: true 
      } 
    });
  };

  // Funzione per cambiare il mese visualizzato
  const changeMonth = (offset) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  // Funzione per generare il calendario
  const generateCalendar = () => {
    const year = getYear(currentMonth);
    const month = getMonth(currentMonth);
    const daysInMonth = getDaysInMonth(new Date(year, month));
    const firstDayOfMonth = getDay(startOfMonth(new Date(year, month)));
    
    // Nomi giorni della settimana (abbreviati)
    const weekdays = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];
    
    // Adatta i giorni della settimana per iniziare da lunedì (0 = lunedì)
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    // Crea array con tutti i giorni del mese
    let days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    // Aggiungi giorni vuoti all'inizio per allineare il calendario
    const emptyDays = Array(adjustedFirstDay).fill(null);
    days = [...emptyDays, ...days];
    
    // Calcola le ore totali di lezione per ogni giorno
    const lessonHoursByDay = {};
    
    lessons.forEach(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      const dateKey = format(lessonDate, 'yyyy-MM-dd');
      
      if (!lessonHoursByDay[dateKey]) {
        lessonHoursByDay[dateKey] = 0;
      }
      
      lessonHoursByDay[dateKey] += parseFloat(lesson.duration);
    });
    
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <IconButton size="small" onClick={() => changeMonth(-1)}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle1" align="center">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </Typography>
          <IconButton size="small" onClick={() => changeMonth(1)}>
            <ArrowBackIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
          </IconButton>
        </Box>
        
        <Grid container spacing={0.5}>
          {/* Intestazione giorni della settimana */}
          {weekdays.map((day, index) => (
            <Grid item xs={12/7} key={`weekday-${index}`}>
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  p: 0.5,
                  fontSize: '0.75rem',
                }}
              >
                {day}
              </Box>
            </Grid>
          ))}
          
          {/* Giorni del mese */}
          {days.map((day, index) => {
            if (!day) {
              // Cella vuota per i giorni prima dell'inizio del mese
              return <Grid item xs={12/7} key={`day-${index}`} />;
            }
            
            // Controlla se questo giorno ha lezioni
            const dateKey = format(new Date(year, month, day), 'yyyy-MM-dd');
            const hasLesson = lessonHoursByDay[dateKey] > 0;
            const totalHours = hasLesson ? lessonHoursByDay[dateKey] : 0;
            
            return (
              <Grid item xs={12/7} key={`day-${index}`}>
                <Box sx={{ 
                  position: 'relative', 
                  height: 38, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                }}>
                  <Box 
                    sx={{ 
                      position: 'relative',
                      textAlign: 'center',
                      borderRadius: '50%',
                      height: 32,
                      width: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: hasLesson ? 'primary.main' : 'transparent',
                      color: hasLesson ? 'primary.contrastText' : 'text.primary',
                      fontWeight: hasLesson ? 'bold' : 'normal',
                      cursor: hasLesson ? 'default' : 'default',
                      transition: 'all 0.3s ease',
                      '&:hover': hasLesson ? {
                        height: 38,
                        width: 38,
                        '& .hour-info': {
                          opacity: 1,
                          top: -18,
                        }
                      } : {},
                    }}
                  >
                    {day}
                    {hasLesson && (
                      <Box 
                        className="hour-info"
                        sx={{ 
                          position: 'absolute', 
                          top: -15, 
                          left: '50%',
                          transform: 'translateX(-50%)',
                          bgcolor: 'secondary.main',
                          color: 'secondary.contrastText',
                          borderRadius: 1,
                          px: 1,
                          py: 0.2,
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          opacity: 0,
                          transition: 'all 0.3s ease',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                        }}
                      >
                        {totalHours} {totalHours === 1 ? 'ora' : 'ore'}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

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

  if (!packageData || !student) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>Pacchetto non trovato</Typography>
      </Box>
    );
  }

  // Calcola la percentuale di completamento del pacchetto
  const completionPercentage = ((packageData.total_hours - packageData.remaining_hours) / packageData.total_hours) * 100;
  
  // Calcola statistiche
  const totalLessons = lessons.length;
  const totalHoursDone = packageData.total_hours - packageData.remaining_hours;

  return (
    <Box>
      {/* Header con azioni */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Tooltip title="Torna alla lista">
            <IconButton 
              color="primary" 
              onClick={handleBackToPackages}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h4">
            Dettagli Pacchetto #{packageData.id}
          </Typography>
        </Box>
        
        <Box>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditPackage}
            sx={{ mr: 1 }}
          >
            Modifica
          </Button>
          {packageData.status === 'in_progress' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddLessonIcon />}
              onClick={handleAddLesson}
            >
              Aggiungi Lezione
            </Button>
          )}
        </Box>
      </Box>

      {/* Dati principali */}
      <Grid container spacing={3}>
        {/* Informazioni pacchetto */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informazioni Pacchetto
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Studente
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <Link to={`/students/${student.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {student.first_name} {student.last_name}
                    </Link>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data inizio
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {format(parseISO(packageData.start_date), 'dd/MM/yyyy', { locale: it })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Stato
                  </Typography>
                  <Chip
                    label={packageData.status === 'in_progress' ? 'In corso' : 'Terminato'}
                    color={packageData.status === 'in_progress' ? 'primary' : 'default'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Ore totali
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {packageData.total_hours}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Ore rimanenti
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color={packageData.remaining_hours > 0 ? 'primary' : 'text.primary'}
                    gutterBottom
                  >
                    {packageData.remaining_hours}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Pagamento
                  </Typography>
                  <Chip
                    icon={packageData.is_paid ? <CheckIcon /> : <CancelIcon />}
                    label={packageData.is_paid ? 'Pagato' : 'Non pagato'}
                    color={packageData.is_paid ? 'success' : 'error'}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Costo totale
                  </Typography>
                  <Typography variant="h6" color="text.primary">
                    €{parseFloat(packageData.package_cost).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistiche */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistiche
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <EventIcon color="primary" fontSize="large" />
                    <Typography variant="h6">{totalLessons}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lezioni registrate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <AccessTimeIcon color="primary" fontSize="large" />
                    <Typography variant="h6">{totalHoursDone.toFixed(1)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ore effettuate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Completamento: {completionPercentage.toFixed(0)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={completionPercentage} 
                    color={packageData.status === 'completed' ? 'success' : 'primary'}
                    sx={{ height: 10, borderRadius: 1 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Lezioni (riposizionato sotto Informazioni Pacchetto) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Lezioni
            </Typography>
            
            {lessons.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Nessuna lezione registrata per questo pacchetto
              </Typography>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Data</TableCell>
                        <TableCell>Professore</TableCell>
                        <TableCell>Durata (ore)</TableCell>
                        <TableCell>Tariffa oraria</TableCell>
                        <TableCell align="right">Totale</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lessons
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((lesson) => (
                          <TableRow 
                            key={lesson.id}
                            component={Link}
                            to={`/lessons/${lesson.id}`}
                            sx={{ 
                              textDecoration: 'none',
                              '&:hover': { bgcolor: 'action.hover' },
                              cursor: 'pointer',
                            }}
                          >
                            <TableCell>#{lesson.id}</TableCell>
                            <TableCell>
                              {format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it })}
                            </TableCell>
                            <TableCell>
                              {professors[lesson.professor_id] || `Prof. #${lesson.professor_id}`}
                            </TableCell>
                            <TableCell>{lesson.duration}</TableCell>
                            <TableCell>€{parseFloat(lesson.hourly_rate).toFixed(2)}</TableCell>
                            <TableCell align="right">€{parseFloat(lesson.total_payment).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={lessons.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="Righe per pagina:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
                />
              </>
            )}
          </Paper>
        </Grid>

        {/* Calendario lezioni (nuovo componente) */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Calendario Lezioni
            </Typography>
            
            {lessons.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Nessuna lezione registrata per questo pacchetto
              </Typography>
            ) : (
              generateCalendar()
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PackageDetailPage;