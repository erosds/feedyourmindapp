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
  Typography,
  FormControlLabel,
  Switch,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Today as TodayIcon,
  Payment as PaymentIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { lessonService, studentService, professorService } from '../../services/api';
import {
  format, parseISO, isToday, isThisWeek, isWithinInterval,
  startOfDay, endOfDay,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';
import { DatePicker } from '@mui/x-date-pickers';
import DateRangePickerDialog from '../../components/common/DateRangePickerDialog';

function LessonListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAdmin } = useAuth();

  // Main data states
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState({});
  const [professors, setProfessors] = useState({});
  const [filteredLessons, setFilteredLessons] = useState([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '0', 10));
  const [rowsPerPage, setRowsPerPage] = useState(parseInt(searchParams.get('rows') || '10', 10));
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [timeFilter, setTimeFilter] = useState(searchParams.get('time') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') || 'all');

  const [showOnlyMine, setShowOnlyMine] = useState(
    searchParams.get('mine') === 'true' || (!isAdmin())
  );

  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date());

  // Custom date filter states
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const isRange = searchParams.get('isRange') === 'true';

    return {
      startDate: startDateStr ? parseISO(startDateStr) : new Date(),
      endDate: endDateStr ? parseISO(endDateStr) : new Date(),
      isRange: isRange
    };
  });

  // Sort states
  const [order, setOrder] = useState(searchParams.get('order') || 'desc');
  const [orderBy, setOrderBy] = useState(searchParams.get('orderBy') || 'id');

  // Aggiungi questo nuovo stato dopo gli altri stati di filtro
  const [lessonTypeFilter, setLessonTypeFilter] = useState(searchParams.get('type') || 'all');

  const handleLessonTypeFilterChange = (event) => {
    const value = event.target.value;
    setLessonTypeFilter(value);
    updateSearchParams('type', value);

    if (value === 'package') {
      setPaymentFilter('all');
      updateSearchParams('payment', 'all');
    }
  };

  // Fetch lessons based on filters
  const fetchLessons = async () => {
    try {
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

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Load lessons
        const lessonsData = await fetchLessons();
        setLessons(lessonsData);
        setFilteredLessons(lessonsData);

        // Load students
        const studentsResponse = await studentService.getAll();
        const studentsMap = {};
        studentsResponse.data.forEach(student => {
          studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudents(studentsMap);

        // Load professors
        if (isAdmin()) {
          const professorsResponse = await professorService.getAll();
          const professorsMap = {};
          professorsResponse.data.forEach(professor => {
            professorsMap[professor.id] = `${professor.first_name} ${professor.last_name}`;
          });
          setProfessors(professorsMap);
        } else {
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

  // Apply filters
  useEffect(() => {
    let filtered = [...lessons];

    // Filter by search term
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

    // Filter by time period
    if (timeFilter !== 'all') {
      filtered = filtered.filter(lesson => {
        const lessonDate = parseISO(lesson.lesson_date);

        switch (timeFilter) {
          case 'today':
            return isToday(lessonDate);
          case 'week':
            return isThisWeek(lessonDate, { weekStartsOn: 1 });
          case 'custom': {
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

    // Filter by payment status
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(lesson => {
        switch (paymentFilter) {
          case 'paid':
            return !lesson.is_package && lesson.is_paid;
          case 'unpaid':
            return !lesson.is_package && !lesson.is_paid;
          default:
            return true;
        }
      });
    }

    if (lessonTypeFilter !== 'all') {
      filtered = filtered.filter(lesson => {
        switch (lessonTypeFilter) {
          case 'single':
            return !lesson.is_package;
          case 'package':
            return lesson.is_package;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      // Handle special cases
      if (orderBy === 'lesson_date') {
        return order === 'asc'
          ? new Date(a.lesson_date) - new Date(b.lesson_date)
          : new Date(b.lesson_date) - new Date(a.lesson_date);
      }

      if (orderBy === 'start_time') {
        const timeA = a.start_time ? a.start_time.substring(0, 5).split(':') : ['00', '00'];
        const timeB = b.start_time ? b.start_time.substring(0, 5).split(':') : ['00', '00'];
        const minutesA = parseInt(timeA[0]) * 60 + parseInt(timeA[1]);
        const minutesB = parseInt(timeB[0]) * 60 + parseInt(timeB[1]);
        return order === 'asc' ? minutesA - minutesB : minutesB - minutesA;
      }

      if (orderBy === 'student_id') {
        const studentA = students[a.student_id] || '';
        const studentB = students[b.student_id] || '';
        return order === 'asc'
          ? studentA.localeCompare(studentB)
          : studentB.localeCompare(studentA);
      }

      if (orderBy === 'professor_id') {
        const professorA = professors[a.professor_id] || '';
        const professorB = professors[b.professor_id] || '';
        return order === 'asc'
          ? professorA.localeCompare(professorB)
          : professorB.localeCompare(professorA);
      }

      if (['duration', 'hourly_rate', 'total_payment', 'price'].includes(orderBy)) {
        const valueA = parseFloat(a[orderBy] || 0);
        const valueB = parseFloat(b[orderBy] || 0);
        return order === 'asc' ? valueA - valueB : valueB - valueA;
      }

      if (['is_package', 'is_paid'].includes(orderBy)) {
        return order === 'asc'
          ? (a[orderBy] === b[orderBy] ? 0 : a[orderBy] ? 1 : -1)
          : (b[orderBy] === a[orderBy] ? 0 : b[orderBy] ? 1 : -1);
      }

      // Default case
      return order === 'asc'
        ? a[orderBy] > b[orderBy] ? 1 : -1
        : b[orderBy] > a[orderBy] ? 1 : -1;
    });

    // Update page if needed
    let newPage = page;
    const maxPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);
    if (page > maxPage) {
      newPage = maxPage;
    }

    setFilteredLessons(filtered);
    if (newPage !== page) {
      setPage(newPage);
    }
  }, [searchTerm, lessons, students, professors, timeFilter, paymentFilter, lessonTypeFilter, order, orderBy, dateRange, page, rowsPerPage]);

  // Helper function to update URL parameters
  const updateSearchParams = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== '' && value !== 'all' && value !== '0') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  // Format date range for display
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

  // Event handlers
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    setOrder(newOrder);
    setOrderBy(property);

    // Aggiorna i parametri URL
    const newParams = new URLSearchParams(searchParams);
    newParams.set('order', newOrder);
    newParams.set('orderBy', property);
    setSearchParams(newParams);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    updateSearchParams('page', newPage.toString());
  };

  const handleChangeRowsPerPage = (event) => {
    const value = parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0);
    updateSearchParams('rows', value.toString());
    updateSearchParams('page', '0');
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleSearchBlur = () => {
    updateSearchParams('search', searchTerm);
  };

  const handleSearchKeyDown = (event) => {
    if (event.keyCode === 13) {
      updateSearchParams('search', searchTerm);
      event.target.blur();
    }
  };

  const handleTimeFilterChange = (event) => {
    const value = event.target.value;

    if (value === 'custom') {
      setTimeFilter(value);
      setDateRangeDialogOpen(true);

      // Update URL directly for the time filter
      const newParams = new URLSearchParams(searchParams);
      newParams.set('time', value);
      setSearchParams(newParams);
    } else {
      // Create a new params object
      const newParams = new URLSearchParams(searchParams);

      // Remove custom date parameters
      newParams.delete('startDate');
      newParams.delete('endDate');
      newParams.delete('isRange');

      // Set or clear time parameter
      if (value !== 'all') {
        newParams.set('time', value);
      } else {
        newParams.delete('time');
      }

      // Apply the new parameters
      setSearchParams(newParams);

      // Update local state
      setTimeFilter(value);
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

  const handleDateRangeSelected = (newDateRange) => {
    setDateRange(newDateRange);

    // Create a new URLSearchParams object from the current params
    const newParams = new URLSearchParams(searchParams);

    // Update the date parameters
    if (newDateRange.isRange) {
      newParams.set('startDate', format(newDateRange.startDate, 'yyyy-MM-dd'));
      newParams.set('endDate', format(newDateRange.endDate, 'yyyy-MM-dd'));
      newParams.set('isRange', 'true');
    } else {
      newParams.set('startDate', format(newDateRange.startDate, 'yyyy-MM-dd'));
      newParams.delete('endDate');
      newParams.set('isRange', 'false');
    }

    // Always set time to custom for date filters
    newParams.set('time', 'custom');

    // Apply the new parameters directly
    setSearchParams(newParams);

    // Also update our local state
    setTimeFilter('custom');
  };

  // Navigation handlers
  const handleViewLesson = (id) => {
    navigate(`/lessons/${id}`, {
      state: { returnUrl: `${location.pathname}${location.search}` }
    });
  };

  const handleEditLesson = (id, event) => {
    event.stopPropagation();
    navigate(`/lessons/edit/${id}`);
  };

  const handleAddLesson = () => {
    navigate('/lessons/new');
  };

  // Payment handlers
  const handleTogglePayment = (lesson, event) => {
    event.stopPropagation();

    if (lesson.is_package) return;

    if (lesson.is_paid) {
      handleUpdatePaymentStatus(lesson, false, null);
    } else {
      setSelectedLesson(lesson);
      setPaymentDate(new Date());
      setPaymentDialogOpen(true);
    }
  };

  const handleUpdatePaymentStatus = async (lesson, isPaid, paymentDate, updatedPrice) => {
    try {
      setUpdating(true);

      const updateData = {
        is_paid: isPaid,
        payment_date: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : null,
        price: updatedPrice !== undefined ? updatedPrice : lesson.price
      };

      await lessonService.update(lesson.id, updateData);
      const lessonsData = await fetchLessons();
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

  // Delete handler
  const handleDeleteLesson = async (id, event) => {
    event.stopPropagation();

    if (window.confirm(`Sei sicuro di voler eliminare la lezione #${id}? Questa azione non può essere annullata.`)) {
      try {
        await lessonService.delete(id);
        const lessonsData = await fetchLessons();
        setLessons(lessonsData);
      } catch (err) {
        console.error('Error deleting lesson:', err);
        alert('Errore durante l\'eliminazione della lezione. Riprova più tardi.');
      }
    }
  };

  // SortableTableCell component for headers
  const SortableTableCell = ({ id, label, numeric = false }) => {
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

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
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

      {/* Filters */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          {/* Search field */}
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              variant="outlined"
              label="Cerca lezione per nomi"
              value={searchTerm}
              onChange={handleSearchChange}
              onBlur={handleSearchBlur}
              onKeyDown={handleSearchKeyDown}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>

          {/* Time period filter */}
          <Grid item xs={12} md={2.5}>
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
                    <InputAdornment position="end" sx={{ mr: 2 }}>
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

          {/* Filtro per tipo di lezione */}
          <Grid item xs={12} md={2.5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="lesson-type-filter-label">Tipo</InputLabel>
              <Select
                labelId="lesson-type-filter-label"
                value={lessonTypeFilter}
                onChange={handleLessonTypeFilterChange}
                label="Tipo"
                startAdornment={
                  <InputAdornment position="start">
                    <SchoolIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">Tutti i tipi</MenuItem>
                <MenuItem value="single">Lezioni singole</MenuItem>
                <MenuItem value="package">Da pacchetto</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Payment filter */}
          <Grid item xs={12} md={2}>
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
                <MenuItem value="all">Tutti</MenuItem>
                <MenuItem value="paid">Pagate</MenuItem>
                <MenuItem value="unpaid">Non pagate</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Show only my lessons toggle (only for admin) */}
          {isAdmin() && (
            <Grid item xs={12} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showOnlyMine}
                    onChange={handleToggleShowMine}
                    color="primary"
                  />
                }
                label="Le mie lezioni"
              />
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Lessons table */}
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
                <TableCell colSpan={isAdmin() ? 10 : 9} align="center">
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
                              <Typography variant="caption" color="error" component="span" sx={{ ml: 0.5 }}>
                                !
                              </Typography>
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
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina">
                        <IconButton
                          color="error"
                          onClick={(e) => handleDeleteLesson(lesson.id, e)}
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

      {/* Payment dialog */}
      <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog}>
        <DialogTitle>Conferma Pagamento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {isAdmin() && (
              <TextField
                fullWidth
                label="Prezzo Lezione"
                type="number"
                value={selectedLesson?.price || selectedLesson?.duration * 20 || 0}
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
        onApply={handleDateRangeSelected}  // Qui viene utilizzata la funzione
        initialDateRange={dateRange}
      />
    </Box>
  );
}

export default LessonListPage;