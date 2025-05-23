// src/pages/lessons/LessonDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
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
  Tooltip,
  TextField,
  Typography,
  InputAdornment
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Person as StudentIcon,
  School as ProfessorIcon,
  Euro as EuroIcon,
  EventNote as PackageIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { lessonService, studentService, professorService, packageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import WifiIcon from '@mui/icons-material/Wifi';
import VideocamIcon from '@mui/icons-material/Videocam';

function LessonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAdmin } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [student, setStudent] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(0);

  // Verifica autorizzazioni: gli admin possono vedere tutte le lezioni,
  // i professori standard possono vedere solo le proprie
  const canViewLesson = () => {
    // Tutti possono vedere le lezioni, quindi sempre true
    return true;
  };

  // Aggiungi questa nuova funzione per verificare i permessi di modifica
  const canModifyLesson = (lessonData) => {
    if (isAdmin()) return true;
    return currentUser && currentUser.id === lessonData.professor_id;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Carica i dati della lezione
        const lessonResponse = await lessonService.getById(id);
        const lessonData = lessonResponse.data;

        // Verifica autorizzazioni
        if (!canViewLesson(lessonData)) {
          navigate('/dashboard');
          return;
        }

        setLesson(lessonData);

        // Carica i dati dello studente
        const studentResponse = await studentService.getById(lessonData.student_id);
        setStudent(studentResponse.data);

        // Carica i dati del professore
        const professorResponse = await professorService.getById(lessonData.professor_id);
        setProfessor(professorResponse.data);

        // Se la lezione fa parte di un pacchetto, carica i dati del pacchetto
        if (lessonData.is_package && lessonData.package_id) {
          const packageResponse = await packageService.getById(lessonData.package_id);
          setPackageData(packageResponse.data);
        }
      } catch (err) {
        console.error('Error fetching lesson data:', err);
        setError('Impossibile caricare i dati della lezione. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, currentUser, isAdmin]);

  const handleEditLesson = () => {
    navigate(`/lessons/edit/${id}`);
  };

  const handleEditPrice = () => {
    setPriceValue(parseFloat(lesson.price || 0));
    setIsEditingPrice(true);
  };

  const handleSavePrice = async () => {
    try {
      await lessonService.update(id, { price: priceValue });
      // Reload lesson data
      const response = await lessonService.getById(id);
      setLesson(response.data);
      setIsEditingPrice(false);
    } catch (err) {
      console.error('Error updating price:', err);
      alert('Errore durante l\'aggiornamento del prezzo. Riprova più tardi.');
    }
  };

  const handleBackToLessons = () => {
    // Se c'è un URL di ritorno, usalo
    if (location.state?.returnUrl) {
      navigate(location.state.returnUrl);
    } else {
      // Fallback al comportamento precedente
      navigate('/lessons');
    }
  };

  const handleDeleteLesson = async () => {
    if (window.confirm('Sei sicuro di voler eliminare questa lezione? Questa azione non può essere annullata.')) {
      try {
        await lessonService.delete(id);
        navigate('/lessons');
      } catch (err) {
        console.error('Error deleting lesson:', err);
        alert('Errore durante l\'eliminazione della lezione. Riprova più tardi.');
      }
    }
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

  if (!lesson || !student || !professor) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>Lezione non trovata</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header con azioni */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Tooltip title="Torna alla lista">
            <IconButton color="primary" onClick={handleBackToLessons} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h4">
            Dettagli Lezione #{lesson.id}
          </Typography>
        </Box>

        {canModifyLesson(lesson) && (
          <Box>
            <Button variant="outlined" color="secondary" startIcon={<EditIcon />} onClick={handleEditLesson} sx={{ mr: 1 }}>
              Modifica
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteLesson}>
              Elimina
            </Button>
          </Box>
        )}
      </Box>

      {/* Card principale con informazioni organizzate in Grid */}
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            {/* Sezione Informazioni Lezione */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Informazioni Lezione
              </Typography>
            </Grid>

            {/* Studente */}
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" mb={1}>
                <StudentIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Studente
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="medium">
                <Link to={`/students/${student.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {student.first_name} {student.last_name}
                </Link>
              </Typography>
            </Grid>

            {/* Professore */}
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" mb={1}>
                <ProfessorIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Professore
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="medium">
                <Link to={`/professors/${professor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {professor.first_name} {professor.last_name}
                </Link>
              </Typography>
            </Grid>

            {/* Data */}
            <Grid item xs={12} md={2.5}>
              <Box display="flex" alignItems="center" mb={1}>
                <CalendarIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Data
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="medium">
                {format(parseISO(lesson.lesson_date), 'EEEE d MMMM yyyy', { locale: it })}
              </Typography>
            </Grid>

            {/* Orario */}
            <Grid item xs={12} md={1.5}>
              <Box display="flex" alignItems="center" mb={1}>
                <TimeIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Orario
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="medium">
                {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
              </Typography>
            </Grid>

            {/* Durata */}
            <Grid item xs={12} md={2}>
              <Box display="flex" alignItems="center" mb={1}>
                <TimeIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Durata
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="medium">
                {lesson.duration} ore
              </Typography>
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Sezione Tipo di Lezione e Pagamento */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Tipo di Lezione e Pagamento
              </Typography>
            </Grid>

            {/* Tipo di lezione */}
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" mb={1}>
                <PackageIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Tipo di lezione
                </Typography>
              </Box>
              {lesson.is_package ? (
                <Chip
                  component={Link}
                  to={`/packages/${packageData.id}`}
                  label={`Pacchetto #${lesson.package_id}`}
                  color="primary"
                  variant="outlined"
                  clickable
                  sx={{ cursor: 'pointer' }}
                />
              ) : (
                <Chip label="Lezione singola" variant="outlined" />
              )}
            </Grid>

            {/* Informazioni pacchetto (solo se è lezione da pacchetto) */}
            {lesson.is_package && packageData ? (
              <>
                {/* Stato pacchetto */}
                <Grid item xs={12} md={3}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimerIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Stato pacchetto
                    </Typography>
                  </Box>
                  <Chip
                    label={packageData.status === 'in_progress' ? 'In corso' : packageData.status === 'expired' ? 'Scaduto' : 'Completato'}
                    color={packageData.status === 'in_progress' ? 'primary' : packageData.status === 'expired' ? 'error' : 'default'}
                    size="small"
                  />
                </Grid>

                {/* Costo totale (solo admin) */}
                {isAdmin() && (
                  <Grid item xs={12} md={2.5}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <EuroIcon sx={{ mr: 1 }} color="primary" />
                      <Typography variant="body2" color="text.secondary">
                        Costo pacchetto
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      €{parseFloat(packageData.package_cost).toFixed(2)}
                    </Typography>
                  </Grid>
                )}

                {/* Ore totali */}
                <Grid item xs={12} md={1.5}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimeIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Ore totali
                    </Typography>
                  </Box>
                  <Typography variant="body1">
                    {packageData.total_hours}
                  </Typography>
                </Grid>

                {/* Ore rimanenti */}
                <Grid item xs={12} md={2}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimeIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Ore rimanenti
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    {packageData.remaining_hours}
                  </Typography>
                </Grid>
              </>
            ) : (
              <>
                {/* Stato pagamento (solo per lezioni singole) */}
                <Grid item xs={12} md={3}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <EuroIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Stato pagamento
                    </Typography>
                  </Box>
                  <Chip
                    icon={lesson.is_paid ? <CheckIcon /> : <CancelIcon />}
                    label={lesson.is_paid ? 'Pagata' : 'Non pagata'}
                    color={lesson.is_paid ? 'success' : 'error'}
                    variant="outlined"
                  />
                </Grid>

                {/* Data pagamento (solo per lezioni singole pagate) */}
                {lesson.is_paid && lesson.payment_date && (
                  <Grid item xs={12} md={2.5}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CalendarIcon sx={{ mr: 1 }} color="primary" />
                      <Typography variant="body2" color="text.secondary">
                        Data pagamento
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="medium">
                      {format(parseISO(lesson.payment_date), 'EEEE dd/MM/yyyy', { locale: it })}
                    </Typography>
                  </Grid>
                )}

                {/* Prezzo studente (solo per admin) */}
                {isAdmin() && (
                  <Grid item xs={12} md={3}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <EuroIcon sx={{ mr: 1 }} color="primary" />
                      <Typography variant="body2" color="text.secondary">
                        Prezzo studente
                      </Typography>
                    </Box>

                    {isEditingPrice ? (
                      <Box display="flex" alignItems="center">
                        <TextField
                          size="small"
                          type="number"
                          value={priceValue}
                          onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                            inputProps: { min: 0, step: 0.5 }
                          }}
                          sx={{ width: '120px', mr: 1 }}
                        />
                        <Button size="small" variant="contained" onClick={handleSavePrice}>
                          Salva
                        </Button>
                        <Button size="small" onClick={() => setIsEditingPrice(false)} sx={{ ml: 1 }}>
                          Annulla
                        </Button>
                      </Box>
                    ) : (
                      <Box display="flex" alignItems="center">
                        <Typography
                          variant="body1"
                          fontWeight="medium"
                          color={parseFloat(lesson.price) === 0 ? "error.main" : "inherit"}
                        >
                          €{parseFloat(lesson.price || 0).toFixed(2)}
                          {parseFloat(lesson.price) === 0 && (
                            <Typography variant="caption" color="error" sx={{ display: 'inline', ml: 1 }}>
                              (da impostare)
                            </Typography>
                          )}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={handleEditPrice}
                          sx={{ ml: 2 }}
                        >
                          Modifica
                        </Button>
                      </Box>
                    )}
                  </Grid>
                )}
              </>
            )}

            {/* Divider */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Sezione Tipo di Lezione e Pagamento */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Compenso Professore
              </Typography>
            </Grid>

            {/* Compenso orario */}
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" mb={1}>
                <EuroIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Compenso orario
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="medium">
                €{parseFloat(lesson.hourly_rate).toFixed(2)}
              </Typography>
            </Grid>

            {/* Totale lezione */}
            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" mb={1}>
                <EuroIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Totale
                </Typography>
              </Box>
              <Typography variant="body1" fontWeight="bold" color="primary">
                €{parseFloat(lesson.total_payment).toFixed(2)}
              </Typography>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box display="flex" alignItems="center" mb={1}>
                <VideocamIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="body2" color="text.secondary">
                  Modalità
                </Typography>
              </Box>
              <Chip
                icon={lesson.is_online ? <WifiIcon /> : null}
                label={lesson.is_online ? "Online" : "In presenza"}
                color={lesson.is_online ? "info" : "default"}
                variant="outlined"
                size="small"
              />
            </Grid>

          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

export default LessonDetailPage;