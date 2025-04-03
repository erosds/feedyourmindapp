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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { studentService, packageService } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

function StudentListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [studentPackages, setStudentPackages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Stato per l'ordinamento
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('first_name');

  // Funzione per gestire la richiesta di cambio dell'ordinamento
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Funzione helper per l'ordinamento stabile
  const descendingComparator = (a, b, orderBy) => {
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

    // Caso speciale per l'ordinamento del pacchetto
    if (orderBy === 'package') {
      const packageA = studentPackages[a.id];
      const packageB = studentPackages[b.id];

      // Definisci una priorità per gli stati del pacchetto
      const packageStatusPriority = {
        'in_progress': 1,
        'expired': 0,
        'completed': 2,
        null: 3 // Nessun pacchetto
      };

      // Se entrambi gli studenti hanno pacchetti, confronta gli stati
      if (packageA && packageB) {
        return packageStatusPriority[packageA.status] - packageStatusPriority[packageB.status];
      }

      // Gestisci casi in cui uno o entrambi gli studenti non hanno pacchetti
      if (!packageA && !packageB) return 0;
      if (!packageA) return 1;
      if (!packageB) return -1;

      return 0;
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

  // Modificare fetchStudentPackages per usare Promise.all e ridurre le chiamate
const fetchStudentPackages = async (studentsData) => {
  try {
    // Carica i pacchetti per TUTTI gli studenti in parallelo
    const packagesResponses = await Promise.all(
      studentsData.map(student => packageService.getByStudent(student.id))
    );
    
    // Crea la mappa dei pacchetti
    const packagesMap = packagesResponses.reduce((acc, response, index) => {
      const student = studentsData[index];
      const sortedPackages = response.data.sort((a, b) => 
        new Date(b.start_date) - new Date(a.start_date)
      );
      
      acc[student.id] = sortedPackages.length > 0 ? sortedPackages[0] : null;
      return acc;
    }, {});
    
    setStudentPackages(packagesMap);
  } catch (err) {
    console.error('Error fetching student packages:', err);
  }
};

  // Funzione per ottenere lo stato del pacchetto come componente
  const getPackageStatusChip = (studentId) => {
    const lastPackage = studentPackages[studentId];
    
    if (!lastPackage) {
      return (
        <Typography variant="caption" color="text.secondary">
          Nessun pacchetto
        </Typography>
      );
    }
    
    let chipColor, chipLabel;
    switch (lastPackage.status) {
      case 'in_progress':
        chipColor = 'primary';
        chipLabel = 'In corso';
        break;
      case 'completed':
        chipColor = 'success';
        chipLabel = 'Terminato';
        break;
      case 'expired':
        chipColor = 'error';
        chipLabel = 'Scaduto';
        break;
      default:
        chipColor = 'default';
        chipLabel = 'Non definito';
    }
    
    return (
      <Chip
        label={chipLabel}
        color={chipColor}
        variant="outlined"
        size="small"
      />
    );
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await studentService.getAll();
        const studentsData = response.data;
        setStudents(studentsData);
        setFilteredStudents(studentsData);
        
        // Carica i pacchetti per tutti gli studenti
        await fetchStudentPackages(studentsData);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Impossibile caricare la lista degli studenti. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      // Applica solo l'ordinamento se non c'è una ricerca
      const sortedStudents = stableSort(students, getComparator(order, orderBy));
      setFilteredStudents(sortedStudents);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = students.filter((student) => {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        return fullName.includes(lowercaseSearch);
      });
      // Applica l'ordinamento ai risultati filtrati
      const sortedFiltered = stableSort(filtered, getComparator(order, orderBy));
      setFilteredStudents(sortedFiltered);
    }
    setPage(0); // Reset to first page after search or sort
  }, [searchTerm, students, order, orderBy, studentPackages]);

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
        setFilteredStudents(response.data);
      } catch (err) {
        console.error('Error deleting student:', err);
        alert('Errore durante l\'eliminazione dello studente: ci sono delle lezioni associate a questo studente.');
      }
    }
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
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddStudent}
        >
          Nuovo Studente
        </Button>
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

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortableTableCell id="first_name" label="Nome" />
              <SortableTableCell id="last_name" label="Cognome" />
              <SortableTableCell id="birth_date" label="Data di Nascita" />
              <SortableTableCell id="email" label="Email" />
              <SortableTableCell id="phone" label="Telefono" />
              <SortableTableCell id="package" label="Ultimo Pacchetto" />
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nessuno studente trovato
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
                    <TableCell>
                      {getPackageStatusChip(student.id)}
                    </TableCell>
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