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
        setError('Impossibile caricare la lista delle lezioni. Riprova più tardi.');
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

    setFilteredLessons(filtered);
    setPage(0); // Reset to first page after filtering
  }, [searchTerm, lessons, students, professors, timeFilter]);

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

  const handleEditLesson = (id) => {
    navigate(`/lessons/edit/${id}`);
  };

  const handleAddLesson = () => {
    navigate('/lessons/new');
  };

  const handleDeleteLesson = async (id) => {
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
              <TableCell>ID</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Professore</TableCell>
              <TableCell>Studente</TableCell>
              <TableCell>Durata</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Tariffa Oraria</TableCell>
              <TableCell align="right">Totale</TableCell>
              <TableCell>Pagamento</TableCell> {/* Nuova colonna */}
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLessons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Nessuna lezione trovata
                </TableCell>
              </TableRow>
            ) : (
              filteredLessons
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((lesson) => (
                  <TableRow key={lesson.id}>
                    <TableCell>#{lesson.id}</TableCell>
                    <TableCell>
                      {format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it })}
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
                    <TableCell align="right">€{parseFloat(lesson.hourly_rate).toFixed(2)}</TableCell>
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
                        <Chip
                          label={lesson.is_paid ? "Pagata" : "Non pagata"}
                          color={lesson.is_paid ? "success" : "error"}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="Visualizza dettagli">
                        <IconButton
                          color="primary"
                          onClick={() => handleViewLesson(lesson.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifica">
                        <IconButton
                          color="secondary"
                          onClick={() => handleEditLesson(lesson.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina">
                        <IconButton
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation(); // Previene la navigazione verso la pagina di dettaglio
                            handleDeleteLesson(lesson.id);
                          }}
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