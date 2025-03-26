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

  // State for sorting
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('id');

  // Function to handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Helper function for sorting
  const descendingComparator = (a, b, orderBy) => {
    // Special cases for date formats
    if (orderBy === 'start_date' || orderBy === 'expiry_date') {
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
        setError('Unable to load packages. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = [...packages];

    // Filter by search term (student name)
    if (searchTerm.trim() !== '') {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((pkg) => {
        const studentName = students[pkg.student_id] || '';
        return studentName.toLowerCase().includes(lowercaseSearch);
      });
    }

    // Filter by status (active or all)
    if (showActive) {
      filtered = filtered.filter(pkg => pkg.status === 'in_progress');
    }

    // Apply sorting
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
    event.stopPropagation(); // Prevent navigation to details view
    navigate(`/packages/edit/${id}`);
  };

  const handleAddPackage = () => {
    navigate('/packages/new');
  };

  const handleDeletePackage = async (id, event) => {
    event.stopPropagation(); // Prevent navigation to details view

    try {
      // First get lessons for this package to show to user
      const lessonsResponse = await lessonService.getAll();
      const packageLessons = lessonsResponse.data.filter(lesson =>
        lesson.package_id === id && lesson.is_package
      );

      let confirmMessage = `Are you sure you want to delete package #${id}?`;

      // If there are associated lessons, warn the user they will be deleted too
      if (packageLessons.length > 0) {
        confirmMessage += `\n\nWARNING: This package contains ${packageLessons.length} lessons that will be deleted:`;

        // Add information about the first 5 lessons (to keep message reasonable)
        const maxLessonsToShow = 5;
        packageLessons.slice(0, maxLessonsToShow).forEach(lesson => {
          const lessonDate = format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it });
          confirmMessage += `\n- Lesson #${lesson.id} on ${lessonDate} (${lesson.duration} hours)`;
        });

        // If there are more than 5 lessons, indicate there are more
        if (packageLessons.length > maxLessonsToShow) {
          confirmMessage += `\n...and ${packageLessons.length - maxLessonsToShow} more lessons`;
        }
      }

      confirmMessage += "\n\nThis action cannot be undone.";

      if (window.confirm(confirmMessage)) {
        await packageService.delete(id);

        // Reload packages after deletion
        const packagesResponse = await packageService.getAll();
        setPackages(packagesResponse.data);
      }
    } catch (err) {
      console.error('Error deleting package:', err);
      alert('Error deleting package. Please try again later.');
    }
  };

  // SortableTableCell component for column headers
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
          Nuovo pacchetto
        </Button>
      </Box>

      <Box mb={3} display="flex" alignItems="center">
        <TextField
          variant="outlined"
          label="Ricerca per nome studente"
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
          label="Solo pacchetti in corso"
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <SortableTableCell id="id" label="ID" />
              <SortableTableCell id="student_id" label="Studente" />
              <SortableTableCell id="start_date" label="Data Inizio" />
              <SortableTableCell id="expiry_date" label="Data Scadenza" />
              <SortableTableCell id="total_hours" label="Totale Ore" />
              <SortableTableCell id="remaining_hours" label="Ore Rimanenti" />
              <SortableTableCell id="package_cost" label="Costo" />
              <SortableTableCell id="status" label="Stato" />
              <SortableTableCell id="is_paid" label="Pagamento" />
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPackages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
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
                    <TableCell>{students[pkg.student_id] || `Student #${pkg.student_id}`}</TableCell>
                    <TableCell>
                      {format(parseISO(pkg.start_date), 'EEEE dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(pkg.expiry_date), 'EEEE dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>{pkg.total_hours}</TableCell>
                    <TableCell>{parseFloat(pkg.remaining_hours).toFixed(1)}</TableCell>
                    <TableCell>€{parseFloat(pkg.package_cost).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={
                          pkg.status === 'in_progress' ? 'In corso' :
                            pkg.status === 'completed' ? 'Terminato' :
                              pkg.status === 'expired' ? 'Scaduto' :
                                'In corso'
                        }
                        color={
                          pkg.status === 'in_progress' ? 'primary' :
                            pkg.status === 'expired' ? 'warning' :
                              'success'
                        }
                        size="small"
                      />

                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pkg.is_paid ? 'Saldato' : 'Non saldato'}
                        color={pkg.is_paid ? 'success' : 'error'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Edit">
                        <IconButton
                          color="primary"
                          onClick={(e) => handleEditPackage(pkg.id, e)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={(e) => handleDeletePackage(pkg.id, e)}
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
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
      </TableContainer>
    </Box>
  );
}

export default PackageListPage;