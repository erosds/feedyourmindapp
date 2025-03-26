// src/pages/professors/ProfessorListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AdminPanelSettings as AdminIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function ProfessorListPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProfessors, setFilteredProfessors] = useState([]);

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
    // Ordinamento speciale per ruolo (admin prima)
    if (orderBy === 'is_admin') {
      return (b.is_admin === a.is_admin) ? 0 : b.is_admin ? -1 : 1;
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
    // Redirect if not admin
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }

    const fetchProfessors = async () => {
      try {
        setLoading(true);
        const response = await professorService.getAll();
        setProfessors(response.data);
        setFilteredProfessors(response.data);
      } catch (err) {
        console.error('Error fetching professors:', err);
        setError('Impossibile caricare la lista dei professori. Prova a riaggiornare la pagina.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfessors();
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      // Applica solo l'ordinamento se non c'è una ricerca
      const sortedProfessors = stableSort(professors, getComparator(order, orderBy));
      setFilteredProfessors(sortedProfessors);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = professors.filter((professor) => {
        const fullName = `${professor.first_name} ${professor.last_name}`.toLowerCase();
        return fullName.includes(lowercaseSearch) || professor.username.toLowerCase().includes(lowercaseSearch);
      });
      // Applica l'ordinamento ai risultati filtrati
      const sortedFiltered = stableSort(filtered, getComparator(order, orderBy));
      setFilteredProfessors(sortedFiltered);
    }
    setPage(0); // Reset to first page after search or sort
  }, [searchTerm, professors, order, orderBy]);

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

  const handleViewProfessor = (id) => {
    navigate(`/professors/${id}`);
  };

  const handleEditProfessor = (id, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli
    navigate(`/professors/edit/${id}`);
  };

  const handleAddProfessor = () => {
    navigate('/professors/new');
  };

  const handleDeleteProfessor = async (id, name, event) => {
    event.stopPropagation(); // Impedisce la navigazione alla vista dettagli
    
    if (window.confirm(`Sei sicuro di voler eliminare il professore "${name}"? Questa azione non può essere annullata.`)) {
      try {
        await professorService.delete(id);
        // Aggiorna la lista dopo l'eliminazione
        const response = await professorService.getAll();
        setProfessors(response.data);
        setFilteredProfessors(response.data);
      } catch (err) {
        console.error('Error deleting professor:', err);
        alert('Errore durante l\'eliminazione del professore. Riprova più tardi.');
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
        <Typography variant="h4">Professori</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddProfessor}
        >
          Nuovo Professore
        </Button>
      </Box>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          label="Cerca professore"
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
              <SortableTableCell id="username" label="Username" />
              <SortableTableCell id="is_admin" label="Ruolo" />
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProfessors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  Nessun professore trovato
                </TableCell>
              </TableRow>
            ) : (
              filteredProfessors
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((professor) => (
                  <TableRow 
                    key={professor.id}
                    hover
                    onClick={() => handleViewProfessor(professor.id)}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <TableCell>{professor.first_name}</TableCell>
                    <TableCell>{professor.last_name}</TableCell>
                    <TableCell>{professor.username}</TableCell>
                    <TableCell>
                      {professor.is_admin ? (
                        <Chip
                          icon={<AdminIcon fontSize="small" />}
                          label="Amministratore"
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      ) : (
                        <Chip
                          label="Professore"
                          color="default"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {isAdmin() && (
                        <>
                          <Tooltip title="Modifica">
                            <IconButton
                              color="primary"
                              onClick={(e) => handleEditProfessor(professor.id, e)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Elimina">
                            <IconButton
                              color="secondary"
                              onClick={(e) => handleDeleteProfessor(professor.id, `${professor.first_name} ${professor.last_name}`, e)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredProfessors.length}
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

export default ProfessorListPage;