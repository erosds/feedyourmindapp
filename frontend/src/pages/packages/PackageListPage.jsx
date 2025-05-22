// src/pages/packages/PackageListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
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
import { format, parseISO, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { DatePicker } from '@mui/x-date-pickers';

import InfoIcon from '@mui/icons-material/Info';
import DateRangePickerDialog from '../../components/common/DateRangePickerDialog';
import CalendarIcon from '@mui/icons-material/CalendarMonth';


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
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
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
  const [priceValue, setPriceValue] = useState(0);
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
  const [expiryFilter, setExpiryFilter] = useState(searchParams.get('expiry') || 'all');

  const formatDateForDisplay = () => {
    if (expiryFilter === 'custom') {
      if (dateRange.isRange) {
        return `${format(dateRange.startDate, 'dd/MM/yyyy')} - ${format(dateRange.endDate, 'dd/MM/yyyy')}`;
      } else {
        return format(dateRange.startDate, 'dd/MM/yyyy');
      }
    }
    return '';
  };

  const handleExpiryFilterChange = (event) => {
    const value = event.target.value;

    if (value === 'custom') {
      setExpiryFilter(value);
      setDateRangeDialogOpen(true);

      // Update URL directly for the filter
      const newParams = new URLSearchParams(searchParams);
      newParams.set('expiry', value);
      setSearchParams(newParams);
    } else {
      // Create a new params object
      const newParams = new URLSearchParams(searchParams);

      // Remove custom date parameters
      newParams.delete('startDate');
      newParams.delete('endDate');
      newParams.delete('isRange');

      // Set or clear expiry parameter
      if (value !== 'all') {
        newParams.set('expiry', value);
      } else {
        newParams.delete('expiry');
      }

      // Apply the new parameters
      setSearchParams(newParams);

      // Update local state
      setExpiryFilter(value);
      setDateRange({
        startDate: new Date(),
        endDate: new Date(),
        isRange: false
      });
    }
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

    // Always set expiry to custom for date filters
    newParams.set('expiry', 'custom');

    // Apply the new parameters directly
    setSearchParams(newParams);

    // Also update our local state
    setExpiryFilter('custom');
  };

  // State for sorting
  const [order, setOrder] = useState(searchParams.get('order') || 'desc');
  const [orderBy, setOrderBy] = useState(searchParams.get('orderBy') || 'id');

  // Function to handle sort request
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

  // Aggiungi queste funzioni nel componente
  const handleOpenInfoDialog = () => {
    setInfoDialogOpen(true);
  };

  const handleCloseInfoDialog = () => {
    setInfoDialogOpen(false);
  };


  const handleTogglePayment = (pkg, event) => {
    event.stopPropagation(); // Impedisce la navigazione ai dettagli

    // Se il pacchetto ha un prezzo da concordare, non consentiamo il pagamento rapido
    if (parseFloat(pkg.package_cost) === 0) {
      handleViewPackage(pkg.id);
      return;
    }

    // Per i pacchetti non pagati o con acconto
    if (!pkg.is_paid) {
      // Calcola l'importo rimanente
      const remainingAmount = Math.max(0, parseFloat(pkg.package_cost) - parseFloat(pkg.total_paid || 0));

      // Imposta il pacchetto selezionato
      setSelectedPackage(pkg);

      // Imposta il valore del prezzo al rimanente
      setPriceValue(remainingAmount);

      // Apri il dialog di pagamento
      setPaymentDialogOpen(true);
    } else {
      // Se è già pagato, naviga ai dettagli del pacchetto
      handleViewPackage(pkg.id);
    }
  };

  const handleUpdatePaymentStatus = async (pkg, updatedPrice) => {
    try {
      setUpdating(true);

      // Prima, ottieni i dati completi del pacchetto
      const packageResponse = await packageService.getById(pkg.id);
      const currentPackageData = packageResponse.data;

      // Prepara i dati da aggiornare mantenendo gli student_ids esistenti
      const updateData = {
        ...currentPackageData,              // Include tutti i dati attuali
        package_cost: updatedPrice || currentPackageData.package_cost
      };

      // Chiama il servizio per aggiornare il pacchetto
      await packageService.update(pkg.id, updateData);

      // Ricarica i pacchetti
      const packagesResponse = await packageService.getAll();
      // Aggiorna lo stato dei pacchetti ma NON resettare la pagina
      setPackages(packagesResponse.data);
    } catch (err) {
      console.error('Error updating package price:', err);
      console.error('Detailed error:', err.response?.data || err.message);
      alert('Errore durante l\'aggiornamento del prezzo. Riprova più tardi.');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPackage) return;

    try {
      setUpdating(true);

      // Formato della data
      const formattedDate = format(paymentDate, 'yyyy-MM-dd');

      // Aggiungi un nuovo pagamento al pacchetto
      await packageService.addPayment(selectedPackage.id, {
        amount: parseFloat(priceValue),
        payment_date: formattedDate,
      });

      // Ricarica i pacchetti
      const packagesResponse = await packageService.getAll();
      setPackages(packagesResponse.data);

      // Chiudi il dialog
      setPaymentDialogOpen(false);
      setSelectedPackage(null);

    } catch (err) {
      console.error('Error adding payment:', err);
      alert('Errore durante l\'aggiunta del pagamento. Riprova più tardi.');
    } finally {
      setUpdating(false);
    }
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

    // Filter by expiry date period
    if (expiryFilter !== 'all') {
      filtered = filtered.filter(pkg => {
        const expiryDate = parseISO(pkg.expiry_date);

        switch (expiryFilter) {
          case 'this_week': {
            // Get the start and end of the current week
            const today = new Date();
            const dayOfWeek = today.getDay() || 7; // 0 is Sunday, convert to 7
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - dayOfWeek + 1); // Monday
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
            endOfWeek.setHours(23, 59, 59, 999);

            return expiryDate >= startOfWeek && expiryDate <= endOfWeek;
          }
          case 'next_week': {
            // Get the start and end of next week
            const today = new Date();
            const dayOfWeek = today.getDay() || 7;
            const startOfNextWeek = new Date(today);
            startOfNextWeek.setDate(today.getDate() - dayOfWeek + 8); // Next Monday
            startOfNextWeek.setHours(0, 0, 0, 0);

            const endOfNextWeek = new Date(startOfNextWeek);
            endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // Next Sunday
            endOfNextWeek.setHours(23, 59, 59, 999);

            return expiryDate >= startOfNextWeek && expiryDate <= endOfNextWeek;
          }
          case 'this_month': {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

            return expiryDate >= startOfMonth && expiryDate <= endOfMonth;
          }
          case 'custom': {
            if (dateRange.isRange) {
              return isWithinInterval(expiryDate, {
                start: startOfDay(dateRange.startDate),
                end: endOfDay(dateRange.endDate)
              });
            } else {
              return isWithinInterval(expiryDate, {
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
          case 'partial':
            return !pkg.is_paid && parseFloat(pkg.total_paid) > 0;
          case 'unpaid':
            return !pkg.is_paid && parseFloat(pkg.total_paid) <= 0;
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
        <Box display="flex" alignItems="center">
          <Tooltip title="Informazioni sui pacchetti">
            <IconButton
              color="primary"
              onClick={handleOpenInfoDialog}
              sx={{ mr: 1 }}
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddPackage}
          >
            Nuovo pacchetto
          </Button>
        </Box>
      </Box>

      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              variant="outlined"
              label="Cerca pacchetto per nomi"
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
          <Grid item xs={12} md={2.5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="time-filter-label">Data di inizio</InputLabel>
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

          {/* Expiry date filter */}
          <Grid item xs={12} md={2.5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="expiry-filter-label">Data scadenza</InputLabel>
              <Select
                labelId="expiry-filter-label"
                value={expiryFilter}
                onChange={handleExpiryFilterChange}
                label="Data scadenza"
                startAdornment={
                  <InputAdornment position="start">
                    <CalendarIcon />
                  </InputAdornment>
                }
                endAdornment={
                  expiryFilter === 'custom' && (
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
                <MenuItem value="all">Tutte le scadenze</MenuItem>
                <MenuItem value="this_week">Questa settimana</MenuItem>
                <MenuItem value="next_week">Settimana prossima</MenuItem>
                <MenuItem value="this_month">Questo mese</MenuItem>
                <MenuItem value="custom">
                  {expiryFilter === 'custom' && dateRange ?
                    formatDateForDisplay() :
                    'Personalizzato...'
                  }
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Filtro per stato del pacchetto */}
          <Grid item xs={12} md={2}>
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
                <MenuItem value="paid">Pagati</MenuItem>
                <MenuItem value="partial">Con acconto</MenuItem>
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
              <SortableTableCell id="remaining_hours" label="Ore Tot." />
              <SortableTableCell id="remaining_hours" label="Ore Rim." />
              <SortableTableCell id="status" label="Stato" />
              <SortableTableCell id="is_paid" label="Pagamento" />
              {isAdmin() && (
                <SortableTableCell id="package_cost" label="Prezzo" numeric={true} />
              )}
              {isAdmin() && (
                <SortableTableCell id="total_paid" label="Versato" numeric={true} />
              )}
              <TableCell align="right">Azioni</TableCell>
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

                    <TableCell>
                      {parseFloat(pkg.total_hours).toFixed(1)}
                    </TableCell>
                    <TableCell>
                      {parseFloat(pkg.remaining_hours).toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          pkg.status === 'in_progress'
                            ? 'In corso'
                            : pkg.status === 'completed'
                              ? 'Completato'
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
                      {pkg.is_paid ? (
                        <Chip
                          label="Pagato"
                          color="success"
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPackage(pkg.id);
                          }}
                        />
                      ) : parseFloat(pkg.total_paid) > 0 ? (
                        <Tooltip title={`€${parseFloat(pkg.total_paid).toFixed(2)} di €${parseFloat(pkg.package_cost).toFixed(2)}`}>
                          <Chip
                            label="Acconto"
                            color="warning"
                            size="small"
                            variant="outlined"
                            onClick={(e) => handleTogglePayment(pkg, e)}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label="Non pagato"
                          color="error"
                          size="small"
                          variant="outlined"
                          onClick={(e) => handleTogglePayment(pkg, e)}
                        />
                      )}
                    </TableCell>
                    {isAdmin() && (
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "normal", // Always normal weight
                          color: "text.primary"  // Always black
                        }}
                      >
                        {parseFloat(pkg.package_cost) === 0 ? (
                          <>
                            <Chip
                              label="da concordare"
                              size="small"
                              sx={{ fontSize: '0.6rem', height: 20 }}
                            />
                          </>
                        ) : (
                          `€${parseFloat(pkg.package_cost).toFixed(2)}`
                        )}
                      </TableCell>
                    )}
                    {isAdmin() && (
                      <TableCell
                        align="right"
                        sx={{
                          color: parseFloat(pkg.total_paid) == parseFloat(pkg.package_cost) && parseFloat(pkg.package_cost) !== 0 ? "success.main" :
                            parseFloat(pkg.total_paid) > 0 ? "warning.main" : "text.secondary"
                        }}
                      >
                        {`€${parseFloat(pkg.total_paid).toFixed(2)}`}
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
            <TextField
              fullWidth
              label="Importo Pagamento"
              type="number"
              value={priceValue}
              onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
              }}
            />
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
      <Dialog
        open={infoDialogOpen}
        onClose={handleCloseInfoDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Informazioni sullo stato dei pacchetti</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', textAlign: 'justify' }}>
            I pacchetti possono trovarsi in diversi stati, indicati da colori diversi:
          </Typography>

          <Box sx={{ mb: 3, ml: 1, mr: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="In corso"
                  color="primary"
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                Pacchetto <b>attivo</b>, entro la data di scadenza.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="In scadenza"
                  color="warning"
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                Pacchetto <b>attivo</b> che scadrà al termine della settimana corrente.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="Scaduto"
                  color="error"
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                Pacchetto con <b>data di scadenza superata</b>, ma con ore ancora disponibili e/o non ancora pagato.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
              <Box>
                <Chip
                  label="Completato"
                  color="default"
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                Pacchetto <b>terminato</b>: scaduto, pagato e senza ore rimanenti.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', textAlign: 'justify' }}>
            Da ricordare:
          </Typography>

          <Typography variant="body2" paragraph sx={{ textAlign: 'justify', ml: 1, mr: 2 }}>
            • I pacchetti <b>scaduti con ore rimanenti</b> possono essere estesi cliccando sul pulsante <Button
              variant="outlined"
              color="secondary"
              size="small"
              sx={{ fontSize: '0.75rem', py: 0, ml: 0.5, mr: 0.5, minWidth: '130px' }}
            >
              Estendi scadenza +1
            </Button> in alto a destra nella pagina del pacchetto.
          </Typography>

          <Typography variant="body2" paragraph sx={{ textAlign: 'justify', ml: 1, mr: 2 }}>
            • L'estensione aggiunge <b>una settimana</b> alla data di scadenza e riattiva il pacchetto.
          </Typography>

          <Typography variant="body2" paragraph sx={{ textAlign: 'justify', ml: 1, mr: 2 }}>
            • Nei casi in cui un pacchetto è <b>in scadenza</b> e ha <b>poche ore rimanenti</b>, anziché estenderlo è possibile far partire il nuovo pacchetto <b>in sovrapposizione</b>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInfoDialog} color="primary">
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>
      {/* Date Range Picker Dialog */}
      <DateRangePickerDialog
        open={dateRangeDialogOpen}
        onClose={() => setDateRangeDialogOpen(false)}
        onApply={handleDateRangeSelected}
        initialDateRange={dateRange}
      />
    </Box>
  );
}

export default PackageListPage;