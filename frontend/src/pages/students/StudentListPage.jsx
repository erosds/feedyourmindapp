import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
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
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Euro as EuroIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { studentService, lessonService } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

function StudentListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Stato per l'ordinamento
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('first_name');
  
  // Nuovo stato per il filtro pagamenti
  const [showingPendingPayments, setShowingPendingPayments] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [studentsWithPendingPayments, setStudentsWithPendingPayments] = useState([]);
  
  // Map per memorizzare gli importi dovuti
  const [pendingAmounts, setPendingAmounts] = useState({});
  const [unpaidLessonsMap, setUnpaidLessonsMap] = useState({});

  // Funzione per gestire la richiesta di cambio dell'ordinamento
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Funzione helper per l'ordinamento stabile
  const descendingComparator = (a, b, orderBy) => {
    // Caso speciale per l'importo dovuto
    if (orderBy === 'pendingAmount') {
      const amountA = pendingAmounts[a.id] || 0;
      const amountB = pendingAmounts[b.id] || 0;
      return amountB - amountA;
    }
    
    // Caso speciale per le date di nascita
    if (orderBy === 'birth_date') {
      // Gestisci i valori null o '1970-01-01' (che usiamo come segnaposto per valori nulli)
      if (!a.birth_date || a.birth_date === '1970-01-01') return 1;
      if (!b.birth_date || b.birth_date === '1970-01-01') return -1;
      return new Date(b.birth_date) - new Date(a.birth_date);
    }
    
    // Gestisci i valori null per email e telefono
    if ((orderBy === 'email' || orderBy === 'phone') && (a[orderBy] === null || b[orderBy] === null)) {
      if (a[orderBy] === null && b[orderBy] === null) return 0;
      if (a[orderBy] === null) return 1;
      if (b[orderBy] === null) return -1;
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
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await studentService.getAll();
        const studentsData = response.data;
        setStudents(studentsData);
        setFilteredStudents(studentsData);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Impossibile caricare la lista degli studenti. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Funzione per filtrare gli studenti con pagamenti in sospeso
  const fetchStudentsWithPendingPayments = async () => {
    if (showingPendingPayments) {
      // Se stiamo già mostrando gli studenti con pagamenti in sospeso, torniamo alla lista completa
      setShowingPendingPayments(false);
      
      // Aggiorna la lista filtrata in base alla ricerca corrente
      if (searchTerm.trim() === '') {
        const sortedStudents = stableSort(students, getComparator(order, orderBy));
        setFilteredStudents(sortedStudents);
      } else {
        applySearch(students, searchTerm);
      }
      return;
    }

    try {
      setLoadingPayments(true);
      
      // Cerca le lezioni non pagate
      const unpaidLessonsResponse = await lessonService.getAll();
      
      // Filtriamo solo le lezioni singole (non da pacchetto) che non sono state pagate
      const unpaidLessons = unpaidLessonsResponse.data.filter(
        lesson => !lesson.is_package && !lesson.is_paid
      );
      
      // Calcola l'importo totale dovuto per ogni studente
      const amountsPerStudent = {};
      const lessonsPerStudent = {};
      
      unpaidLessons.forEach(lesson => {
        const studentId = lesson.student_id;
        
        // Calcola l'importo in base al prezzo della lezione (se disponibile) o al prezzo previsto
        // Se il prezzo è 0 o non è impostato, usiamo la durata * 20€ come stima
        const lessonPrice = parseFloat(lesson.price) || (parseFloat(lesson.duration) * 20);
        
        // Incrementa l'importo dovuto dallo studente
        if (!amountsPerStudent[studentId]) {
          amountsPerStudent[studentId] = 0;
          lessonsPerStudent[studentId] = [];
        }
        
        amountsPerStudent[studentId] += lessonPrice;
        lessonsPerStudent[studentId].push(lesson);
      });
      
      setPendingAmounts(amountsPerStudent);
      setUnpaidLessonsMap(lessonsPerStudent);
      
      // Estrai gli ID degli studenti unici con lezioni non pagate
      const studentIdsWithPendingPayments = Object.keys(amountsPerStudent).map(Number);
      
      // Filtra gli studenti con questi ID
      const studentsWithPending = students.filter(
        student => studentIdsWithPendingPayments.includes(student.id)
      );
      
      setStudentsWithPendingPayments(studentsWithPending);
      setFilteredStudents(stableSort(studentsWithPending, getComparator(order, orderBy)));
      setShowingPendingPayments(true);
      setPage(0); // Torna alla prima pagina
    } catch (err) {
      console.error('Error fetching pending payments:', err);
      alert('Impossibile caricare i dati sui pagamenti in sospeso. Riprova più tardi.');
    } finally {
      setLoadingPayments(false);
    }
  };

  // Funzione per applicare la ricerca testuale
  const applySearch = (studentList, term) => {
    if (!term.trim()) return studentList;
    
    const lowercaseSearch = term.toLowerCase();
    return studentList.filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      return fullName.includes(lowercaseSearch);
    });
  };

  useEffect(() => {
    // Se stiamo mostrando gli studenti con pagamenti in sospeso, applichiamo la ricerca solo a quel sottoinsieme
    const sourceList = showingPendingPayments ? studentsWithPendingPayments : students;
    
    if (searchTerm.trim() === '') {
      // Applica solo l'ordinamento se non c'è una ricerca
      const sortedStudents = stableSort(sourceList, getComparator(order, orderBy));
      setFilteredStudents(sortedStudents);
    } else {
      // Cerca e poi ordina
      const filtered = applySearch(sourceList, searchTerm);
      const sortedFiltered = stableSort(filtered, getComparator(order, orderBy));
      setFilteredStudents(sortedFiltered);
    }
    setPage(0); // Reset to first page after search or sort
  }, [searchTerm, students, order, orderBy, showingPendingPayments, studentsWithPendingPayments]);

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

  const handleViewStudent = (id) => {
    navigate(`/students/${id}`);
  };

  const handleEditStudent = (id, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli
    navigate(`/students/edit/${id}`);
  };

  const handleAddStudent = () => {
    navigate('/students/new');
  };

  const handleDeleteStudent = async (id, name, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli
    
    if (window.confirm(`Sei sicuro di voler eliminare lo studente "${name}"? Questa azione non può essere annullata.`)) {
      try {
        await studentService.delete(id);
        // Aggiorna la lista dopo l'eliminazione
        const response = await studentService.getAll();
        setStudents(response.data);
        
        // Se stiamo mostrando i pagamenti in sospeso, aggiorna anche quella lista
        if (showingPendingPayments) {
          // Riapplica il filtro
          fetchStudentsWithPendingPayments();
        } else {
          setFilteredStudents(response.data);
        }
      } catch (err) {
        console.error('Error deleting student:', err);
        alert('Errore durante l\'eliminazione dello studente: ci sono delle lezioni associate a questo studente.');
      }
    }
  };

  // Funzione per visualizzare i dettagli delle lezioni non pagate di uno studente
  const handleViewUnpaidLessonsDetails = (studentId, event) => {
    event.stopPropagation(); // Previene la navigazione alla pagina di dettaglio dello studente
    
    const unpaidLessons = unpaidLessonsMap[studentId] || [];
    
    let message = "Lezioni non pagate:\n\n";
    
    unpaidLessons.forEach((lesson, index) => {
      const date = format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it });
      const duration = parseFloat(lesson.duration);
      const price = parseFloat(lesson.price) || (duration * 20);
      
      message += `${index + 1}. Data: ${date}, Durata: ${duration} ore, Importo: €${price.toFixed(2)}\n`;
    });
    
    message += `\nTotale: €${pendingAmounts[studentId].toFixed(2)}`;
    
    alert(message);
  };

  // Funzione per formattare la data di nascita, gestendo il caso null
  const formatBirthDate = (birthDate) => {
    if (!birthDate) return '-';
    
    try {
      // Verifica se la data è una stringa "1970-01-01" (timestamp Unix 0)
      if (birthDate === '1970-01-01') return '-';
      
      return format(parseISO(birthDate), 'dd/MM/yyyy', { locale: it });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
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
        <Typography variant="h4">Studenti</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant={showingPendingPayments ? "contained" : "outlined"}
            color={showingPendingPayments ? "secondary" : "primary"}
            onClick={fetchStudentsWithPendingPayments}
            disabled={loadingPayments}
            startIcon={loadingPayments ? <CircularProgress size={20} /> : <FilterIcon />}
          >
            {showingPendingPayments ? "Mostra tutti" : "Pagamenti in sospeso"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddStudent}
          >
            Nuovo Studente
          </Button>
        </Box>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          label="Cerca studente"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
        />
      </Box>
      
      {showingPendingPayments && (
        <Box mb={2}>
          <Chip 
            label="Filtro attivo: studenti con pagamenti in sospeso" 
            color="secondary" 
            onDelete={() => fetchStudentsWithPendingPayments()}
            sx={{ p: 1 }}
          />
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortableTableCell id="first_name" label="Nome" />
              <SortableTableCell id="last_name" label="Cognome" />
              <SortableTableCell id="birth_date" label="Data di Nascita" />
              <SortableTableCell id="email" label="Email" />
              <SortableTableCell id="phone" label="Telefono" />
              {showingPendingPayments && (
                <SortableTableCell id="pendingAmount" label="Importo dovuto" numeric />
              )}
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showingPendingPayments ? 7 : 6} align="center">
                  {showingPendingPayments 
                    ? "Nessuno studente con pagamenti in sospeso" 
                    : "Nessuno studente trovato"}
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((student) => (
                  <TableRow 
                    key={student.id}
                    hover
                    onClick={() => handleViewStudent(student.id)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <TableCell>{student.first_name}</TableCell>
                    <TableCell>{student.last_name}</TableCell>
                    <TableCell>
                      {formatBirthDate(student.birth_date)}
                    </TableCell>
                    <TableCell>{student.email || '-'}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    {showingPendingPayments && (
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
                            €{pendingAmounts[student.id]?.toFixed(2)}
                          </Typography>
                          <Tooltip title="Dettagli lezioni da pagare">
                            <IconButton 
                              size="small"
                              color="primary"
                              onClick={(e) => handleViewUnpaidLessonsDetails(student.id, e)}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Modifica">
                        <IconButton
                          color="primary"
                          onClick={(e) => handleEditStudent(student.id, e)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina">
                        <IconButton
                          color="secondary"
                          onClick={(e) => handleDeleteStudent(student.id, `${student.first_name} ${student.last_name}`, e)}
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
          count={filteredStudents.length}
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

export default StudentListPage;