// src/pages/lessons/LessonDetailPage.jsx
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
  Paper,
  Tooltip,
  Typography,
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
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { lessonService, studentService, professorService, packageService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function LessonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [student, setStudent] = useState(null);
  const [professor, setProfessor] = useState(null);
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verifica autorizzazioni: gli admin possono vedere tutte le lezioni,
  // i professori standard possono vedere solo le proprie
  const canViewLesson = (lessonData) => {
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
        setError('Impossibile caricare i dati della lezione. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, currentUser, isAdmin]);

  const handleEditLesson = () => {
    navigate(`/lessons/edit/${id}`);
  };

  const handleBackToLessons = () => {
    navigate('/lessons');
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
            <IconButton
              color="primary"
              onClick={handleBackToLessons}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h4">
            Dettagli Lezione #{lesson.id}
          </Typography>
        </Box>

        <Box>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditLesson}
            sx={{ mr: 1 }}
          >
            Modifica
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteLesson}
          >
            Elimina
          </Button>
        </Box>
      </Box>

      {/* Dati principali - Unica card con tutte le informazioni */}
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            {/* Prima sezione: Informazioni Lezione */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary">
                Informazioni Lezione
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {/* Studente */}
                <Box sx={{ minWidth: '200px' }}>
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
                </Box>
                
                {/* Professore */}
                <Box sx={{ minWidth: '200px' }}>
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
                </Box>
                
                {/* Data */}
                <Box sx={{ minWidth: '200px' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CalendarIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Data
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {format(parseISO(lesson.lesson_date), 'EEEE d MMMM yyyy', { locale: it })}
                  </Typography>
                </Box>
                
                {/* Orario */}
                <Box sx={{ minWidth: '120px' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimeIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Orario
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                  </Typography>
                </Box>
                
                {/* Durata */}
                <Box sx={{ minWidth: '120px' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimeIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Durata
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    {lesson.duration} ore
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Divider tra le sezioni */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Seconda sezione: Tipo di lezione e pagamento */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
                Tipo di Lezione e Pagamento
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {/* Tipo di lezione */}
                <Box sx={{ minWidth: '200px' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <PackageIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Tipo di lezione
                    </Typography>
                  </Box>
                  {lesson.is_package ? (
                    <Chip
                      label={`Pacchetto #${lesson.package_id}`}
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Lezione singola"
                      variant="outlined"
                    />
                  )}
                </Box>
                
                {/* Tariffa oraria */}
                <Box sx={{ minWidth: '140px' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <EuroIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Tariffa oraria
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="medium">
                    €{parseFloat(lesson.hourly_rate).toFixed(2)}
                  </Typography>
                </Box>
                
                {/* Totale lezione */}
                <Box sx={{ minWidth: '140px' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <EuroIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Totale lezione
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="bold" color="primary">
                    €{parseFloat(lesson.total_payment).toFixed(2)}
                  </Typography>
                </Box>
                
                {/* Stato pagamento (solo per lezioni singole) */}
                {!lesson.is_package && (
                  <Box sx={{ minWidth: '150px' }}>
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
                  </Box>
                )}
                
                {/* Data pagamento (solo per lezioni singole pagate) */}
                {!lesson.is_package && lesson.is_paid && lesson.payment_date && (
                  <Box sx={{ minWidth: '200px' }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <CalendarIcon sx={{ mr: 1 }} color="primary" />
                      <Typography variant="body2" color="text.secondary">
                        Data pagamento
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="medium">
                      {format(parseISO(lesson.payment_date), 'dd/MM/yyyy', { locale: it })}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Informazioni sul pacchetto se applicabile */}
            {lesson.is_package && packageData && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom color="primary">
                    Dettagli Pacchetto
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Ore totali pacchetto
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {packageData.total_hours}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Ore rimanenti
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary" gutterBottom>
                    {packageData.remaining_hours}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Stato pacchetto
                  </Typography>
                  <Chip
                    label={packageData.status === 'in_progress' ? 'In corso' : 'Terminato'}
                    color={packageData.status === 'in_progress' ? 'primary' : 'default'}
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Costo totale pacchetto
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    €{parseFloat(packageData.package_cost).toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    component={Link}
                    to={`/packages/${packageData.id}`}
                    color="primary"
                    variant="outlined"
                    startIcon={<PackageIcon />}
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    Vai al pacchetto
                  </Button>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

export default LessonDetailPage;