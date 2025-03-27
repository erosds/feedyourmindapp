// src/pages/lessons/LessonListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  FormControlLabel,
  Switch,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Today as TodayIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { lessonService, studentService, professorService } from '../../services/api';
import { format, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

function LessonListPage() {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState({});
  const [professors, setProfessors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all'); // all, today, week, month
  const [showOnlyMine, setShowOnlyMine] = useState(!isAdmin()); // Default: professori normali vedono solo le proprie lezioni

  // Stato per l'ordinamento
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');

  // Funzione per gestire la richiesta di cambio dell'ordinamento
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Funzione helper per l'ordinamento stabile
  const descendingComparator = (a, b, orderBy) => {
    // Casi speciali per i formati di data e ora
    if (orderBy === 'lesson_date') {
      return new Date(b.lesson_date) - new Date(a.lesson_date);
    }
    if (orderBy === 'start_time') {
      // Per gli orari, convertire a minuti per facilitare il confronto
      const timeA = a.start_time ? a.start_time.substring(0, 5).split(':') : ['00', '00'];
      const timeB = b.start_time ? b.start_time.substring(0, 5).split(':') : ['00', '00'];
      const minutesA = parseInt(timeA[0]) * 60 + parseInt(timeA[1]);
      const minutesB = parseInt(timeB[0]) * 60 + parseInt(timeB[1]);
      return minutesB - minutesA;
    }
    // Per i campi numerici
    if (orderBy === 'duration' || orderBy === 'hourly_rate' || orderBy === 'total_payment') {
      return parseFloat(b[orderBy]) - parseFloat(a[orderBy]);
    }
    // Per i campi stringa nel caso di professor_id e student_id, usa il nome mappato
    if (orderBy === 'professor_id') {
      return (professors[b.professor_id] || '').localeCompare(professors[a.professor_id] || '');
    }
    if (orderBy === 'student_id') {
      return (students[b.student_id] || '').localeCompare(students[a.student_id] || '');
    }
    // Per il campo is_package
    if (orderBy === 'is_package') {
      return (b.is_package === a.is_package) ? 0 : b.is_package ? -1 : 1;
    }
    // Per il campo is_paid
    if (orderBy === 'is_paid') {
      return (b.is_paid === a.is_paid) ? 0 : b.is_paid ? -1 : 1;
    }
    // Per altri campi
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  // Funzione per ordinare in modo stabile
  const stableSort = (array, comparator) => {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Carica tutte le lezioni o solo quelle del professore corrente
        let lessonsData;
        if (isAdmin() && !showOnlyMine) {
          const lessonsResponse = await lessonService.getAll();
          lessonsData = lessonsResponse.data;
        } else {
          const lessonsResponse = await lessonService.getByProfessor(currentUser.id);
          lessonsData = lessonsResponse.data;
        }
        setLessons(lessonsData);
        setFilteredLessons(lessonsData);

        // Carica tutti gli studenti per mostrare i loro nomi
        const studentsResponse = await studentService.getAll();
        const studentsMap = {};
        studentsResponse.data.forEach(student => {
          studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudents(studentsMap);

        // Carica tutti i professori per mostrare i loro nomi
        if (isAdmin()) {
          const professorsResponse = await professorService.getAll();
          const professorsMap = {};
          professorsResponse.data.forEach(professor => {
            professorsMap[professor.id] = `${professor.first_name} ${professor.last_name}`;
          });
          setProfessors(professorsMap);
        } else {
          // Se non è admin, aggiungi solo il professore corrente
          setProfessors({
            [currentUser.id]: `${currentUser.first_name} ${currentUser.last_name}`
          });
        }
      } catch (err) {
        console.error('Error fetching lessons:', err);
        setError('Impossibile caricare la lista delle lezioni. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, isAdmin, showOnlyMine]);

  useEffect(() => {
    let filtered = [...lessons];

    // Filtra per termine di ricerca (nome studente o professore)
    if (searchTerm.trim() !== '') {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((lesson) => {
        const studentName = students[lesson.student_id] || '';
        const professorName = professors[lesson.professor_id] || '';
        return (
          studentName.toLowerCase().includes(lowercaseSearch) ||
          professorName.toLowerCase().includes(lowercaseSearch)
        );
      });
    }

    // Filtra per periodo di tempo
    if (timeFilter !== 'all') {
      filtered = filtered.filter(lesson => {
        const lessonDate = parseISO(lesson.lesson_date);
        switch (timeFilter) {
          case 'today':
            return isToday(lessonDate);
          case 'week':
            return isThisWeek(lessonDate);
          case 'month':
            return isThisMonth(lessonDate);
          default:
            return true;
        }
      });
    }

    // Applica l'ordinamento
    const sortedFiltered = stableSort(filtered, getComparator(order, orderBy));
    setFilteredLessons(sortedFiltered);
    setPage(0); // Reset to first page after filtering
  }, [searchTerm, lessons, students, professors, timeFilter, order, orderBy]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleTimeFilterChange = (event) => {
    setTimeFilter(event.target.value);
  };

  const handleToggleShowMine = () => {
    setShowOnlyMine(!showOnlyMine);
  };

  const handleViewLesson = (id) => {
    navigate(`/lessons/${id}`);
  };

  const handleEditLesson = (id, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli
    navigate(`/lessons/edit/${id}`);
  };

  const handleAddLesson = () => {
    navigate('/lessons/new');
  };

  const handleDeleteLesson = async (id, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli

    if (window.confirm(`Sei sicuro di voler eliminare la lezione #${id}? Questa azione non può essere annullata.`)) {
      try {
        await lessonService.delete(id);
        // Aggiorna la lista dopo l'eliminazione
        let lessonsData;
        if (isAdmin() && !showOnlyMine) {
          const lessonsResponse = await lessonService.getAll();
          lessonsData = lessonsResponse.data;
        } else {
          const lessonsResponse = await lessonService.getByProfessor(currentUser.id);
          lessonsData = lessonsResponse.data;
        }
        setLessons(lessonsData);
        setFilteredLessons(lessonsData);
      } catch (err) {
        console.error('Error deleting lesson:', err);
        alert('Errore durante l\'eliminazione della lezione. Riprova più tardi.');
      }
    }
  };

  // Componente SortableTableCell per le intestazioni delle colonne
  const SortableTableCell = ({ id, label, numeric }) => {
    const isActive = orderBy === id;

    return (
      <TableCell
        align={numeric ? "right" : "left"}
        sortDirection={isActive ? order : false}
        onClick={() => handleRequestSort(id)}
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          fontWeight: isActive ? 'bold' : 'normal',
          '& .sort-icon': {
            opacity: isActive ? 1 : 0.35,
            marginLeft: '4px',
            fontSize: '1rem',
            transition: 'transform 0.2s',
            transform: isActive && order === 'asc' ? 'rotate(180deg)' : 'rotate(0deg)',
          }
        }}
      >
        <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: numeric ? 'flex-end' : 'flex-start' }}>
          {label}
          <Box component="span" className="sort-icon">
            {order === 'desc' ? '▼' : '▲'}
          </Box>
        </Box>
      </TableCell>
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Lezioni</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddLesson}
        >
          Nuova Lezione
        </Button>
      </Box>

      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              label="Cerca lezione"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="time-filter-label">Periodo</InputLabel>
              <Select
                labelId="time-filter-label"
                value={timeFilter}
                onChange={handleTimeFilterChange}
                label="Periodo"
                startAdornment={
                  <InputAdornment position="start">
                    <TodayIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">Tutte le date</MenuItem>
                <MenuItem value="today">Oggi</MenuItem>
                <MenuItem value="week">Questa settimana</MenuItem>
                <MenuItem value="month">Questo mese</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {isAdmin() && (
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showOnlyMine}
                    onChange={handleToggleShowMine}
                    color="primary"
                  />
                }
                label="Solo le mie lezioni"
              />
            </Grid>
          )}
        </Grid>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <SortableTableCell id="id" label="ID" />
              <SortableTableCell id="lesson_date" label="Data" />
              <SortableTableCell id="start_time" label="Orario" />
              <SortableTableCell id="professor_id" label="Professore" />
              <SortableTableCell id="student_id" label="Studente" />
              <SortableTableCell id="duration" label="Durata" />
              <SortableTableCell id="is_package" label="Tipo" />
              <SortableTableCell id="total_payment" label="Totale" numeric />
              <SortableTableCell id="is_paid" label="Pagamento" />
              {isAdmin() && (
                <SortableTableCell id="price" label="Prezzo" numeric />
              )}
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLessons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  Nessuna lezione trovata
                </TableCell>
              </TableRow>
            ) : (
              filteredLessons
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((lesson) => (
                  <TableRow
                    key={lesson.id}
                    hover
                    onClick={() => handleViewLesson(lesson.id)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <TableCell>#{lesson.id}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {format(parseISO(lesson.lesson_date), 'EEEE dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                    </TableCell>
                    <TableCell>{professors[lesson.professor_id] || `Prof. #${lesson.professor_id}`}</TableCell>
                    <TableCell>{students[lesson.student_id] || `Studente #${lesson.student_id}`}</TableCell>
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
                    <TableCell align="right">€{parseFloat(lesson.total_payment).toFixed(2)}</TableCell>
                    <TableCell>
                      {lesson.is_package ? (
                        <Tooltip title="Gestito nel pacchetto">
                          <Chip
                            label="Da pacchetto"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip
                          title={
                            lesson.is_paid && lesson.payment_date
                              ? `Pagata il ${format(parseISO(lesson.payment_date), 'dd/MM/yyyy', { locale: it })}`
                              : (lesson.is_paid ? "Pagata" : "Non pagata")
                          }
                        >
                          <Chip
                            label={lesson.is_paid ? "Pagata" : "Non pagata"}
                            color={lesson.is_paid ? "success" : "error"}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                    {isAdmin() && (
                      <TableCell
                        align="right"
                        sx={{
                          color: lesson.is_package
                            ? "success.main"
                            : (parseFloat(lesson.price || 0) === 0 ? "error.main" : "inherit"),
                          fontWeight: !lesson.is_package && parseFloat(lesson.price || 0) === 0 ? "bold" : "normal"
                        }}
                      >
                        {lesson.is_package ? (
                          "—"
                        ) : (
                          <>
                            €{parseFloat(lesson.price || 0).toFixed(2)}
                            {parseFloat(lesson.price || 0) === 0 && (
                              <Tooltip title="Prezzo da impostare">
                                <span style={{ marginLeft: '4px' }}>⚠️</span>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </TableCell>
                    )}
                    

                    <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Modifica">
                        <IconButton
                          color="primary"
                          onClick={(e) => handleEditLesson(lesson.id, e)}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina">
                        <IconButton
                          color="error"
                          onClick={(e) => handleDeleteLesson(lesson.id, e)}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
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
      </TableContainer>
    </Box>
  );
}

export default LessonListPage;