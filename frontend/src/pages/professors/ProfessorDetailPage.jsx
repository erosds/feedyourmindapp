// src/pages/professors/ProfessorDetailPage.jsx
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
  AdminPanelSettings as AdminIcon,
  School as SchoolIcon,
  Event as EventIcon,
  Euro as EuroIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { professorService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function ProfessorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [professor, setProfessor] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Verifica autorizzazioni: l'admin può vedere tutti i professori,
  // un professore standard può vedere solo se stesso
  const canViewProfessor = () => {
    if (isAdmin()) return true;
    return currentUser && currentUser.id === parseInt(id);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Verifica autorizzazioni
        if (!canViewProfessor()) {
          navigate('/dashboard');
          return;
        }
        
        // Carica i dati del professore
        const professorResponse = await professorService.getById(id);
        setProfessor(professorResponse.data);
        
        // Carica le lezioni del professore
        const lessonsResponse = await lessonService.getByProfessor(id);
        setLessons(lessonsResponse.data);
      } catch (err) {
        console.error('Error fetching professor data:', err);
        setError('Impossibile caricare i dati del professore. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, currentUser, isAdmin]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditProfessor = () => {
    navigate(`/professors/edit/${id}`);
  };

  const handleBackToProfessors = () => {
    navigate('/professors');
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

  if (!professor) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>Professore non trovato</Typography>
      </Box>
    );
  }

  // Calcola statistiche
  const totalLessons = lessons.length;
  const totalHours = lessons.reduce((sum, lesson) => sum + parseFloat(lesson.duration), 0);
  const totalEarnings = lessons.reduce((sum, lesson) => sum + parseFloat(lesson.total_payment), 0);
  const uniqueStudents = [...new Set(lessons.map(lesson => lesson.student_id))].length;

  return (
    <Box>
      {/* Header con azioni */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          {isAdmin() && (
            <Tooltip title="Torna alla lista">
              <IconButton 
                color="primary" 
                onClick={handleBackToProfessors}
                sx={{ mr: 2 }}
              >
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h4">
            Dettagli Professore
          </Typography>
        </Box>
        
        {/* Mostrato solo agli admin o al professore stesso */}
        {(isAdmin() || currentUser.id === professor.id) && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EditIcon />}
            onClick={handleEditProfessor}
          >
            Modifica
          </Button>
        )}
      </Box>

      {/* Profilo del professore */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                <Avatar
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'primary.main',
                    fontSize: '2.5rem',
                    mb: 2,
                  }}
                >
                  {professor.first_name.charAt(0)}
                </Avatar>
                <Typography variant="h5" gutterBottom>
                  {professor.first_name} {professor.last_name}
                </Typography>
                <Box my={1}>
                  {professor.is_admin ? (
                    <Chip
                      icon={<AdminIcon fontSize="small" />}
                      label="Amministratore"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Professore"
                      color="default"
                      variant="outlined"
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Username: {professor.username}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistiche */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistiche
              </Typography>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <EventIcon color="primary" fontSize="large" />
                    <Typography variant="h6">{totalLessons}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lezioni totali
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <SchoolIcon color="primary" fontSize="large" />
                    <Typography variant="h6">{uniqueStudents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Studenti
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <EventIcon color="primary" fontSize="large" />
                    <Typography variant="h6">{totalHours.toFixed(1)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ore di lezione
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <EuroIcon color="primary" fontSize="large" />
                    <Typography variant="h6">€{totalEarnings.toFixed(2)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Guadagni totali
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Lezioni recenti */}
        <Grid item xs={12}>
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
                        <TableCell>Studente</TableCell>
                        <TableCell>Durata (ore)</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell align="right">Compenso</TableCell>
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
                            <TableCell>
                              {format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it })}
                            </TableCell>
                            <TableCell>
                              {/* Idealmente qui ci sarebbe il nome dello studente, ma stiamo
                                  usando solo l'ID per semplicità. In una implementazione
                                  reale, avremmo nomi e cognomi grazie a una join nel backend */}
                              Studente #{lesson.student_id}
                            </TableCell>
                            <TableCell>{lesson.duration}</TableCell>
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

export default ProfessorDetailPage;