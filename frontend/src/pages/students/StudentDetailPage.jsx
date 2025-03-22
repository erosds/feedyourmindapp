// src/pages/students/StudentDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Avatar,
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
  Stack,
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
  Person as PersonIcon,
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  AddCircleOutline as AddPackageIcon,
  AddTask as AddLessonIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { studentService, packageService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [student, setStudent] = useState(null);
  const [packages, setPackages] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessonsPage, setLessonsPage] = useState(0);
  const [packagesPage, setPackagesPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Carica i dati dello studente
        const studentResponse = await studentService.getById(id);
        setStudent(studentResponse.data);

        // Carica i pacchetti dello studente
        const packagesResponse = await packageService.getByStudent(id);
        setPackages(packagesResponse.data);

        // Carica le lezioni dello studente
        const lessonsResponse = await lessonService.getByStudent(id);
        setLessons(lessonsResponse.data);
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Impossibile caricare i dati dello studente. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleLessonsPageChange = (event, newPage) => {
    setLessonsPage(newPage);
  };

  const handlePackagesPageChange = (event, newPage) => {
    setPackagesPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setLessonsPage(0);
    setPackagesPage(0);
  };

  const handleEditStudent = () => {
    navigate(`/students/edit/${id}`);
  };

  const handleBackToStudents = () => {
    navigate('/students');
  };

  const handleAddPackage = () => {
    navigate('/packages/new', { state: { student_id: id } });
  };

  const handleAddLesson = () => {
    navigate('/lessons/new', { state: { student_id: id } });
  };

  const handleDeleteStudent = async () => {
    if (window.confirm('Sei sicuro di voler eliminare questo studente? Questa azione non può essere annullata e rimuoverà anche tutti i pacchetti e le lezioni associate.')) {
      try {
        await studentService.delete(id);
        navigate('/students');
      } catch (err) {
        console.error('Error deleting student:', err);
        alert('Errore durante l\'eliminazione dello studente. Riprova più tardi.');
      }
    }
  };

  // Funzione per formattare la data di nascita, gestendo il caso null
  const formatBirthDate = (birthDate) => {
    if (!birthDate) return 'Non specificata';
    
    try {
      // Verifica se la data è una stringa "1970-01-01" (timestamp Unix 0)
      if (birthDate === '1970-01-01') return 'Non specificata';
      
      return format(parseISO(birthDate), 'dd/MM/yyyy', { locale: it });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data non valida';
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

  if (!student) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>Studente non trovato</Typography>
      </Box>
    );
  }

  // Calcola statistiche
  const totalLessons = lessons.length;
  const totalHours = lessons.reduce((sum, lesson) => sum + parseFloat(lesson.duration), 0);
  const activePackage = packages.find(pkg => pkg.status === 'in_progress');

  return (
    <Box>
      {/* Header con azioni */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Tooltip title="Torna alla lista">
            <IconButton
              color="primary"
              onClick={handleBackToStudents}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h4">
            Dettagli Studente
          </Typography>
        </Box>

        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddLessonIcon />}
            onClick={handleAddLesson}
            sx={{ mr: 1 }}
          >
            Nuova Lezione
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditStudent}
          >
            Modifica
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteStudent}
            sx={{ ml: 1 }}
          >
            Elimina
          </Button>
        </Box>
      </Box>

      {/* Profilo dello studente */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'secondary.main',
                    fontSize: '2.5rem',
                    mb: 2,
                  }}
                >
                  {student.first_name.charAt(0)}
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  {student.first_name} {student.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Data di nascita: {formatBirthDate(student.birth_date)}
                </Typography>
                {student.email && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Email: {student.email}
                  </Typography>
                )}
                {student.phone && (
                  <Typography variant="body2" color="text.secondary">
                    Telefono: {student.phone}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistiche e pacchetto attivo */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {/* Statistiche */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Statistiche
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <EventIcon color="secondary" fontSize="large" />
                        <Typography variant="h6">{totalLessons}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Lezioni totali
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <MenuBookIcon color="secondary" fontSize="large" />
                        <Typography variant="h6">{totalHours.toFixed(1)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Ore di lezione
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <SchoolIcon color="secondary" fontSize="large" />
                        <Typography variant="h6">{packages.length}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pacchetti totali
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box textAlign="center">
                        <PersonIcon color="secondary" fontSize="large" />
                        <Typography variant="h6">
                          {[...new Set(lessons.map(lesson => lesson.professor_id))].length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Professori
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Pacchetto attivo o pulsante crea pacchetto */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      {activePackage ? 'Pacchetto attivo' : 'Nessun pacchetto attivo'}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<AddPackageIcon />}
                      onClick={handleAddPackage}
                      size="small"
                    >
                      Nuovo Pacchetto
                    </Button>
                  </Box>

                  {activePackage ? (
                    <Box component={Paper} variant="outlined" p={2}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">
                            ID Pacchetto
                          </Typography>
                          <Typography variant="body1">
                            #{activePackage.id}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">
                            Data inizio
                          </Typography>
                          <Typography variant="body1">
                            {format(parseISO(activePackage.start_date), 'dd/MM/yyyy', { locale: it })}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">
                            Totale ore
                          </Typography>
                          <Typography variant="body1">
                            {activePackage.total_hours}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">
                            Ore rimanenti
                          </Typography>
                          <Typography variant="body1" color="primary.main">
                            {activePackage.remaining_hours}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">
                            Costo totale
                          </Typography>
                          <Typography variant="body1">
                            €{parseFloat(activePackage.package_cost).toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="body2" color="text.secondary">
                            Stato pagamento
                          </Typography>
                          <Chip
                            label={activePackage.is_paid ? "Pagato" : "Non pagato"}
                            color={activePackage.is_paid ? "success" : "error"}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                      <Box display="flex" justifyContent="flex-end" mt={2}>
                        <Button
                          component={Link}
                          to={`/packages/${activePackage.id}`}
                          color="primary"
                          size="small"
                        >
                          Dettagli pacchetto
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box textAlign="center" py={3}>
                      <Typography color="text.secondary" gutterBottom>
                        Lo studente non ha pacchetti attivi.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Elenco Pacchetti */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Pacchetti
            </Typography>

            {packages.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Nessun pacchetto registrato
              </Typography>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Data Inizio</TableCell>
                        <TableCell>Ore</TableCell>
                        <TableCell>Stato</TableCell>
                        <TableCell>Pagamento</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {packages
                        .slice(packagesPage * rowsPerPage, packagesPage * rowsPerPage + rowsPerPage)
                        .map((pkg) => (
                          <TableRow
                            key={pkg.id}
                            component={Link}
                            to={`/packages/${pkg.id}`}
                            sx={{
                              textDecoration: 'none',
                              '&:hover': { bgcolor: 'action.hover' },
                              cursor: 'pointer',
                            }}
                          >
                            <TableCell>#{pkg.id}</TableCell>
                            <TableCell>
                              {format(parseISO(pkg.start_date), 'dd/MM/yyyy', { locale: it })}
                            </TableCell>
                            <TableCell>{pkg.total_hours}</TableCell>
                            <TableCell>
                              <Chip
                                label={pkg.status === 'in_progress' ? 'In corso' : 'Terminato'}
                                color={pkg.status === 'in_progress' ? 'primary' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={pkg.is_paid ? 'Pagato' : 'Non pagato'}
                                color={pkg.is_paid ? 'success' : 'error'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={packages.length}
                  rowsPerPage={rowsPerPage}
                  page={packagesPage}
                  onPageChange={handlePackagesPageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                  labelRowsPerPage="Righe per pagina:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
                />
              </>
            )}
          </Paper>
        </Grid>

        {/* Elenco Lezioni */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Lezioni recenti
            </Typography>

            {lessons.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Nessuna lezione registrata
              </Typography>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Data</TableCell>
                        <TableCell>Professore</TableCell>
                        <TableCell>Durata</TableCell>
                        <TableCell>Tipo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lessons
                        .slice(lessonsPage * rowsPerPage, lessonsPage * rowsPerPage + rowsPerPage)
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
                            <TableCell>
                              {format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it })}
                            </TableCell>
                            <TableCell>
                              {/* Idealmente qui ci sarebbe il nome del professore */}
                              Prof. #{lesson.professor_id}
                            </TableCell>
                            <TableCell>{lesson.duration} ore</TableCell>
                            <TableCell>
                              {lesson.is_package ? (
                                <Chip
                                  label={`Pacchetto #${lesson.package_id}`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              ) : (
                                <Chip
                                  label="Lezione singola"
                                  size="small"
                                  color="default"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
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
                  page={lessonsPage}
                  onPageChange={handleLessonsPageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
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

export default StudentDetailPage;