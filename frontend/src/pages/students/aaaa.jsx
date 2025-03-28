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
  School as PackageIcon
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

  // Funzione per caricare i pacchetti per tutti gli studenti
  const fetchStudentPackages = async (studentsData) => {
    try {
      const packagesMap = {};
      
      for (const student of studentsData) {
        const packagesResponse = await packageService.getByStudent(student.id);
        
        // Trova l'ultimo pacchetto
        const sortedPackages = packagesResponse.data.sort((a, b) => 
          new Date(b.start_date) - new Date(a.start_date)
        );
        
        packagesMap[student.id] = sortedPackages.length > 0 ? sortedPackages[0] : null;
      }
      
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
        <Typography variant="body2" color="text.secondary">
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
        icon={<PackageIcon fontSize="small" />}
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

  // Il resto del codice rimane lo stesso del componente originale, 
  // aggiungeremo solo una colonna per lo stato del pacchetto

  // ... (mantenere tutto il codice precedente invariato)

  return (
    <Box>
      {/* ... (mantenere l'intestazione e la ricerca invariate) */}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortableTableCell id="first_name" label="Nome" />
              <SortableTableCell id="last_name" label="Cognome" />
              <SortableTableCell id="birth_date" label="Data di Nascita" />
              <SortableTableCell id="email" label="Email" />
              <SortableTableCell id="phone" label="Telefono" />
              <TableCell>Stato Pacchetto</TableCell>
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