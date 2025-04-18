// src/pages/packages/PackageListPage.jsx
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  InputAdornment,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Today as TodayIcon,
  Payment as PaymentIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { packageService, studentService, lessonService } from '../../services/api';
import { format, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { DatePicker } from '@mui/x-date-pickers';


function PackageListPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [students, setStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredPackages, setFilteredPackages] = useState([]);
  const { currentUser, isAdmin } = useAuth(); // Add isAdmin here
  // Aggiungi questi stati
  const [updating, setUpdating] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date());
  // Usa searchParams invece dello stato locale per i filtri
  const [searchParams, setSearchParams] = useSearchParams();
  // Inizializza gli stati dai parametri URL o dai valori predefiniti
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [timeFilter, setTimeFilter] = useState(searchParams.get('time') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '0', 10));
  const [rowsPerPage, setRowsPerPage] = useState(
    parseInt(searchParams.get('rows') || '10', 10)
  );

  // State for sorting
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');

  // Function to handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleTogglePayment = (pkg, event) => {
    event.stopPropagation(); // Impedisce la navigazione ai dettagli

    if (pkg.is_paid) {
      // Se è già pagato, imposta direttamente come non pagato
      handleUpdatePaymentStatus(pkg, false, null);
    } else {
      // Se non è pagato, apri il dialog per impostare la data di pagamento
      setSelectedPackage(pkg);
      setPaymentDate(new Date());
      setPaymentDialogOpen(true);
    }
  };

  const handleUpdatePaymentStatus = async (pkg, isPaid, paymentDate, updatedPrice) => {
    try {
      setUpdating(true);

      // Prima, ottieni i dati completi del pacchetto
      const packageResponse = await packageService.getById(pkg.id);
      const currentPackageData = packageResponse.data;

      // Prepara i dati da aggiornare mantenendo gli student_ids esistenti
      const updateData = {
        ...currentPackageData,              // Include tutti i dati attuali
        is_paid: isPaid,                    // Aggiorna solo i campi necessari
        payment_date: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : null,
        package_cost: updatedPrice || currentPackageData.package_cost
      };

      // Chiama il servizio per aggiornare il pacchetto
      await packageService.update(pkg.id, updateData);

      // Ricarica i pacchetti
      const packagesResponse = await packageService.getAll();
      // Aggiorna lo stato dei pacchetti ma NON resettare la pagina
      setPackages(packagesResponse.data);
    } catch (err) {
      console.error('Error updating payment status:', err);
      console.error('Detailed error:', err.response?.data || err.message);
      alert('Errore durante l\'aggiornamento dello stato di pagamento. Riprova più tardi.');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPayment = () => {
    if (selectedPackage) {
      // Solo gli admin possono modificare il prezzo
      const costToUse = isAdmin()
        ? selectedPackage.package_cost
        : 0; // Default zero per utenti non admin

      handleUpdatePaymentStatus(
        selectedPackage,
        true,
        paymentDate,
        costToUse
      );
    }
    setPaymentDialogOpen(false);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
  };

  // Aggiungi queste righe all'inizio della funzione PackageListPage, dopo l'inizializzazione degli stati
  const location = useLocation();

  // Gestione dei filtri iniziali che arrivano dalla dashboard
  useEffect(() => {
    if (location.state) {
      // Se c'è un filtro iniziale impostato dalla dashboard, applicalo
      if (location.state.initialFilter === 'expiring') {
        // Imposta il filtro per i pacchetti in scadenza
        setStatusFilter('expiring');
      } else if (location.state.initialFilter === 'expired') {
        // Imposta il filtro per i pacchetti scaduti
        setStatusFilter('expired');

        // Se è specificato anche un filtro di pagamento, applicalo
        if (location.state.paymentFilter) {
          setPaymentFilter(location.state.paymentFilter);
        }
      }

      // Applica filtri specifici se presenti
      if (location.state.statusFilter) {
        setStatusFilter(location.state.statusFilter);
      }
      if (location.state.paymentFilter) {
        setPaymentFilter(location.state.paymentFilter);
      }
    }
  }, [location.state]);

  // Helper function for sorting
  const descendingComparator = (a, b, orderBy) => {
    // Special cases for date formats
    if (orderBy === 'start_date' || orderBy === 'expiry_date' || orderBy === 'payment_date') {
      // Handle null dates for payment_date
      if (orderBy === 'payment_date') {
        if (!a[orderBy] && !b[orderBy]) return 0;
        if (!a[orderBy]) return 1;
        if (!b[orderBy]) return -1;
      }
      return new Date(b[orderBy]) - new Date(a[orderBy]);
    }

    // For numeric fields
    if (['total_hours', 'remaining_hours', 'package_cost'].includes(orderBy)) {
      return parseFloat(b[orderBy]) - parseFloat(a[orderBy]);
    }

    // For student_id, use the mapped name
    if (orderBy === 'student_id') {
      return (students[b.student_id] || '').localeCompare(students[a.student_id] || '');
    }

    // For status sorting
    if (orderBy === 'status') {
      const statusPriority = {
        'in_progress': 0,
        'expired': 1,
        'completed': 2
      };
      return statusPriority[b.status] - statusPriority[a.status];
    }

    // For payment status
    if (orderBy === 'is_paid') {
      return (b.is_paid === a.is_paid) ? 0 : b.is_paid ? -1 : 1;
    }

    // For other fields
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
    return 0;
  };

  const isPackageExpiring = (pkg) => {
    const expiryDate = parseISO(pkg.expiry_date);

    // Ottieni il lunedì della settimana corrente
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 0 per domenica, trasformato in 7
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - dayOfWeek + 1); // Lunedì della settimana corrente
    mondayThisWeek.setHours(0, 0, 0, 0); // Inizio della giornata

    // Ottieni il lunedì della settimana prossima (7 giorni dopo)
    const mondayNextWeek = new Date(mondayThisWeek);
    mondayNextWeek.setDate(mondayThisWeek.getDate() + 7);

    // Controlla se scade tra lunedì di questa settimana e lunedì della prossima
    return expiryDate > mondayThisWeek && expiryDate <= mondayNextWeek;
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  // Function for stable sorting
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

        // Load all packages
        const packagesResponse = await packageService.getAll();
        setPackages(packagesResponse.data);

        // Load all students to show their names
        const studentsResponse = await studentService.getAll();
        const studentsMap = {};
        studentsResponse.data.forEach(student => {
          studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudents(studentsMap);

        // Set filtered packages
        setFilteredPackages(packagesResponse.data);
      } catch (err) {
        console.error('Error fetching packages:', err);
        setError('Impossibile caricare i pacchetti. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...packages];

    // Filtra per termine di ricerca (nome studente)
    if (searchTerm.trim() !== '') {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((pkg) => {
        // Check if any of the students in the package match the search term
        return pkg.student_ids.some(studentId => {
          const studentName = students[studentId] || '';
          return studentName.toLowerCase().includes(lowercaseSearch);
        });
      });
    }

    // Filtra per periodo
    if (timeFilter !== 'all') {
      filtered = filtered.filter(pkg => {
        // Usa start_date per il filtro periodo
        const startDate = parseISO(pkg.start_date);
        switch (timeFilter) {
          case 'today':
            return isToday(startDate);
          case 'week':
            return isThisWeek(startDate);
          case 'month':
            return isThisMonth(startDate);
          case 'lastMonth': {
            const now = new Date();
            const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            return startDate.getMonth() === lastMonth && startDate.getFullYear() === lastMonthYear;
          }
          default:
            return true;
        }
      });
    }

    // Filtra per stato del pacchetto
    if (statusFilter !== 'all') {
      filtered = filtered.filter(pkg => {
        switch (statusFilter) {
          case 'in_progress':
            return pkg.status === 'in_progress' && !isPackageExpiring(pkg);
          case 'expiring':
            return pkg.status === 'in_progress' && isPackageExpiring(pkg);
          case 'expired':
            return pkg.status === 'expired';
          case 'completed':
            return pkg.status === 'completed';
          default:
            return true;
        }
      });
    }

    // Filtra per stato pagamento
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(pkg => {
        switch (paymentFilter) {
          case 'paid':
            return pkg.is_paid;
          case 'unpaid':
            return !pkg.is_paid;
          default:
            return true;
        }
      });
    }

    // Make sure sorting works with multi-student packages
    if (orderBy === 'student_id' || orderBy === 'student_ids') {
      filtered.sort((a, b) => {
        // Get the first student name for each package (or empty string if none)
        const studentNameA = a.student_ids.length > 0 ? (students[a.student_ids[0]] || '') : '';
        const studentNameB = b.student_ids.length > 0 ? (students[b.student_ids[0]] || '') : '';

        // Compare based on the direction
        return order === 'asc'
          ? studentNameA.localeCompare(studentNameB)
          : studentNameB.localeCompare(studentNameA);
      });
    } else {
      // Apply normal sorting for other fields
      const sortedFiltered = stableSort(filtered, getComparator(order, orderBy));
      filtered = sortedFiltered;
    }

    // Prima di impostare i dati filtrati, preserva la paginazione corrente
    // se il numero di elementi filtrati è sufficiente a mantenere la pagina attuale
    let newPage = page;
    const maxPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1);

    // Se la pagina corrente supera il nuovo maxPage, aggiustiamo a maxPage
    if (page > maxPage) {
      newPage = maxPage;
    }

    setFilteredPackages(filtered);
    // Imposta la nuova pagina solo se è diversa dalla corrente
    if (newPage !== page) {
      setPage(newPage);
    }
  }, [searchTerm, packages, students, timeFilter, statusFilter, paymentFilter, order, orderBy]);

  // Funzione di utilità per aggiornare i parametri di ricerca
  const updateSearchParams = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== '' && value !== 'all' && value !== '0') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
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

  const handleTimeFilterChange = (event) => {
    const value = event.target.value;
    setTimeFilter(value);
    updateSearchParams('time', value);
  };

  const handleStatusFilterChange = (event) => {
    const value = event.target.value;
    setStatusFilter(value);
    updateSearchParams('status', value);
  };

  const handlePaymentFilterChange = (event) => {
    const value = event.target.value;
    setPaymentFilter(value);
    updateSearchParams('payment', value);
  };

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

  // Modifica la funzione di navigazione al dettaglio
  const handleViewPackage = (id) => {
    // Aggiungi l'URL corrente (con filtri) come state
    navigate(`/packages/${id}`, {
      state: { returnUrl: `${location.pathname}${location.search}` }
    });
  };

  const handleEditPackage = (id, event) => {
    event.stopPropagation(); // Prevent navigation to details view
    navigate(`/packages/edit/${id}`);
  };

  const handleAddPackage = () => {
    navigate('/packages/new');
  };

  useEffect(() => {
    // Questo useEffect si attiva quando cambia la posizione o i parametri di ricerca
    const fetchAndApplyFilters = async () => {
      try {
        setLoading(true);

        // Carica i dati iniziali
        const packagesResponse = await packageService.getAll();
        setPackages(packagesResponse.data);

        // ... altro codice per caricare studenti, ecc.

        // Importante: aggiorna lo stato dei filtri basandosi sull'URL
        // Questo fa sì che i filtri vengano applicati correttamente ai dati
        setPage(parseInt(searchParams.get('page') || '0', 10));
        setRowsPerPage(parseInt(searchParams.get('rows') || '10', 10));
        setSearchTerm(searchParams.get('search') || '');
        setTimeFilter(searchParams.get('time') || 'all');
        setStatusFilter(searchParams.get('status') || 'all');
        setPaymentFilter(searchParams.get('payment') || 'all');

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Impossibile caricare i dati. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchAndApplyFilters();
  }, [location.key]); // location.key cambia ad ogni navigazione


  const handleDeletePackage = async (id, event) => {
    event.stopPropagation(); // Prevent navigation to details view

    try {
      // First get lessons for this package to show to user
      const lessonsResponse = await lessonService.getAll();
      const packageLessons = lessonsResponse.data.filter(lesson =>
        lesson.package_id === id && lesson.is_package
      );

      let confirmMessage = `Sei sicuro di voler eliminare il pacchetto #${id}?`;

      // If there are associated lessons, warn the user they will be deleted too
      if (packageLessons.length > 0) {
        confirmMessage += `\n\nATTENZIONE: Questo pacchetto contiene ${packageLessons.length} lezioni che verranno eliminate:`;

        // Add information about the first 5 lessons (to keep message reasonable)
        const maxLessonsToShow = 5;
        packageLessons.slice(0, maxLessonsToShow).forEach(lesson => {
          const lessonDate = format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it });
          confirmMessage += `\n- Lezione #${lesson.id} del ${lessonDate} (${lesson.duration} ore)`;
        });

        // If there are more than 5 lessons, indicate there are more
        if (packageLessons.length > maxLessonsToShow) {
          confirmMessage += `\n...e altre ${packageLessons.length - maxLessonsToShow} lezioni`;
        }
      }

      confirmMessage += "\n\nQuesta azione non può essere annullata.";

      if (window.confirm(confirmMessage)) {
        await packageService.delete(id);

        // Reload packages after deletion
        const packagesResponse = await packageService.getAll();
        setPackages(packagesResponse.data);
      }
    } catch (err) {
      console.error('Error deleting package:', err);
      alert('Errore durante l\'eliminazione del pacchetto. Riprova più tardi.');
    }
  };

  // SortableTableCell component for column headers
  const SortableTableCell = ({ id, label, numeric, width }) => {
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
          width: width || 'auto', // Usa la larghezza specificata o auto
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
        <Typography variant="h4">Pacchetti</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddPackage}
        >
          Nuovo pacchetto
        </Button>
      </Box>

      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3.5}>
            <TextField
              fullWidth
              variant="outlined"
              label="Cerca pacchetto per nome studente"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown} // Aggiungi l'evento onKeyDown
              onBlur={handleSearchBlur} // Aggiungi l'evento onBlur
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          </Grid>

          {/* Filtro per periodo */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="time-filter-label">Data di Inizio</InputLabel>
              <Select
                labelId="time-filter-label"
                value={timeFilter}
                onChange={handleTimeFilterChange}
                label="Data di Inizio"
                startAdornment={
                  <InputAdornment position="start">
                    <TodayIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">Tutti i periodi</MenuItem>
                <MenuItem value="today">Oggi</MenuItem>
                <MenuItem value="week">Questa settimana</MenuItem>
                <MenuItem value="month">Questo mese</MenuItem>
                <MenuItem value="lastMonth">Il mese scorso</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Filtro per stato del pacchetto */}
          <Grid item xs={12} md={2.5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="status-filter-label">Stato</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Stato"
                startAdornment={
                  <InputAdornment position="start">
                    <TimerIcon />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">Tutti</MenuItem>
                <MenuItem value="expiring">In scadenza</MenuItem>
                <MenuItem value="in_progress">In corso</MenuItem>
                <MenuItem value="expired">Scaduti</MenuItem>
                <MenuItem value="completed">Completati</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Filtro per pagamento */}
          <Grid item xs={12} md={2.5}>
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
                <MenuItem value="paid">Pagati</MenuItem>
                <MenuItem value="unpaid">Non pagati</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <SortableTableCell id="id" label="ID" />
              <SortableTableCell id="student_ids" label="Studente/i" />
              <SortableTableCell id="start_date" label="Inizio" />
              <SortableTableCell id="expiry_date" label="Scadenza" />
              <SortableTableCell id="total_hours" label="Ore Tot." />
              <SortableTableCell id="remaining_hours" label="Ore Rim." />
              <SortableTableCell id="status" label="Stato" />
              <SortableTableCell id="is_paid" label="Pagamento" />
              <SortableTableCell id="payment_date" label="Data Pagamento" />
              {isAdmin() && (
                <SortableTableCell id="package_cost" label="Prezzo" numeric={true} />
              )}              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPackages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  Nessun pacchetto presente
                </TableCell>
              </TableRow>
            ) : (
              filteredPackages
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((pkg) => (
                  <TableRow
                    key={pkg.id}
                    hover
                    onClick={() => handleViewPackage(pkg.id)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <TableCell>#{pkg.id}</TableCell>
                    <TableCell sx={{ width: 190, maxWidth: 190 }}>
                      <Box>
                        {pkg.student_ids.map(studentId => (
                          <Typography
                            key={studentId}
                            variant="body2"
                            component="div"
                            sx={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {students[studentId] || `Studente #${studentId}`}
                          </Typography>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(pkg.start_date), 'dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography component="span" variant="inherit">
                          {format(parseISO(pkg.expiry_date), 'dd/MM/yyyy', { locale: it })}
                        </Typography>
                        {pkg.extension_count > 0 && (
                          <Chip
                            label={`+${pkg.extension_count}`}
                            color="secondary"
                            size="small"
                            sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    <TableCell>{parseFloat(pkg.total_hours).toFixed(1)}</TableCell>
                    <TableCell sx={{
                      fontWeight: parseFloat(pkg.remaining_hours) > 0
                        ? (pkg.status !== 'in_progress' ? 'bold' : '')
                        : ''
                    }}>
                      {parseFloat(pkg.remaining_hours).toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          pkg.status === 'in_progress'
                            ? 'In corso'
                            : pkg.status === 'completed'
                              ? 'Terminato'
                              : pkg.status === 'expired'
                                ? 'Scaduto'
                                : 'In corso'
                        }
                        color={
                          pkg.status === 'in_progress'
                            ? (isPackageExpiring(pkg) ? 'warning' : 'primary')
                            : pkg.status === 'expired'
                              ? 'error'
                              : 'default'
                        }
                        size="small"
                      />

                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pkg.is_paid ? 'Pagato' : 'Non pagato'}
                        color={pkg.is_paid ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                        onClick={(e) => handleTogglePayment(pkg, e)}
                        disabled={updating}
                        sx={{ cursor: 'pointer' }}
                      />
                    </TableCell>
                    <TableCell>
                      {pkg.payment_date ? format(parseISO(pkg.payment_date), 'dd/MM/yyyy', { locale: it }) : '-'}
                    </TableCell>
                    {isAdmin() && (
                      <TableCell
                        align="right"
                        sx={{
                          color: !pkg.is_paid || parseFloat(pkg.package_cost) === 0
                            ? "error.main"
                            : "success.main",
                          fontWeight: !pkg.is_paid || parseFloat(pkg.package_cost) === 0
                            ? "bold"
                            : "normal"
                        }}
                      >
                        €{parseFloat(pkg.package_cost).toFixed(2)}
                        {parseFloat(pkg.package_cost) === 0 && (
                          <Typography variant="caption" color="error" component="span" sx={{ ml: 0.5 }}>
                            (da inserire)
                          </Typography>
                        )}
                      </TableCell>
                    )}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        minWidth: 'auto'
                      }}>
                        <Tooltip title="Modifica">
                          <IconButton
                            color="primary"
                            onClick={(e) => handleEditPackage(pkg.id, e)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Elimina">
                          <IconButton
                            color="error"
                            onClick={(e) => handleDeletePackage(pkg.id, e)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredPackages.length}
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
                label="Prezzo Pacchetto"
                type="number"
                value={selectedPackage?.package_cost || 0}
                onChange={(e) => {
                  const updatedPackage = {
                    ...selectedPackage,
                    package_cost: parseFloat(e.target.value) || 0
                  };
                  setSelectedPackage(updatedPackage);
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
    </Box>
  );
}

export default PackageListPage;