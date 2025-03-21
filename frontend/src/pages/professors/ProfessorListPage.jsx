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
        setError('Impossibile caricare la lista dei professori. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfessors();
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProfessors(professors);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = professors.filter((professor) => {
        const fullName = `${professor.first_name} ${professor.last_name}`.toLowerCase();
        return fullName.includes(lowercaseSearch) || professor.username.toLowerCase().includes(lowercaseSearch);
      });
      setFilteredProfessors(filtered);
    }
    setPage(0); // Reset to first page after search
  }, [searchTerm, professors]);

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

  const handleEditProfessor = (id) => {
    navigate(`/professors/edit/${id}`);
  };

  const handleAddProfessor = () => {
    navigate('/professors/new');
  };

  const handleDeleteProfessor = async (id, name) => {
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Cognome</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Ruolo</TableCell>
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
                  <TableRow key={professor.id}>
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
                    <TableCell align="right">
                      <Tooltip title="Visualizza dettagli">
                        <IconButton
                          color="primary"
                          onClick={() => handleViewProfessor(professor.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {isAdmin() && (
                        <>
                          <Tooltip title="Modifica">
                            <IconButton
                              color="secondary"
                              onClick={() => handleEditProfessor(professor.id)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Elimina">
                            <IconButton
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProfessor(professor.id, `${professor.first_name} ${professor.last_name}`);
                              }}
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