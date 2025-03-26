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
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format, parseISO, getYear, getMonth, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { packageService, studentService, lessonService, professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PackageStatusCard from '../../components/packages/PackageStatusCard';

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

  // Funzione per calcolare le ore utilizzate e rimanenti del pacchetto
  const calculatePackageStats = (packageData, packageLessons) => {
    if (!packageData || !packageLessons) return { usedHours: 0, remainingHours: 0, completionPercentage: 0 };

    // Calcola ore utilizzate dalle lezioni
    const usedHours = packageLessons.reduce((total, lesson) => total + parseFloat(lesson.duration), 0);

    // Calcola ore rimanenti o accumulate in base al tipo di pacchetto
    let remainingHours, completionPercentage;

    if (packageData.package_type === 'fixed') {
      // Per pacchetti fissi, le ore rimanenti sono la differenza tra totale e utilizzate
      remainingHours = parseFloat(packageData.total_hours) - usedHours;
      // La percentuale completata è data dalle ore utilizzate sul totale
      completionPercentage = (usedHours / parseFloat(packageData.total_hours)) * 100;
    } else {
      // Per pacchetti aperti, le ore "rimanenti" sono in realtà le ore accumulate
      remainingHours = usedHours;
      // Per un pacchetto aperto, la percentuale è sempre 100% delle ore accumulate
      completionPercentage = 100;
    }

    return {
      usedHours,
      remainingHours,
      completionPercentage
    };
  };

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
          lesson => lesson.package_id === parseInt(id) && lesson.is_package
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

  const handleDeletePackage = async () => {
    try {
      let confirmMessage = `Sei sicuro di voler eliminare il pacchetto #${id}?`;

      // Se ci sono lezioni associate, avvisa l'utente che verranno eliminate anche quelle
      if (lessons.length > 0) {
        confirmMessage += `\n\nATTENZIONE: Questo pacchetto contiene ${lessons.length} lezioni che verranno eliminate:`;

        // Aggiungi informazioni sulle prime 5 lezioni
        const maxLessonsToShow = 5;
        lessons.slice(0, maxLessonsToShow).forEach(lesson => {
          const lessonDate = format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it });
          confirmMessage += `\n- Lezione #${lesson.id} del ${lessonDate} (${lesson.duration} ore)`;
        });

        // Se ci sono più di 5 lezioni, indica che ce ne sono altre
        if (lessons.length > maxLessonsToShow) {
          confirmMessage += `\n...e altre ${lessons.length - maxLessonsToShow} lezioni`;
        }
      }

      confirmMessage += "\n\nQuesta azione non può essere annullata.";

      if (window.confirm(confirmMessage)) {
        const response = await packageService.delete(id);

        // Mostra messaggio di conferma con dettagli sulle lezioni eliminate
        if (response.data && response.data.deleted_lessons_count > 0) {
          alert(`Pacchetto #${id} eliminato con successo insieme a ${response.data.deleted_lessons_count} lezioni associate.`);
        }

        // Naviga alla lista pacchetti
        navigate('/packages');
      }
    } catch (err) {
      console.error('Error deleting package:', err);
      alert('Errore durante l\'eliminazione del pacchetto. Riprova più tardi.');
    }
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

    // Organizza le lezioni per giorno con dettagli per insegnante
    const lessonsByDay = {};

    lessons.forEach(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      const dateKey = format(lessonDate, 'yyyy-MM-dd');

      if (!lessonsByDay[dateKey]) {
        lessonsByDay[dateKey] = [];
      }

      // Aggiungi questa lezione all'array del giorno
      lessonsByDay[dateKey].push({
        professorId: lesson.professor_id,
        professorName: professors[lesson.professor_id] || `Prof. #${lesson.professor_id}`,
        duration: parseFloat(lesson.duration)
      });
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
            <Grid item xs={12 / 7} key={`weekday-${index}`}>
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
              return <Grid item xs={12 / 7} key={`day-${index}`} />;
            }

            // Controlla se questo giorno ha lezioni
            const dateKey = format(new Date(year, month, day), 'yyyy-MM-dd');
            const hasLesson = lessonsByDay[dateKey] && lessonsByDay[dateKey].length > 0;
            const dayLessons = hasLesson ? lessonsByDay[dateKey] : [];

            return (
              <Grid item xs={12 / 7} key={`day-${index}`}>
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
                      cursor: 'default',
                      transition: 'all 0.3s ease',
                      '&:hover': hasLesson ? {
                        '& .lessons-tooltip': {
                          opacity: 1,
                          top: -5 - (dayLessons.length * 20),
                          visibility: 'visible'
                        }
                      } : {},
                    }}
                  >
                    {day}
                    {hasLesson && (
                      <Box
                        className="lessons-tooltip"
                        sx={{
                          position: 'absolute',
                          top: -15,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: 1.5,
                          px: 1.5,
                          py: 0.8,
                          fontSize: '0.75rem',
                          opacity: 0,
                          visibility: 'hidden',
                          transition: 'all 0.3s ease',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          boxShadow: 2,
                          minWidth: 130
                        }}
                      >
                        {dayLessons.map((lesson, i) => {
                          // Prendiamo nome e iniziale del cognome
                          const nameParts = lesson.professorName.split(' ');
                          const name = nameParts[0];
                          const surnameInitial = nameParts.length > 1 ? nameParts[1].charAt(0) + '.' : '';

                          return (
                            <Box key={i} sx={{
                              textAlign: 'left',
                              py: 0.2,
                              borderBottom: i < dayLessons.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                            }}>
                              {lesson.duration} {lesson.duration === 1 ? 'ora' : 'ore'} con {name} {surnameInitial}
                            </Box>
                          );
                        })}
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

  // Calcola statistiche del pacchetto in tempo reale
  const { usedHours, remainingHours, completionPercentage } = calculatePackageStats(packageData, lessons);

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
          {packageData.status === 'in_progress' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddLessonIcon />}
              onClick={handleAddLesson}
              sx={{ mr: 1 }}
            >
              Aggiungi Lezione
            </Button>
          )}
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditPackage}
            sx={{ mr: 1 }}
          >
            Modifica
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeletePackage}
          >
            Elimina
          </Button>
        </Box>
      </Box>

      {/* Dati principali */}
      <Grid container spacing={3}>
        {/* Intestazione con informazioni di base del pacchetto */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informazioni Pacchetto
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Colonna Sinistra */}
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Studente
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    <Link to={`/students/${student.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {student.first_name} {student.last_name}
                    </Link>
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo di pacchetto
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {packageData.package_type === 'fixed' ? 'Pacchetto 4 settimane' : 'Pacchetto aperto'}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Stato pacchetto
                  </Typography>
                  <Chip
                    label={packageData.status === 'in_progress' ? 'In corso' : 'Terminato'}
                    color={packageData.status === 'in_progress' ? 'primary' : 'default'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>

                {/* Date e orari */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data inizio
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {format(parseISO(packageData.start_date), 'dd MMMM yyyy', { locale: it })}
                  </Typography>
                </Grid>

                {/* Mostra la data di scadenza solo per pacchetti a durata fissa */}
                {packageData.package_type === 'fixed' && packageData.expiry_date && (
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Data di scadenza
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" color="error" gutterBottom>
                      {format(parseISO(packageData.expiry_date), 'dd MMMM yyyy', { locale: it })}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data pagamento
                  </Typography>
                  {packageData.is_paid && packageData.payment_date ? (
                    <Typography variant="body1" fontWeight="medium" color="success.main">
                      {format(parseISO(packageData.payment_date), 'dd MMMM yyyy', { locale: it })}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Non inserita
                    </Typography>
                  )}
                </Grid>

                {/* Dettagli economici */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Costo totale
                  </Typography>
                  <Typography variant="h6" color="text.primary">
                    €{parseFloat(packageData.package_cost).toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Stato pagamento
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

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    {packageData.package_type === 'fixed' ? "Ore totali" : "Ore accumulate"}
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    {packageData.total_hours}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    {packageData.package_type === 'fixed' ? "Ore rimanenti" : packageData.is_paid ? "Ore fissate al pagamento" : "Stato"}
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={packageData.package_type === 'fixed' ?
                      (remainingHours > 0 ? 'primary.main' : 'error') :
                      'success.main'
                    }
                  >
                    {packageData.package_type === 'fixed' ?
                      remainingHours.toFixed(1) :
                      packageData.is_paid ?
                        packageData.total_hours :
                        "In registrazione"
                    }
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Ore utilizzate
                  </Typography>
                  <Typography variant="h6" fontWeight="medium">
                    {usedHours.toFixed(1)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sx={{ mt: 5 }}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body1">
                      {packageData.package_type === 'fixed' ?
                        "Completamento pacchetto:" :
                        packageData.is_paid ? "Stato pagamento:" : "Accumulo ore:"}
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {packageData.package_type === 'fixed' ?
                        `${completionPercentage.toFixed(0)}%` :
                        packageData.is_paid ? "Completato" : "In corso"}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant={packageData.package_type === 'open' && !packageData.is_paid ? "indeterminate" : "determinate"}
                    value={packageData.package_type === 'fixed' ?
                      completionPercentage :
                      packageData.is_paid ? 100 : 50}
                    color={packageData.status === 'completed' || packageData.is_paid ? 'success' : 'primary'}
                    sx={{
                      height: 15,
                      borderRadius: 1,
                      backgroundImage: packageData.package_type === 'fixed' ?
                        `repeating-linear-gradient(
          to right,
          transparent,
          transparent 24.5%,
          #fff 24.5%,
          #fff 25%,
          transparent 25%,
          transparent 49.5%,
          #fff 49.5%,
          #fff 50%,
          transparent 50%,
          transparent 74.5%,
          #fff 74.5%,
          #fff 75%,
          transparent 75%
        )` : 'none'
                    }}
                  />
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
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <EventIcon color="primary" fontSize="large" />
                    <Typography variant="h5" fontWeight="medium">{lessons.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lezioni registrate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <AccessTimeIcon color="primary" fontSize="large" />
                    <Typography variant="h5" fontWeight="medium">{usedHours.toFixed(1)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ore effettuate
                    </Typography>
                  </Box>
                </Grid>

                {/* Calendario lezioni in miniatura */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Calendario Lezioni
                  </Typography>

                  {lessons.length === 0 ? (
                    <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                      Nessuna lezione registrata
                    </Typography>
                  ) : (
                    generateCalendar()
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Tabella Lezioni */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Lezioni associate al pacchetto
              </Typography>
              {packageData.status === 'in_progress' && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddLessonIcon />}
                  onClick={handleAddLesson}
                  size="small"
                >
                  Aggiungi Lezione
                </Button>
              )}
            </Box>

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
      </Grid>
    </Box>
  );
}

export default PackageDetailPage;