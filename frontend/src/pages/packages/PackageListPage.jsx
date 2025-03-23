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
  FilterList as FilterIcon,
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Carica tutti i pacchetti
        const packagesResponse = await packageService.getAll();
        setPackages(packagesResponse.data);
        setFilteredPackages(packagesResponse.data);
        
        // Carica tutti gli studenti per mostrare i loro nomi
        const studentsResponse = await studentService.getAll();
        const studentsMap = {};
        studentsResponse.data.forEach(student => {
          studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
        });
        setStudents(studentsMap);
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
    
    setFilteredPackages(filtered);
    setPage(0); // Reset to first page after filtering
  }, [searchTerm, packages, students, showActive]);

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

  const handleEditPackage = (id) => {
    navigate(`/packages/edit/${id}`);
  };

  const handleAddPackage = () => {
    navigate('/packages/new');
  };

  const handleDeletePackage = async (id) => {
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
        setFilteredPackages(packagesResponse.data);
      }
    } catch (err) {
      console.error('Error deleting package:', err);
      alert('Errore durante l\'eliminazione del pacchetto. Riprova più tardi.');
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
              <TableCell>ID</TableCell>
              <TableCell>Studente</TableCell>
              <TableCell>Data Inizio</TableCell>
              <TableCell>Ore Totali</TableCell>
              <TableCell>Ore Rimanenti</TableCell>
              <TableCell>Costo</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell>Pagamento</TableCell>
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
                .map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell>#{pkg.id}</TableCell>
                    <TableCell>{students[pkg.student_id] || `Studente #${pkg.student_id}`}</TableCell>
                    <TableCell>
                      {format(parseISO(pkg.start_date), 'EEEE dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>{pkg.total_hours}</TableCell>
                    <TableCell>{pkg.remaining_hours}</TableCell>
                    <TableCell>€{parseFloat(pkg.package_cost).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={pkg.status === 'in_progress' ? 'In corso' : 'Terminato'}
                        color={pkg.status === 'in_progress' ? 'primary' : 'default'}
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
                    <TableCell align="right">
                      <Tooltip title="Visualizza dettagli">
                        <IconButton
                          color="primary"
                          onClick={() => handleViewPackage(pkg.id)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifica">
                        <IconButton
                          color="secondary"
                          onClick={() => handleEditPackage(pkg.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Elimina">
                        <IconButton
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePackage(pkg.id);
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