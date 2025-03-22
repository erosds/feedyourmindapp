// src/pages/students/StudentListPage.jsx
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
  Delete as DeleteIcon
} from '@mui/icons-material';
import { studentService } from '../../services/api';
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

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await studentService.getAll();
        setStudents(response.data);
        setFilteredStudents(response.data);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Impossibile caricare la lista degli studenti. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStudents(students);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = students.filter((student) => {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        return fullName.includes(lowercaseSearch);
      });
      setFilteredStudents(filtered);
    }
    setPage(0); // Reset to first page after search
  }, [searchTerm, students]);

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

  const handleEditStudent = (id) => {
    navigate(`/students/edit/${id}`);
  };

  const handleAddStudent = () => {
    navigate('/students/new');
  };

  const handleDeleteStudent = async (id, name) => {
    if (window.confirm(`Sei sicuro di voler eliminare lo studente "${name}"? Questa azione non può essere annullata.`)) {
      try {
        await studentService.delete(id);
        // Aggiorna la lista dopo l'eliminazione
        const response = await studentService.getAll();
        setStudents(response.data);
        setFilteredStudents(response.data);
      } catch (err) {
        console.error('Error deleting student:', err);
        alert('Errore durante l\'eliminazione dello studente. Riprova più tardi.');
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Cognome</TableCell>
              <TableCell>Data di Nascita</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefono</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nessuno studente trovato
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.first_name}</TableCell>
                    <TableCell>{student.last_name}</TableCell>
                    <TableCell>
                      {formatBirthDate(student.birth_date)}
                    </TableCell>
                    <TableCell>{student.email || '-'}</TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Visualizza dettagli">
                        <IconButton
                          color="primary"
                          onClick={() => handleViewStudent(student.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifica">
                        <IconButton
                          color="secondary"
                          onClick={() => handleEditStudent(student.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina">
                        <IconButton
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation(); // Previene la navigazione verso la pagina di dettaglio
                            handleDeleteStudent(student.id, `${student.first_name} ${student.last_name}`);
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