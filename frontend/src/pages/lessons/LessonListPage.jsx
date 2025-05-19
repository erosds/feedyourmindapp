// src/pages/lessons/LessonListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
  Search as SearchIcon,
  Today as TodayIcon,
  Payment as PaymentIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { lessonService, studentService, professorService } from '../../services/api';
import {
  format, parseISO, isToday, isThisWeek, isThisMonth, isAfter, isBefore, isEqual,
  startOfWeek, endOfWeek, addWeeks, subWeeks, startOfDay, endOfDay, isWithinInterval
} from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { DatePicker } from '@mui/x-date-pickers';
import DateRangePickerDialog from '../../components/common/DateRangePickerDialog';
import { CalendarMonth as CalendarIcon } from '@mui/icons-material';

function LessonListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAdmin } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState({});
  const [professors, setProfessors] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '0', 10));
  const [rowsPerPage, setRowsPerPage] = useState(parseInt(searchParams.get('rows') || '10', 10));
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [timeFilter, setTimeFilter] = useState(searchParams.get('time') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') || 'all');
  const [showOnlyMine, setShowOnlyMine] = useState(
    searchParams.get('mine') === 'true' || (!isAdmin())
  );

  // Stato per l'ordinamento
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');

  // Funzione per gestire la richiesta di cambio dell'ordinamento
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Stato per il dialog di selezione date
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);

  // Stato per il range di date (inizializzato dai parametri URL o con valori predefiniti)
  const [dateRange, setDateRange] = useState(() => {
    // Legge il range di date dall'URL se esiste
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const isRange = searchParams.get('isRange') === 'true';

    // Default a oggi se non ci sono date nell'URL
    const today = new Date();

    return {
      startDate: startDateStr ? parseISO(startDateStr) : today,
      endDate: endDateStr ? parseISO(endDateStr) : today,
      isRange: isRange
    };
  });

  // Funzione per formattare le date da visualizzare
  const formatDateForDisplay = () => {
    if (timeFilter === 'custom') {
      if (dateRange.isRange) {
        return `${format(dateRange.startDate, 'dd/MM/yyyy')} - ${format(dateRange.endDate, 'dd/MM/yyyy')}`;
      } else {
        return format(dateRange.startDate, 'dd/MM/yyyy');
      }
    }
    return '';
  };

  // Gestisce la selezione del range di date
  const handleDateRangeSelected = (newDateRange) => {
    setDateRange(newDateRange);

    // Aggiorna l'URL con il nuovo range di date
    if (newDateRange.isRange) {
      updateSearchParams('startDate', format(newDateRange.startDate, 'yyyy-MM-dd'));
      updateSearchParams('endDate', format(newDateRange.endDate, 'yyyy-MM-dd'));
      updateSearchParams('isRange', 'true');
    } else {
      updateSearchParams('startDate', format(newDateRange.startDate, 'yyyy-MM-dd'));
      updateSearchParams('endDate', ''); // Assicurati che endDate sia rimosso se non è un range
      updateSearchParams('isRange', 'false');
    }

    // Imposta anche il filtro time su 'custom'
    updateSearchParams('time', 'custom');
  }

  // Gestione dei filtri iniziali che arrivano dalla dashboard
  useEffect(() => {
    if (location.state) {
      // Se c'è un filtro iniziale impostato dalla dashboard, applicalo
      if (location.state.initialFilter === 'unpaid') {
        // Imposta il filtro per le lezioni non pagate
        setPaymentFilter('unpaid');
      }
    }
  }, [location.state]);

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

  // Funzione per aggiornare le lezioni
  const fetchLessons = async () => {
    try {
      // Carica tutte le lezioni o solo quelle del professore corrente
      let lessonsData;
      if (isAdmin() && !showOnlyMine) {
        const lessonsResponse = await lessonService.getAll();
        lessonsData = lessonsResponse.data;
      } else {
        const lessonsResponse = await lessonService.getByProfessor(currentUser.id);
        lessonsData = lessonsResponse.data;
      }
      return lessonsData;
    } catch (err) {
      console.error('Error fetching lessons:', err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Carica le lezioni
        const lessonsData = await fetchLessons();
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
            return isThisWeek(lessonDate, { weekStartsOn: 1 });
          case 'custom': {
            // Per date personalizzate
            if (dateRange.isRange) {
              return isWithinInterval(lessonDate, {
                start: startOfDay(dateRange.startDate),
                end: endOfDay(dateRange.endDate)
              });
            } else {
              return isWithinInterval(lessonDate, {
                start: startOfDay(dateRange.startDate),
                end: endOfDay(dateRange.startDate)
              });
            }
          }
          default:
            return true;
        }
      });
    }

    // Filtra per stato del pagamento
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(lesson => {
        switch (paymentFilter) {
          case 'paid':
            return !lesson.is_package && lesson.is_paid;
          case 'unpaid':
            return !lesson.is_package && !lesson.is_paid;
          case 'package':
            return lesson.is_package;
          default:
            return true;
        }
      });
    }

    // Applica l'ordinamento
    const sortedFiltered = stableSort(filtered, getComparator(order, orderBy));

    // Prima di impostare i dati filtrati, preserva la paginazione corrente
    // se il numero di elementi filtrati è sufficiente a mantenere la pagina attuale
    let newPage = page;
    const maxPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);

    // Se la pagina corrente supera il nuovo maxPage, aggiustiamo a maxPage
    if (page > maxPage) {
      newPage = maxPage;
    }

    setFilteredLessons(sortedFiltered);

    // Imposta la nuova pagina solo se è diversa dalla corrente
    if (newPage !== page) {
      setPage(newPage);
    }
  }, [searchTerm, lessons, students, professors, timeFilter, paymentFilter, order, orderBy, dateRange]);

  // Aggiorna i gestori degli eventi per modificare anche l'URL
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    updateSearchParams('page', newPage.toString());
  };

  const handleChangeRowsPerPage = (event) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0); // Reset alla prima pagina
    updateSearchParams('rows', value.toString());
    updateSearchParams('page', '0');
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value); // Aggiorna solo lo stato locale, la tabella si aggiorna immediatamente
  };

  // Aggiungi una nuova funzione per gestire l'evento onBlur (quando l'input perde focus)
  const handleSearchBlur = () => {
    // Aggiorna i parametri URL solo quando l'input perde focus
    updateSearchParams('search', searchTerm);
  };

  // Aggiungi una nuova funzione per gestire il tasto Invio
  const handleSearchKeyDown = (event) => {
    // Codice 13 = tasto Invio
    if (event.keyCode === 13) {
      // Aggiorna i parametri URL quando si preme Invio
      updateSearchParams('search', searchTerm);
      // Rimuovi il focus dall'input
      event.target.blur();
    }
  };

  // Funzione helper per aggiornare i parametri URL
  const updateSearchParams = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== '' && value !== 'all' && value !== '0') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleTimeFilterChange = (event) => {
    const value = event.target.value;

    // Se si seleziona "custom", apri il dialog di selezione date
    if (value === 'custom') {
      setTimeFilter(value);
      setDateRangeDialogOpen(true);
      updateSearchParams('time', value);
    } else {
      // Rimuovi i parametri di data personalizzati dall'URL se non si usa "custom"
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('startDate');
      newParams.delete('endDate');
      newParams.delete('isRange');

      // Aggiungi il nuovo valore per time, ma solo se non è 'all'
      if (value !== 'all') {
        newParams.set('time', value);
      } else {
        newParams.delete('time');
      }

      // Imposta i nuovi parametri URL
      setSearchParams(newParams);

      // Aggiorna lo stato del filtro dopo aver pulito i parametri
      setTimeFilter(value);

      // Reset anche dello stato locale dateRange quando si passa a filtri non personalizzati
      setDateRange({
        startDate: new Date(),
        endDate: new Date(),
        isRange: false
      });
    }
  };

  const handlePaymentFilterChange = (event) => {
    const value = event.target.value;
    setPaymentFilter(value);
    updateSearchParams('payment', value);
  };

  const handleToggleShowMine = () => {
    const newValue = !showOnlyMine;
    setShowOnlyMine(newValue);
    updateSearchParams('mine', newValue.toString());
  };

  useEffect(() => {
    // Questo useEffect si attiva quando cambia la posizione o i parametri di ricerca
    const fetchAndApplyFilters = async () => {
      try {
        setLoading(true);

        // Carica i dati delle lezioni in base al ruolo e alle preferenze dell'utente
        let lessonsData;
        if (isAdmin() && !showOnlyMine) {
          const lessonsResponse = await lessonService.getAll();
          lessonsData = lessonsResponse.data;
        } else {
          const lessonsResponse = await lessonService.getByProfessor(currentUser.id);
          lessonsData = lessonsResponse.data;
        }
        setLessons(lessonsData);

        // Carica tutti gli studenti per mostrare i loro nomi
        const studentsResponse = await studentService.getAll();
        const studentsMap = {};
        studentsResponse.data.forEach(student => {
          studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudents(studentsMap);

        // Aggiorna il range di date dall'URL se presente
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const isRange = searchParams.get('isRange') === 'true';

        if (startDateStr) {
          const startDate = parseISO(startDateStr);
          const endDate = endDateStr ? parseISO(endDateStr) : startDate;

          setDateRange({
            startDate,
            endDate,
            isRange
          });

          // Assicurati che timeFilter sia impostato su custom se ci sono date presenti
          if (timeFilter !== 'custom') {
            setTimeFilter('custom');
          }
        }

        // Carica i professori se l'utente è admin
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

        // Importante: aggiorna lo stato dei filtri basandosi sull'URL
        setPage(parseInt(searchParams.get('page') || '0', 10));
        setRowsPerPage(parseInt(searchParams.get('rows') || '10', 10));
        setSearchTerm(searchParams.get('search') || '');
        setTimeFilter(searchParams.get('time') || 'all');
        setPaymentFilter(searchParams.get('payment') || 'all');
        setShowOnlyMine(
          searchParams.get('mine') === 'true' || (!isAdmin())
        );

      } catch (err) {
        console.error('Error fetching lessons:', err);
        setError('Impossibile caricare la lista delle lezioni. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndApplyFilters();
  }, [location.key, currentUser, isAdmin]); // location.key cambia ad ogni navigazione

  // Modifica anche la funzione di navigazione al dettaglio
  const handleViewLesson = (id) => {
    navigate(`/lessons/${id}`, {
      state: { returnUrl: `${location.pathname}${location.search}` }
    });
  };

  const handleEditLesson = (id, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli
    navigate(`/lessons/edit/${id}`);
  };

  const handleAddLesson = () => {
    navigate('/lessons/new');
  };

  const handleUpdatePaymentStatus = async (lesson, isPaid, paymentDate, updatedPrice) => {
    try {
      setUpdating(true);

      // Prepara i dati da aggiornare
      const updateData = {
        is_paid: isPaid,
        payment_date: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : null,
        price: updatedPrice !== undefined ? updatedPrice : lesson.price
      };

      // Chiama il servizio per aggiornare la lezione
      await lessonService.update(lesson.id, updateData);

      // Ricarica le lezioni
      const lessonsData = await fetchLessons();

      // Aggiorna lo stato delle lezioni
      setLessons(lessonsData);

    } catch (err) {
      console.error('Error updating payment status:', err);
      alert('Errore durante l\'aggiornamento dello stato di pagamento. Riprova più tardi.');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPayment = () => {
    if (selectedLesson) {
      // Solo gli admin possono modificare il prezzo
      const priceToUse = isAdmin()
        ? (selectedLesson.price || 20 * selectedLesson.duration)
        : 20 * selectedLesson.duration;

      handleUpdatePaymentStatus(
        selectedLesson,
        true,
        paymentDate,
        priceToUse
      );
    }
    setPaymentDialogOpen(false);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
  };

  // Nuova funzione per il toggle del pagamento
  const handleTogglePayment = (lesson, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli

    // Solo per lezioni singole (non da pacchetto)
    if (lesson.is_package) return;

    // Se è già pagata, cambia direttamente stato
    if (lesson.is_paid) {
      handleUpdatePaymentStatus(lesson, false, null);
    } else {
      // Apri dialog per impostare data pagamento
      setSelectedLesson(lesson);
      setPaymentDate(new Date());
      setPaymentDialogOpen(true);
    }
  };

  const handleDeleteLesson = async (id, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli

    if (window.confirm(`Sei sicuro di voler eliminare la lezione #${id}? Questa azione non può essere annullata.`)) {
      try {
        await lessonService.delete(id);
        // Aggiorna la lista dopo l'eliminazione
        const lessonsData = await fetchLessons();
        setLessons(lessonsData);
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
          <Grid item xs={12} md={3.5}>
            <TextField
              fullWidth
              variant="outlined"
              label="Cerca lezione per studente o per professore"
              value={searchTerm}
              onChange={handleSearchChange}
              onBlur={handleSearchBlur} // Aggiungi l'evento onBlur
              onKeyDown={handleSearchKeyDown} // Aggiungi l'evento onKeyDown
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
                endAdornment={
                  timeFilter === 'custom' && (
                    <InputAdornment position="end" sx={{ mr: 2 }}> {/* Aggiunto mr: 2 per spostare a sinistra */}
                      <Tooltip title="Modifica periodo">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDateRangeDialogOpen(true);
                          }}
                          edge="end"
                        >
                          <CalendarIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  )
                }
              >
                <MenuItem value="all">Tutte le date</MenuItem>
                <MenuItem value="today">Oggi</MenuItem>
                <MenuItem value="week">Questa settimana</MenuItem>
                <MenuItem value="custom">
                  {timeFilter === 'custom' && dateRange ?
                    formatDateForDisplay() :
                    'Personalizzato...'
                  }
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="payment-filter-label">Pagamento</InputLabel>
              <Select
                labelId="payment-filter-label"
                value={paymentFilter}
                onChange={handlePaymentFilterChange}
                label="Pagamento"
                startAdornment={
                  <InputAdornment position="start">
                    <PaymentIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">Tutti i pagamenti</MenuItem>
                <MenuItem value="paid">Pagate</MenuItem>
                <MenuItem value="unpaid">Non pagate</MenuItem>
                <MenuItem value="package">Da pacchetto</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {isAdmin() && (
            <Grid item xs={12} md={2.5}>
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
              <SortableTableCell id="student_id" label="Studente" />
              <SortableTableCell id="lesson_date" label="Data" />
              <SortableTableCell id="start_time" label="Orario" />
              <SortableTableCell id="duration" label="Durata" />
              <SortableTableCell id="professor_id" label="Professore" />
              <SortableTableCell id="total_payment" label="Retribuzione" numeric />
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
                    <TableCell>{students[lesson.student_id] || `Studente #${lesson.student_id}`}</TableCell>

                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {format(parseISO(lesson.lesson_date), 'EEEE dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                    </TableCell>
                    <TableCell>{lesson.duration} ore</TableCell>


                    <TableCell>{professors[lesson.professor_id] || `Prof. #${lesson.professor_id}`}</TableCell>
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
                              : (lesson.is_paid ? "Clicca per segnare come non pagata" : "Clicca per segnare come pagata")
                          }
                        >
                          <Chip
                            label={lesson.is_paid ? "Pagata" : "Non pagata"}
                            color={lesson.is_paid ? "success" : "error"}
                            size="small"
                            variant="outlined"
                            onClick={(e) => handleTogglePayment(lesson, e)}
                            disabled={updating}
                            sx={{ cursor: 'pointer' }}
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
                            : (!lesson.is_paid || parseFloat(lesson.price || 0) === 0)
                              ? "error.main"
                              : "success.main",
                          fontWeight: (!lesson.is_package && !lesson.is_paid) ||
                            (!lesson.is_package && parseFloat(lesson.price || 0) === 0)
                            ? "bold" : "normal"
                        }}
                      >
                        {lesson.is_package ? (
                          "—"
                        ) : (
                          <>
                            €{parseFloat(lesson.price || 0).toFixed(2)}
                            {parseFloat(lesson.price || 0) === 0 && (
                              <Tooltip title="Prezzo da impostare">
                                <span style={{ marginLeft: '4px' }}></span>
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

      {/* Dialog per la data di pagamento */}
      <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog}>
        <DialogTitle>Conferma Pagamento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {isAdmin() && (
              <TextField
                fullWidth
                label="Prezzo Lezione"
                type="number"
                value={selectedLesson?.price || 0}
                onChange={(e) => {
                  const updatedLesson = {
                    ...selectedLesson,
                    price: parseFloat(e.target.value) || 0
                  };
                  setSelectedLesson(updatedLesson);
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
              />
            )}
            <DatePicker
              label="Data pagamento"
              value={paymentDate}
              onChange={(date) => setPaymentDate(date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: "outlined"
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Annulla</Button>
          <Button
            onClick={handleConfirmPayment}
            variant="contained"
            color="primary"
          >
            Conferma Pagamento
          </Button>
        </DialogActions>
      </Dialog>
      {/* Date Range Picker Dialog */}
      <DateRangePickerDialog
        open={dateRangeDialogOpen}
        onClose={() => setDateRangeDialogOpen(false)}
        onApply={(newDateRange) => {
          // Aggiorna lo stato locale
          setDateRange(newDateRange);

          // Aggiorna i parametri URL
          if (newDateRange.isRange) {
            // Se è un intervallo di date, salva entrambe le date
            updateSearchParams('startDate', format(newDateRange.startDate, 'yyyy-MM-dd'));
            updateSearchParams('endDate', format(newDateRange.endDate, 'yyyy-MM-dd'));
            updateSearchParams('isRange', 'true');
          } else {
            // Se è una data singola, salva solo startDate
            updateSearchParams('startDate', format(newDateRange.startDate, 'yyyy-MM-dd'));
            updateSearchParams('endDate', ''); // Rimuovi endDate
            updateSearchParams('isRange', 'false');
          }

          // Assicurati che timeFilter sia impostato su 'custom'
          if (timeFilter !== 'custom') {
            setTimeFilter('custom');
            updateSearchParams('time', 'custom');
          }
        }}
        initialDateRange={dateRange}
      />
    </Box>
  );
}

export default LessonListPage;