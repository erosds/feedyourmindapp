// src/pages/packages/PackageDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Alert,
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
  List,
  ListItem,
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
  Timer as TimerIcon,
  Euro as EuroIcon,
  EventNote as ListItemIcon,
  EventNote as ListItemText
} from '@mui/icons-material';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { packageService, studentService, lessonService, professorService } from '../../services/api';
import PackageCalendar from '../lessons/utils/PackageCalendar';

function PackageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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

        // Load package data
        const packageResponse = await packageService.getById(id);
        setPackageData(packageResponse.data);

        // Load student data
        const studentResponse = await studentService.getById(packageResponse.data.student_id);
        setStudent(studentResponse.data);

        // Load lessons related to the package
        const lessonsResponse = await lessonService.getAll();
        const packageLessons = lessonsResponse.data.filter(
          lesson => lesson.package_id === parseInt(id) && lesson.is_package
        );
        setLessons(packageLessons);

        // Set current month to the month of the first lesson or today if no lessons
        if (packageLessons.length > 0) {
          setCurrentMonth(parseISO(packageLessons[0].lesson_date));
        }

        // Load all professors and create a dictionary for name/surname
        const professorsResponse = await professorService.getAll();
        const professorsMap = {};
        professorsResponse.data.forEach(professor => {
          professorsMap[professor.id] = `${professor.first_name} ${professor.last_name}`;
        });
        setProfessors(professorsMap);
      } catch (err) {
        console.error('Error fetching package data:', err);
        setError('Unable to load package data. Please try refreshing the page.');
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

        // Naviga alla lista dei pacchetti
        navigate('/packages');
      }
    } catch (err) {
      console.error('Errore nell\'eliminazione del pacchetto:', err);
      alert('Errore nell\'eliminazione del pacchetto. Riprova più tardi.');
    }
  };


  // Function to generate calendar
  const generateCalendar = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    // Group lessons by date
    const lessonsByDate = {};
    lessons.forEach(lesson => {
      const dateKey = lesson.lesson_date;
      if (!lessonsByDate[dateKey]) {
        lessonsByDate[dateKey] = [];
      }
      lessonsByDate[dateKey].push(lesson);
    });

    // Get all dates with lessons
    const dates = Object.keys(lessonsByDate).sort();

    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Lessons Calendar
        </Typography>

        {dates.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
            No lessons recorded
          </Typography>
        ) : (
          <List>
            {dates.map(date => (
              <ListItem key={date} divider>
                <ListItemIcon>
                  <EventIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={format(parseISO(date), 'EEEE, MMMM d, yyyy', { locale: it })}
                  secondary={`${lessonsByDate[date].length} lessons, ${lessonsByDate[date].reduce((sum, l) => sum + parseFloat(l.duration), 0)} hours`}
                />
              </ListItem>
            ))}
          </List>
        )}
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
        <Typography>Package not found</Typography>
      </Box>
    );
  }

  // Calculate package statistics
  const usedHours = lessons.reduce((total, lesson) => total + parseFloat(lesson.duration), 0);
  const remainingHours = parseFloat(packageData.remaining_hours);
  const totalHours = parseFloat(packageData.total_hours);
  const completionPercentage = (usedHours / totalHours) * 100;

  // Check if package is expired
  const expiryDate = parseISO(packageData.expiry_date);
  const isExpired = isAfter(new Date(), expiryDate);
  const daysUntilExpiry = differenceInDays(expiryDate, new Date());

  return (
    <Box>
      {/* Header with actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Tooltip title="Back to list">
            <IconButton
              color="primary"
              onClick={handleBackToPackages}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h4">
            Package Details #{packageData.id}
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
              Aggiungi Lezione al Pacchetto
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

      {/* Main data */}
      <Grid container spacing={1}>
        {/* Header with basic package information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informazioni Pacchetto
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Left Column */}
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
                    Stato
                  </Typography>
                  <Chip
                    label={
                      packageData.status === 'in_progress' ? 'In corso' :
                        packageData.status === 'completed' ? 'Terminato' :
                          packageData.status === 'expired' ? 'Scaduto' :
                            'In corso'
                    }
                    color={
                      packageData.status === 'in_progress' ? 'primary' :
                        packageData.status === 'expired' ? 'warning' :
                          'success'
                    }
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Stato Pagamento
                  </Typography>
                  <Chip
                    icon={packageData.is_paid ? <CheckIcon /> : <CancelIcon />}
                    label={packageData.is_paid ? 'Pagato' : 'Non Pagato'}
                    color={packageData.is_paid ? 'success' : 'error'}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>

                {/* Dates and times */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data di Inizio
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {format(parseISO(packageData.start_date), 'EEEE dd MMMM yyyy', { locale: it })}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data di Scadenza
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="medium"
                    color={isExpired ? "error.main" : "inherit"}
                    gutterBottom
                  >
                    {format(parseISO(packageData.expiry_date), 'dd MMMM yyyy', { locale: it })}
                  </Typography>
                  
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data Pagamento
                  </Typography>
                  {packageData.is_paid && packageData.payment_date ? (
                    <Typography variant="body1" fontWeight="medium" color="success.main">
                      {format(parseISO(packageData.payment_date), 'dd MMMM yyyy', { locale: it })}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Non ancora saldato
                    </Typography>
                  )}
                </Grid>

                {/* Financial details */}
                <Grid item xs={12}>
                  <Divider/>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Prezzo del Pacchetto
                  </Typography>
                  <Typography variant="h6" color="text.primary">
                    €{parseFloat(packageData.package_cost).toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Ore Totali
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    {packageData.total_hours}
                  </Typography>
                </Grid>


                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Ore rimanenti
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={remainingHours > 0 ? 'primary.main' : 'error'}
                  >
                    {remainingHours.toFixed(1)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" mt={3}>
                    <Typography variant="body1">
                      Completamento Settimanale:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {completionPercentage.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={completionPercentage}
                    color={packageData.status === 'completed' ? 'success' : 'primary'}
                    sx={{
                      height: 15,
                      borderRadius: 1,
                      backgroundImage: `repeating-linear-gradient(
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
    )`,
                      backgroundSize: '100% 100%',
                    }}
                  />

                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Calendario lezioni */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom mb={3.3} >
                Calendario Lezioni
              </Typography>
              <PackageCalendar lessons={lessons} professors={professors}/>
            
            </CardContent>
          </Card>
        </Grid>
      

        {/* Lesson Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Lessons in this package
              </Typography>

            </Box>

            {lessons.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Nessuna lezione ancora caricata
              </Typography>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Professor</TableCell>
                        <TableCell>Duration (hours)</TableCell>
                        <TableCell>Hourly rate</TableCell>
                        <TableCell align="right">Total</TableCell>
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
                  labelRowsPerPage="Rows per page:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
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