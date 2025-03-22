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

      {/* Dati principali */}
      <Grid container spacing={3}>
        {/* Informazioni lezione */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informazioni Lezione
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CalendarIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Data della lezione
                    </Typography>
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    {format(parseISO(lesson.lesson_date), 'EEEE d MMMM yyyy', { locale: it })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TimeIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Durata
                    </Typography>
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    {lesson.duration} ore
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <StudentIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Studente
                    </Typography>
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    <Link to={`/students/${student.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {student.first_name} {student.last_name}
                    </Link>
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ProfessorIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Professore
                    </Typography>
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    <Link to={`/professors/${professor.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {professor.first_name} {professor.last_name}
                    </Link>
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <EuroIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Tariffa oraria
                    </Typography>
                  </Box>
                  <Typography variant="body1" gutterBottom>
                    €{parseFloat(lesson.hourly_rate).toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <EuroIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Totale lezione
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary" gutterBottom>
                    €{parseFloat(lesson.total_payment).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Informazioni sul pacchetto (se applicabile) */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tipo di Lezione
              </Typography>
              <Box sx={{ mt: 2 }}>
                {lesson.is_package ? (
                  <>
                    <Box display="flex" alignItems="center" mb={2}>
                      <PackageIcon sx={{ mr: 1 }} color="primary" />
                      <Typography variant="body1">
                        Questa lezione fa parte di un pacchetto
                      </Typography>
                    </Box>
                    {packageData && (
                      <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>
                              Dettagli Pacchetto #{packageData.id}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Ore totali
                            </Typography>
                            <Typography variant="body1">
                              {packageData.total_hours}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Ore rimanenti
                            </Typography>
                            <Typography variant="body1" color="primary">
                              {packageData.remaining_hours}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Stato
                            </Typography>
                            <Chip
                              label={packageData.status === 'in_progress' ? 'In corso' : 'Terminato'}
                              color={packageData.status === 'in_progress' ? 'primary' : 'default'}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">
                              Costo totale
                            </Typography>
                            <Typography variant="body1">
                              €{parseFloat(packageData.package_cost).toFixed(2)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Button
                              component={Link}
                              to={`/packages/${packageData.id}`}
                              size="small"
                              color="primary"
                              sx={{ mt: 1 }}
                            >
                              Vai al pacchetto
                            </Button>
                          </Grid>
                        </Grid>
                      </Paper>
                    )}
                  </>
                ) : (
                  <Box display="flex" alignItems="center" mb={2}>
                    <CalendarIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="body1">
                      Questa è una lezione singola (non fa parte di un pacchetto)
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default LessonDetailPage;