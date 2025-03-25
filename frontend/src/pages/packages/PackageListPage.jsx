// src/pages/packages/PackageListPage.jsx
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
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { packageService, studentService, lessonService } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

function PackageListPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [students, setStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [showActive, setShowActive] = useState(false);
  const [lessonsPerPackage, setLessonsPerPackage] = useState({});

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
    // Casi speciali per i formati di data
    if (orderBy === 'start_date') {
      return new Date(b.start_date) - new Date(a.start_date);
    }
    
    // Per i campi numerici
    if (['total_hours', 'remaining_hours', 'package_cost'].includes(orderBy)) {
      return parseFloat(b[orderBy]) - parseFloat(a[orderBy]);
    }
    
    // Per student_id, usa il nome mappato
    if (orderBy === 'student_id') {
      return (students[b.student_id] || '').localeCompare(students[a.student_id] || '');
    }
    
    // Per ordinare in base allo stato
    if (orderBy === 'status') {
      // Prima i pacchetti attivi
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
      return 0;
    }

    // Per ordinare in base al pagamento
    if (orderBy === 'is_paid') {
      return (b.is_paid === a.is_paid) ? 0 : b.is_paid ? -1 : 1;
    }
    
    // Per ottenere un ordinamento preciso in base alle ore rimanenti
    if (orderBy === 'remaining_calc') {
      const remainingA = getRemainingHours(a);
      const remainingB = getRemainingHours(b);
      return remainingB - remainingA;
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

  // Funzione per calcolare le ore utilizzate e rimanenti di ogni pacchetto
  const calculatePackageStats = (packageId, lessons) => {
    const packageLessons = lessons.filter(lesson => 
      lesson.package_id === packageId && lesson.is_package
    );
    
    const usedHours = packageLessons.reduce((total, lesson) => 
      total + parseFloat(lesson.duration), 0
    );
    
    return {
      usedHours,
      lessonsCount: packageLessons.length
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Carica tutti i pacchetti
        const packagesResponse = await packageService.getAll();
        setPackages(packagesResponse.data);
        
        // Carica tutti gli studenti per mostrare i loro nomi
        const studentsResponse = await studentService.getAll();
        const studentsMap = {};
        studentsResponse.data.forEach(student => {
          studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudents(studentsMap);

        // Carica tutte le lezioni per calcolare le ore utilizzate
        const lessonsResponse = await lessonService.getAll();
        
        // Crea una mappa di lezioni per pacchetto
        const lessonsMap = {};
        packagesResponse.data.forEach(pkg => {
          lessonsMap[pkg.id] = calculatePackageStats(
            pkg.id, 
            lessonsResponse.data
          );
        });
        setLessonsPerPackage(lessonsMap);
        
        // Imposta i pacchetti filtrati
        setFilteredPackages(packagesResponse.data);
      } catch (err) {
        console.error('Error fetching packages:', err);
        setError('Impossibile caricare la lista dei pacchetti. Riprova più tardi.');
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
        const studentName = students[pkg.student_id] || '';
        return studentName.toLowerCase().includes(lowercaseSearch);
      });
    }
    
    // Filtra per stato (attivo o tutti)
    if (showActive) {
      filtered = filtered.filter(pkg => pkg.status === 'in_progress');
    }
    
    // Applica l'ordinamento
    const sortedFiltered = stableSort(filtered, getComparator(order, orderBy));
    setFilteredPackages(sortedFiltered);
    setPage(0); // Reset to first page after filtering
  }, [searchTerm, packages, students, showActive, order, orderBy]);

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

  const handleToggleActive = () => {
    setShowActive(!showActive);
  };

  const handleViewPackage = (id) => {
    navigate(`/packages/${id}`);
  };

  const handleEditPackage = (id, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli
    navigate(`/packages/edit/${id}`);
  };

  const handleAddPackage = () => {
    navigate('/packages/new');
  };

  const handleDeletePackage = async (id, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli
    
    try {
      // Prima ottieni le lezioni per questo pacchetto per mostrare all'utente
      const lessonsResponse = await lessonService.getAll();
      const packageLessons = lessonsResponse.data.filter(lesson => 
        lesson.package_id === id && lesson.is_package
      );
      
      let confirmMessage = `Sei sicuro di voler eliminare il pacchetto #${id}?`;
      
      // Se ci sono lezioni associate, avvisa l'utente che verranno eliminate anche quelle
      if (packageLessons.length > 0) {
        confirmMessage += `\n\nATTENZIONE: Questo pacchetto contiene ${packageLessons.length} lezioni che verranno eliminate:`;
        
        // Aggiungi informazioni sulle prime 5 lezioni (per non rendere il messaggio troppo lungo)
        const maxLessonsToShow = 5;
        packageLessons.slice(0, maxLessonsToShow).forEach(lesson => {
          const lessonDate = format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it });
          confirmMessage += `\n- Lezione #${lesson.id} del ${lessonDate} (${lesson.duration} ore)`;
        });
        
        // Se ci sono più di 5 lezioni, indica che ce ne sono altre
        if (packageLessons.length > maxLessonsToShow) {
          confirmMessage += `\n...e altre ${packageLessons.length - maxLessonsToShow} lezioni`;
        }
      }
      
      confirmMessage += "\n\nQuesta azione non può essere annullata.";
      
      if (window.confirm(confirmMessage)) {
        const response = await packageService.delete(id);
        
        // Mostra messaggio di conferma con dettagli sulle lezioni eliminate
        if (response.data && response.data.deleted_lessons_count > 0) {
          alert(`Pacchetto #${id} eliminato con successo insieme a ${response.data.deleted_lessons_count} lezioni associate.`);
        }
        
        // Aggiorna la lista dopo l'eliminazione
        const packagesResponse = await packageService.getAll();
        setPackages(packagesResponse.data);
        
        // Aggiorna le statistiche delle lezioni
        const updatedLessonsResponse = await lessonService.getAll();
        const lessonsMap = {};
        packagesResponse.data.forEach(pkg => {
          lessonsMap[pkg.id] = calculatePackageStats(
            pkg.id, 
            updatedLessonsResponse.data
          );
        });
        setLessonsPerPackage(lessonsMap);
        
        // Applica i filtri
        let filtered = [...packagesResponse.data];
        if (searchTerm.trim() !== '') {
          const lowercaseSearch = searchTerm.toLowerCase();
          filtered = filtered.filter((pkg) => {
            const studentName = students[pkg.student_id] || '';
            return studentName.toLowerCase().includes(lowercaseSearch);
          });
        }
        if (showActive) {
          filtered = filtered.filter(pkg => pkg.status === 'in_progress');
        }
        setFilteredPackages(filtered);
      }
    } catch (err) {
      console.error('Error deleting package:', err);
      alert('Errore durante l\'eliminazione del pacchetto. Riprova più tardi.');
    }
  };

  // Calcola le ore rimanenti in tempo reale
  const getRemainingHours = (pkg) => {
    const stats = lessonsPerPackage[pkg.id];
    if (!stats) return parseFloat(pkg.remaining_hours);
    
    // Calcola le ore rimanenti come differenza tra ore totali e ore utilizzate
    return parseFloat(pkg.total_hours) - stats.usedHours;
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
        <Typography variant="h4">Pacchetti</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddPackage}
        >
          Nuovo Pacchetto
        </Button>
      </Box>

      <Box mb={3} display="flex" alignItems="center">
        <TextField
          variant="outlined"
          label="Cerca pacchetto per studente"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1, mr: 2 }}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showActive}
              onChange={handleToggleActive}
              color="primary"
            />
          }
          label="Solo pacchetti attivi"
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <SortableTableCell id="id" label="ID" />
              <SortableTableCell id="student_id" label="Studente" />
              <SortableTableCell id="start_date" label="Data Inizio" />
              <SortableTableCell id="total_hours" label="Ore Totali" />
              <SortableTableCell id="remaining_calc" label="Ore Rimanenti" />
              <SortableTableCell id="package_cost" label="Costo" />
              <SortableTableCell id="status" label="Stato" />
              <SortableTableCell id="is_paid" label="Pagamento" />
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPackages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Nessun pacchetto trovato
                </TableCell>
              </TableRow>
            ) : (
              filteredPackages
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((pkg) => {
                  // Calcola le ore rimanenti in tempo reale
                  const remainingHours = getRemainingHours(pkg);
                  
                  return (
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
                      <TableCell>{students[pkg.student_id] || `Studente #${pkg.student_id}`}</TableCell>
                      <TableCell>
                        {format(parseISO(pkg.start_date), 'dd/MM/yyyy', { locale: it })}
                      </TableCell>
                      <TableCell>{pkg.total_hours}</TableCell>
                      <TableCell>{remainingHours.toFixed(1)}</TableCell>
                      <TableCell>€{parseFloat(pkg.package_cost).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip
                          label={remainingHours > 0 ? 'In corso' : 'Terminato'}
                          color={remainingHours > 0 ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pkg.is_paid ? 'Pagato' : 'Non pagato'}
                          color={pkg.is_paid ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
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
                            color="secondary"
                            onClick={(e) => handleDeletePackage(pkg.id, e)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
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
    </Box>
  );
}

export default PackageListPage;