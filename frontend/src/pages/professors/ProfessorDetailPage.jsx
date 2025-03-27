// src/pages/professors/ProfessorDetailPage.jsx
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
  AdminPanelSettings as AdminIcon,
  School as SchoolIcon,
  Event as EventIcon,
  Euro as EuroIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { 
  format, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  isWithinInterval 
} from 'date-fns';
import { it } from 'date-fns/locale';
import { professorService, lessonService, studentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// COMPONENTI MODULARI

const ProfessorProfile = ({ professor }) => (
  <Card>
    <CardContent sx={{ textAlign: 'center' }}>
      <Avatar sx={{ width: 50, height: 50, fontSize: '1.3rem', margin: '0 auto', mb: 2 }}>
        {professor.first_name.charAt(0)}
      </Avatar>
      <Typography variant="h5">
        {professor.first_name} {professor.last_name}
      </Typography>
      <Box my={1}>
        {professor.is_admin ? (
          <Chip
            icon={<AdminIcon fontSize="small" />}
            label="Amministratore"
            variant="outlined"
          />
        ) : (
          <Chip
            label="Professore"
            variant="outlined"
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary">
        Username: {professor.username}
      </Typography>
    </CardContent>
  </Card>
);

const TotalStatsCard = ({ totalLessons, totalHours, uniqueStudents, totalEarnings }) => (
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
            <SchoolIcon />
            <Typography variant="h6">{uniqueStudents}</Typography>
            <Typography variant="body2" color="text.secondary">
              Studenti
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box textAlign="center" p={1}>
            <EventIcon />
            <Typography variant="h6">{totalHours.toFixed(1)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Ore di lezione
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box textAlign="center" p={1}>
            <EuroIcon />
            <Typography variant="h6">€{totalEarnings.toFixed(2)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Guadagni totali
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

const WeeklyStatsCard = ({ weeklyLessons, weeklyHours, weeklyEarnings }) => (
  <Card sx={{ mt: 2 }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Statistiche Settimanali
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Box textAlign="center" p={1}>
            <EventIcon />
            <Typography variant="h6">{weeklyLessons}</Typography>
            <Typography variant="body2" color="text.secondary">
              Lezioni settimana
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box textAlign="center" p={1}>
            <EventIcon />
            <Typography variant="h6">{weeklyHours.toFixed(1)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Ore settimana
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box textAlign="center" p={1}>
            <EuroIcon />
            <Typography variant="h6">€{weeklyEarnings.toFixed(2)}</Typography>
            <Typography variant="body2" color="text.secondary">
              Guadagni settimanali
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

const ProfessorCalendar = ({ currentMonth, lessons, studentsMap }) => {
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
      studentName: studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`,
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
                          {lesson.duration} {lesson.duration === 1 ? 'ora' : 'ore'} con {lesson.studentName}
                          {lesson.isPackage ? ' (P)' : ''}
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
        fontSize: '1rem',
        p: 1,
        borderRadius: 1,
        flexGrow: 1,
        textAlign: 'center'
      }}>
      {format(currentWeekStart, "d MMMM yyyy", { locale: it })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: it })}
    </Typography>
    <ButtonGroup size="small" sx={{ ml: 2 }}>
      <Button onClick={() => onChangeWeek('prev')}>Precedente</Button>
      <Button onClick={() => onChangeWeek('current')}>Corrente</Button>
      <Button onClick={() => onChangeWeek('next')}>Successiva</Button>
    </ButtonGroup>
  </Box>
);

const LessonsTable = ({ lessons, studentsMap, page, rowsPerPage, orderBy, order, onSort, onChangePage, onChangeRowsPerPage }) => (
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
          <TableCell sortDirection={orderBy === 'student_id' ? order : false}>
            <TableSortLabel
              active={orderBy === 'student_id'}
              direction={orderBy === 'student_id' ? order : 'asc'}
              onClick={() => onSort('student_id')}
            >
              Studente
            </TableSortLabel>
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
          <TableCell sortDirection={orderBy === 'is_package' ? order : false}>
            <TableSortLabel
              active={orderBy === 'is_package'}
              direction={orderBy === 'is_package' ? order : 'asc'}
              onClick={() => onSort('is_package')}
            >
              Tipo
            </TableSortLabel>
          </TableCell>
          <TableCell align="right" sortDirection={orderBy === 'total_payment' ? order : false}>
            <TableSortLabel
              active={orderBy === 'total_payment'}
              direction={orderBy === 'total_payment' ? order : 'asc'}
              onClick={() => onSort('total_payment')}
            >
              Compenso
            </TableSortLabel>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lessons.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} align="center">
              Nessuna lezione trovata con i filtri selezionati
            </TableCell>
          </TableRow>
        ) : (
          lessons
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
                  {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                </TableCell>
                <TableCell>{lesson.duration}</TableCell>
                <TableCell>
                  {lesson.is_package ? (
                    <Chip
                      label={`Pacchetto #${lesson.package_id}`}
                      size="small"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Lezione singola"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </TableCell>
                <TableCell align="right">€{parseFloat(lesson.total_payment).toFixed(2)}</TableCell>
              </TableRow>
            ))
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

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
  const [studentsMap, setStudentsMap] = useState({});
  
  // Ordinamento e filtri
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('lesson_date');
  const [lessonTypeFilter, setLessonTypeFilter] = useState('all');
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [filteredLessons, setFilteredLessons] = useState([]);

  const canViewProfessor = () => {
    if (isAdmin()) return true;
    return currentUser && currentUser.id === parseInt(id);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!canViewProfessor()) {
          navigate('/dashboard');
          return;
        }
        const professorResponse = await professorService.getById(id);
        setProfessor(professorResponse.data);
        const lessonsResponse = await lessonService.getByProfessor(id);
        setLessons(lessonsResponse.data);
        const studentsResponse = await studentService.getAll();
        const studentsMapping = {};
        studentsResponse.data.forEach(student => {
          studentsMapping[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudentsMap(studentsMapping);
      } catch (err) {
        console.error('Error fetching professor data:', err);
        setError('Impossibile caricare i dati del professore. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate, currentUser, isAdmin]);

  useEffect(() => {
    if (!lessons.length) return;
    let filtered = [...lessons];
    if (lessonTypeFilter !== 'all') {
      const isPackage = lessonTypeFilter === 'package';
      filtered = filtered.filter(lesson => lesson.is_package === isPackage);
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (orderBy) {
        case 'lesson_date':
          comparison = new Date(a.lesson_date) - new Date(b.lesson_date);
          break;
        case 'student_id':
          const studentA = studentsMap[a.student_id] || '';
          const studentB = studentsMap[b.student_id] || '';
          comparison = studentA.localeCompare(studentB);
          break;
        case 'duration':
          comparison = parseFloat(a.duration) - parseFloat(b.duration);
          break;
        case 'is_package':
          comparison = a.is_package === b.is_package ? 0 : a.is_package ? -1 : 1;
          break;
        case 'total_payment':
          comparison = parseFloat(a.total_payment) - parseFloat(b.total_payment);
          break;
        default:
          comparison = 0;
      }
      return order === 'asc' ? comparison : -comparison;
    });
    setFilteredLessons(filtered);
    setPage(0);
  }, [lessons, lessonTypeFilter, order, orderBy, studentsMap]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
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

  const handleEditProfessor = () => {
    navigate(`/professors/edit/${id}`);
  };

  const handleBackToProfessors = () => {
    navigate('/professors');
  };

  const getWeeklyLessons = () => {
    if (!lessons || !Array.isArray(lessons)) return [];
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return lessons.filter(lesson => {
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isWithinInterval(lessonDate, {
          start: currentWeekStart,
          end: weekEnd
        });
      } catch (err) {
        console.error('Error filtering weekly lessons:', err);
        return false;
      }
    });
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

  const totalLessons = lessons.length;
  const totalHours = lessons.reduce((sum, lesson) => sum + parseFloat(lesson.duration), 0);
  const totalEarnings = lessons.reduce((sum, lesson) => sum + parseFloat(lesson.total_payment), 0);
  const uniqueStudents = [...new Set(lessons.map(lesson => lesson.student_id))].length;

  const weeklyLessonsData = getWeeklyLessons();
  const weeklyLessonsCount = weeklyLessonsData.length;
  const weeklyHours = weeklyLessonsData.reduce((sum, lesson) => sum + parseFloat(lesson.duration), 0);
  const weeklyEarnings = weeklyLessonsData.reduce((sum, lesson) => sum + parseFloat(lesson.total_payment), 0);

  return (
    <Box>
      {/* Header con titolo e pulsanti */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          {isAdmin() && (
            <Tooltip title="Torna alla lista">
              <IconButton color="primary" onClick={handleBackToProfessors} sx={{ mr: 2 }}>
                <ArrowBackIcon />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="h4">Dettagli Professore</Typography>
        </Box>
        {(isAdmin() || currentUser.id === professor.id) && (
          <Button variant="outlined" color="primary" startIcon={<EditIcon />} onClick={handleEditProfessor}>
            Modifica
          </Button>
        )}
      </Box>

      {/* Top Row: Avatar a sinistra e Statistiche Totali a destra */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <ProfessorProfile professor={professor} />
        </Grid>
        <Grid item xs={12} md={8}>
          <TotalStatsCard 
            totalLessons={totalLessons}
            totalHours={totalHours}
            uniqueStudents={uniqueStudents}
            totalEarnings={totalEarnings}
          />
        </Grid>
      </Grid>

      {/* Middle Row: Calendario a sinistra e Selettore Settimana con Statistiche Settimanali a destra */}
      <Grid container spacing={2} mt={2}>
        <Grid item xs={12} md={6}>
          <ProfessorCalendar 
            currentMonth={currentWeekStart}
            lessons={lessons}
            studentsMap={studentsMap}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <WeekSelector currentWeekStart={currentWeekStart} onChangeWeek={handleChangeWeek} />
          <WeeklyStatsCard 
            weeklyLessons={weeklyLessonsCount}
            weeklyHours={weeklyHours}
            weeklyEarnings={weeklyEarnings}
          />
        </Grid>
      </Grid>

      {/* Bottom Section: Filtro Tipo di lezione e Tabella lezioni */}
      <Box mt={2}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={9}>
            <LessonsTable 
              lessons={filteredLessons}
              studentsMap={studentsMap}
              page={page}
              rowsPerPage={rowsPerPage}
              orderBy={orderBy}
              order={order}
              onSort={handleRequestSort}
              onChangePage={handleChangePage}
              onChangeRowsPerPage={handleChangeRowsPerPage}
            />
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredLessons.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Righe per pagina:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
            />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

export default ProfessorDetailPage;
