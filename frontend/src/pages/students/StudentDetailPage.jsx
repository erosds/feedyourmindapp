// src/pages/students/StudentDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography
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
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { studentService, packageService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import getProfessorNameById from '../../utils/professorMapping';


// COMPONENTI MODULARI

const StudentProfile = ({ student }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ textAlign: 'center', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center',
      flexGrow: 1}}>
      <Typography variant="h5" gutterBottom>
        {student.first_name} {student.last_name}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Data di nascita: {student.birth_date ? format(parseISO(student.birth_date), 'dd/MM/yyyy', { locale: it }) : 'Non specificata'}
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
    </CardContent>
  </Card>
);

const TotalStatsCard = ({ totalLessons, totalHours, totalPackages, uniqueProfessors }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Statistiche Totali
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Box textAlign="center" p={1}>
            <EventIcon />
            <Typography variant="h6">{totalLessons}</Typography>
            <Typography variant="body2" color="text.secondary">
              Lezioni totali
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box textAlign="center" p={1}>
            <MenuBookIcon />
            <Typography variant="h6">{totalHours.toFixed(1)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Ore di lezione
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box textAlign="center" p={1}>
            <SchoolIcon />
            <Typography variant="h6">{totalPackages}</Typography>
            <Typography variant="body2" color="text.secondary">
              Pacchetti totali
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box textAlign="center" p={1}>
            <PersonIcon />
            <Typography variant="h6">{uniqueProfessors}</Typography>
            <Typography variant="body2" color="text.secondary">
              Professori
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

const WeeklyStatsCard = ({ weeklyLessons, weeklyHours }) => (
  <Card sx={{ mt: 2 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Statistiche Settimanali
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Box textAlign="center" p={1}>
            <EventIcon />
            <Typography variant="h6">{weeklyLessons}</Typography>
            <Typography variant="body2" color="text.secondary">
              Lezioni settimana
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box textAlign="center" p={1}>
            <MenuBookIcon />
            <Typography variant="h6">{weeklyHours.toFixed(1)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Ore settimana
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

const StudentCalendar = ({ currentMonth, lessons }) => {
  const [displayMonth, setDisplayMonth] = useState(currentMonth);

  const changeMonth = (offset) => {
    const newMonth = new Date(displayMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setDisplayMonth(newMonth);
  };

  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const weekdays = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  let days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  const emptyDays = Array(adjustedFirstDay).fill(null);
  days = [...emptyDays, ...days];

  const lessonsByDay = {};
  lessons.forEach(lesson => {
    const lessonDate = parseISO(lesson.lesson_date);
    if (lessonDate.getMonth() !== month || lessonDate.getFullYear() !== year) return;
    const dateKey = format(lessonDate, 'yyyy-MM-dd');
    if (!lessonsByDay[dateKey]) lessonsByDay[dateKey] = [];
    lessonsByDay[dateKey].push({
      professorId: lesson.professor_id,
      duration: parseFloat(lesson.duration),
      isPackage: lesson.is_package
    });
  });

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <IconButton size="small" onClick={() => changeMonth(-1)}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" align="center">
          {format(displayMonth, 'MMMM yyyy', { locale: it })}
        </Typography>
        <IconButton size="small" onClick={() => changeMonth(1)}>
          <ArrowBackIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
        </IconButton>
      </Box>
      <Grid container spacing={0.5}>
        {weekdays.map((day, index) => (
          <Grid item xs={12 / 7} key={`weekday-${index}`}>
            <Box sx={{ textAlign: 'center', fontWeight: 'bold', p: 0.5, fontSize: '0.75rem' }}>
              {day}
            </Box>
          </Grid>
        ))}
        {days.map((day, index) => {
          if (!day) return <Grid item xs={12 / 7} key={`day-${index}`} />;
          const dateKey = format(new Date(year, month, day), 'yyyy-MM-dd');
          const hasLesson = lessonsByDay[dateKey] && lessonsByDay[dateKey].length > 0;
          const dayLessons = hasLesson ? lessonsByDay[dateKey] : [];
          return (
            <Grid item xs={12 / 7} key={`day-${index}`}>
              <Box sx={{ position: 'relative', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{
                  position: 'relative',
                  textAlign: 'center',
                  borderRadius: '50%',
                  height: 32,
                  width: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: hasLesson ? 'primary.light' : 'transparent',
                  color: hasLesson ? 'white' : 'black',
                  fontWeight: hasLesson ? 'bold' : 'normal',
                  cursor: 'default',
                  transition: 'all 0.3s ease',
                  '&:hover': hasLesson ? {
                    '& .lessons-tooltip': {
                      opacity: 1,
                      top: -5 - (dayLessons.length * 20),
                      visibility: 'visible'
                    }
                  } : {}
                }}>
                  {day}
                  {hasLesson && (
                    <Box
                      className="lessons-tooltip"
                      sx={{
                        position: 'absolute',
                        top: -15,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'primary.light',
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
                      {dayLessons.map((lesson, i) => (
                        <Box key={i} sx={{
                          textAlign: 'left',
                          py: 0.2,
                          borderBottom: i < dayLessons.length - 1 ? '1px solid rgba(0,0,0,0.2)' : 'none'
                        }}>
                          {lesson.duration} {lesson.duration === 1 ? 'ora' : 'ore'} con {getProfessorNameById(lesson.professorId)}
                          {lesson.isPackage ? '(P)' : ''}
                        </Box>
                      ))}
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

const WeekSelector = ({ currentWeekStart, onChangeWeek }) => (
  <Box display="flex" alignItems="center" justifyContent="space-between">
    <Typography
      variant="subtitle1"
      sx={{
        fontWeight: 'bold',
        fontSize: '1.0rem',
        p: 1,
        borderRadius: 1,
        flexGrow: 1,
        textAlign: 'center'
      }}
    >
      {format(currentWeekStart, "d MMMM yyyy", { locale: it })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: it })}
    </Typography>
    <ButtonGroup size="small" sx={{ ml: 2 }}>
      <Button onClick={() => onChangeWeek('prev')}>Precedente</Button>
      <Button onClick={() => onChangeWeek('current')}>Corrente</Button>
      <Button onClick={() => onChangeWeek('next')}>Successiva</Button>
    </ButtonGroup>
  </Box>
);

const LessonsTable = ({ lessons, page, rowsPerPage, orderBy, order, onSort, onChangePage, onChangeRowsPerPage }) => (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell sortDirection={orderBy === 'lesson_date' ? order : false}>
            <TableSortLabel
              active={orderBy === 'lesson_date'}
              direction={orderBy === 'lesson_date' ? order : 'asc'}
              onClick={() => onSort('lesson_date')}
            >
              Data
            </TableSortLabel>
          </TableCell>
          <TableCell>
            Professore
          </TableCell>
          <TableCell sortDirection={orderBy === 'duration' ? order : false}>
            <TableSortLabel
              active={orderBy === 'duration'}
              direction={orderBy === 'duration' ? order : 'asc'}
              onClick={() => onSort('duration')}
            >
              Durata (ore)
            </TableSortLabel>
          </TableCell>
          <TableCell>
            Tipo
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lessons.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} align="center">
              Nessuna lezione trovata con i filtri selezionati
            </TableCell>
          </TableRow>
        ) : (
          lessons.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map(lesson => (
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
                  {format(parseISO(lesson.lesson_date), 'EEEE dd/MM/yyyy', { locale: it })}
                </TableCell>
                <TableCell>
                {getProfessorNameById(lesson.professor_id)}
                </TableCell>
                <TableCell>{lesson.duration}</TableCell>
                <TableCell>
                  {lesson.is_package ? (
                    <Chip label={`Pacchetto #${lesson.package_id}`} size="small" variant="outlined" />
                  ) : (
                    <Chip label="Lezione singola" size="small" variant="outlined" />
                  )}
                </TableCell>
              </TableRow>
            ))
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [student, setStudent] = useState(null);
  const [packages, setPackages] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessonTypeFilter, setLessonTypeFilter] = useState('all');
  const [lessonsPage, setLessonsPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Stato per il calendario e statistiche settimanali
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [filteredLessons, setFilteredLessons] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const studentResponse = await studentService.getById(id);
        setStudent(studentResponse.data);
        const packagesResponse = await packageService.getByStudent(id);
        setPackages(packagesResponse.data);
        const lessonsResponse = await lessonService.getByStudent(id);
        setLessons(lessonsResponse.data);
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError('Impossibile caricare i dati dello studente. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Filtro per tipo di lezione (singola vs pacchetto)
  useEffect(() => {
    if (!lessons.length) return;
    let filtered = [...lessons];
    if (lessonTypeFilter !== 'all') {
      const isPackage = lessonTypeFilter === 'package';
      filtered = filtered.filter(lesson => lesson.is_package === isPackage);
    }
    // Ordinamento per data
    filtered.sort((a, b) => new Date(a.lesson_date) - new Date(b.lesson_date));
    setFilteredLessons(filtered);
    setLessonsPage(0);
  }, [lessons, lessonTypeFilter]);

  const handleLessonsPageChange = (event, newPage) => {
    setLessonsPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setLessonsPage(0);
  };

  const handleRequestSort = (property) => {
    // Semplice toggle asc/desc basato sulla data per questo esempio
    const sorted = [...filteredLessons].sort((a, b) => {
      let comparison = new Date(a[property]) - new Date(b[property]);
      return comparison;
    });
    setFilteredLessons(sorted);
  };

  const handleChangeWeek = (action) => {
    if (action === 'prev') {
      setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    } else if (action === 'next') {
      setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    } else if (action === 'current') {
      setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
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
    if (window.confirm('Sei sicuro di voler eliminare questo studente? Questa azione non può essere annullata.')) {
      try {
        await studentService.delete(id);
        navigate('/students');
      } catch (err) {
        console.error('Error deleting student:', err);
        alert('Errore durante l\'eliminazione dello studente.');
      }
    }
  };

  // Calcolo statistiche totali
  const totalLessons = lessons.length;
  const totalHours = lessons.reduce((sum, lesson) => sum + parseFloat(lesson.duration), 0);
  const totalPackages = packages.length;
  const uniqueProfessors = [...new Set(lessons.map(lesson => lesson.professor_id))].length;

  // Calcolo statistiche settimanali (filtrando le lezioni per l'intervallo della settimana corrente)
  const getWeeklyLessons = () => {
    if (!lessons || !Array.isArray(lessons)) return [];
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return lessons.filter(lesson => {
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isWithinInterval(lessonDate, { start: currentWeekStart, end: weekEnd });
      } catch (err) {
        console.error('Error filtering weekly lessons:', err);
        return false;
      }
    });
  };

  const weeklyLessonsData = getWeeklyLessons();
  const weeklyLessonsCount = weeklyLessonsData.length;
  const weeklyHours = weeklyLessonsData.reduce((sum, lesson) => sum + parseFloat(lesson.duration), 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !student) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">{error || 'Studente non trovato'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header con azioni */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Tooltip title="Torna alla lista">
            <IconButton color="primary" onClick={handleBackToStudents} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h4">Dettagli Studente</Typography>
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
            color="primary"
            startIcon={<AddPackageIcon />}
            onClick={handleAddPackage}
            sx={{ mr: 1 }}
          >
            Nuovo Pacchetto
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditStudent}
            sx={{ mr: 1 }}
          >
            Modifica
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteStudent}
          >
            Elimina
          </Button>
        </Box>
      </Box>

      {/* Top Row: Profilo a sinistra e Statistiche Totali a destra */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <StudentProfile student={student} />
        </Grid>
        <Grid item xs={12} md={8}>
          <TotalStatsCard 
            totalLessons={totalLessons}
            totalHours={totalHours}
            totalPackages={totalPackages}
            uniqueProfessors={uniqueProfessors}
          />
        </Grid>
      </Grid>

      {/* Middle Row: Calendario a sinistra e Selettore Settimana con Statistiche Settimanali a destra */}
      <Grid container spacing={2} mt={2}>
        <Grid item xs={12} md={4}>
          <StudentCalendar currentMonth={currentWeekStart} lessons={lessons} />
        </Grid>
        <Grid item xs={12} md={8}>
          <WeekSelector currentWeekStart={currentWeekStart} onChangeWeek={handleChangeWeek} />
          <WeeklyStatsCard weeklyLessons={weeklyLessonsCount} weeklyHours={weeklyHours} />
        </Grid>
      </Grid>

      {/* Bottom Section: Filtro per tipo di lezione e Tabella Lezioni */}
      <Box mt={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel id="lesson-type-filter-label">Tipo di lezione</InputLabel>
              <Select
                labelId="lesson-type-filter-label"
                id="lesson-type-filter"
                value={lessonTypeFilter}
                label="Tipo di lezione"
                onChange={(e) => setLessonTypeFilter(e.target.value)}
              >
                <MenuItem value="all">Tutte le lezioni</MenuItem>
                <MenuItem value="single">Solo lezioni singole</MenuItem>
                <MenuItem value="package">Solo lezioni da pacchetto</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <LessonsTable 
              lessons={filteredLessons}
              page={lessonsPage}
              rowsPerPage={rowsPerPage}
              orderBy="lesson_date"
              order="asc"
              onSort={handleRequestSort}
              onChangePage={handleLessonsPageChange}
              onChangeRowsPerPage={handleRowsPerPageChange}
            />
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredLessons.length}
              rowsPerPage={rowsPerPage}
              page={lessonsPage}
              onPageChange={handleLessonsPageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              labelRowsPerPage="Righe per pagina:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default StudentDetailPage;
