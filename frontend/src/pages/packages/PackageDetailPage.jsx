// src/pages/packages/PackageDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AddTask as AddLessonIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { packageService, studentService, lessonService } from '../../services/api';
import PackageCalendar from '../../components/packages/PackageCalendar';
import AddLessonDialog from '../../components/dashboard/AddLessonDialog';
import { useAuth } from '../../context/AuthContext'; // Assicurati di importare useAuth
import getProfessorNameById from '../../utils/professorMapping';
import PackageNotes from '../../components/packages/PackageNotes';


function PackageDetailPage() {
  const { id } = useParams();
  const { currentUser, isAdmin } = useAuth();

  const navigate = useNavigate();
  const [packageData, setPackageData] = useState(null);
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [professors, setProfessors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Aggiungi questi stati
  const [addLessonDialogOpen, setAddLessonDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentLessons, setStudentLessons] = useState([]);
  // Modifiche al prezzo
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(0);
  // Stato per il form della lezione
  const [lessonForm, setLessonForm] = useState({
    professor_id: currentUser?.id || '',
    student_id: '',
    lesson_date: new Date(),
    start_time: new Date(new Date().setHours(14, 0, 0, 0)), // Default alle 14:00
    duration: 1,
    is_package: true,
    package_id: null,
    hourly_rate: '12.5',
    is_paid: true,
    payment_date: new Date(), // Default oggi
  });


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Load package data
        const packageResponse = await packageService.getById(id);
        const packageData = packageResponse.data;

        console.log("Package data loaded:", packageData);
        setPackageData(packageData);

        // Make sure student_ids is an array
        const studentIds = Array.isArray(packageData.student_ids) ? packageData.student_ids : [];

        if (studentIds.length === 0) {
          console.error("No student IDs found in package data");
          setError("Package data is incomplete. No students associated with this package.");
          setLoading(false);
          return;
        }

        // Load details for all students in the package
        try {
          const studentPromises = studentIds.map(studentId =>
            studentService.getById(studentId)
          );
          const studentsResponses = await Promise.all(studentPromises);
          const studentsData = studentsResponses.map(response => response.data);
          setStudents(studentsData);
        } catch (err) {
          console.error("Error loading students:", err);
          // Continue even if we can't load student details
        }

        // Set initial form data with the first student
        const firstStudentId = studentIds[0];
        setLessonForm(prev => ({
          ...prev,
          student_id: firstStudentId,
          package_id: parseInt(id),
          is_package: true
        }));

        // Load lessons related to the package
        const lessonsResponse = await lessonService.getAll();
        const packageLessons = lessonsResponse.data.filter(
          lesson => lesson.package_id === parseInt(id) && lesson.is_package
        );
        setLessons(packageLessons);

        // Load student lessons for overlap checks (use first student)
        try {
          const studentLessonsResponse = await lessonService.getByStudent(firstStudentId);
          setStudentLessons(studentLessonsResponse.data);
        } catch (err) {
          console.error("Error loading student lessons:", err);
          // Continue even if we can't load student lessons
        }

        // Set current month to the month of the first lesson or today if no lessons
        if (packageLessons.length > 0) {
          setCurrentMonth(parseISO(packageLessons[0].lesson_date));
        }

      } catch (err) {
        console.error('Error fetching package data:', err);
        setError('Unable to load package data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Funzione per gestire il click su un giorno del calendario
  const handleDayClick = (day) => {
    setSelectedDay(day);
    setLessonForm(prev => ({
      ...prev,
      lesson_date: day,
      professor_id: currentUser?.id || '',
      student_id: packageData.student_id,
      package_id: parseInt(id),
      is_package: true
    }));
    setAddLessonDialogOpen(true);
  };

  const handleNotesUpdate = (updatedNotes) => {
    setPackageData({
      ...packageData,
      notes: updatedNotes
    });
  };

  // Funzione per calcolare le ore disponibili nel pacchetto
  const calculatePackageHours = (packageId, totalHours) => {
    if (!packageId || !totalHours) return { usedHours: 0, availableHours: 0 };

    // Calcola la somma delle ore di lezione già usate in questo pacchetto
    const usedHours = lessons.reduce((total, lesson) =>
      total + parseFloat(lesson.duration), 0);

    // Calcola le ore disponibili
    const availableHours = parseFloat(totalHours) - usedHours;

    return {
      usedHours,
      availableHours
    };
  };

  const handleEditPrice = () => {
    setPriceValue(parseFloat(packageData.package_cost || 0));
    setIsEditingPrice(true);
  };

  const handleSavePrice = async () => {
    try {
      await packageService.update(id, { package_cost: priceValue });
      // Reload package data
      const response = await packageService.getById(id);
      setPackageData(response.data);
      setIsEditingPrice(false);
    } catch (err) {
      console.error('Error updating price:', err);
      alert('Errore durante l\'aggiornamento del prezzo. Riprova più tardi.');
    }
  };

  // Funzione per aggiornare le lezioni dopo un'aggiunta
  const updateLessons = async () => {
    try {
      const lessonsResponse = await lessonService.getAll();
      const packageLessons = lessonsResponse.data.filter(
        lesson => lesson.package_id === parseInt(id) && lesson.is_package
      );
      setLessons(packageLessons);

      // Aggiorna anche i dati del pacchetto per riflettere le ore aggiornate
      const packageResponse = await packageService.getById(id);
      setPackageData(packageResponse.data);
    } catch (err) {
      console.error('Error updating lessons:', err);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditPackage = () => {
    navigate(`/packages/edit/${id}`);
  };

  const handleBackToPackages = () => {
    navigate('/packages');
  };

  const handleAddLesson = () => {
    navigate('/lessons/new', {
      state: {
        student_id: packageData?.student_id,
        package_id: packageData?.id,
        is_package: true
      }
    });
  };

  // Aggiungi questa funzione handleExtendPackage
  const handleExtendPackage = async () => {
    try {
      await packageService.extendPackage(id);
      // Ricarica i dati del pacchetto
      const packageResponse = await packageService.getById(id);
      setPackageData(packageResponse.data);
    } catch (err) {
      console.error('Error extending package:', err);
      alert('Errore durante l\'estensione della scadenza del pacchetto. Riprova più tardi.');
    }
  };

  const handleCancelExtension = async () => {
    try {
      // Calcola la settimana di estensione
      const expiryDate = parseISO(packageData.expiry_date);
      const lastWeekStart = new Date(expiryDate);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7); // 1 settimana prima della scadenza

      // Controlla se ci sono lezioni nella settimana da rimuovere
      const hasLessonsInLastWeek = lessons.some(lesson => {
        const lessonDate = parseISO(lesson.lesson_date);
        return lessonDate > lastWeekStart && lessonDate <= expiryDate;
      });

      if (hasLessonsInLastWeek) {
        alert('Non è possibile annullare l\'estensione perché ci sono lezioni programmate nella settimana da rimuovere.');
        return;
      }

      // Solo se non ci sono lezioni, prosegui con la cancellazione dell'estensione
      await packageService.cancelExtension(id);
      const packageResponse = await packageService.getById(id);
      setPackageData(packageResponse.data);

    } catch (err) {
      alert('Errore durante l\'annullamento dell\'estensione. Riprova più tardi.');
    }
  };


  const handleDeletePackage = async () => {
    try {
      let confirmMessage = `Sei sicuro di voler eliminare il pacchetto #${id}?`;

      // Se ci sono lezioni associate, avvisa l'utente che verranno eliminate anche quelle
      if (lessons.length > 0) {
        confirmMessage += `\n\nATTENZIONE: Questo pacchetto contiene ${lessons.length} lezioni che verranno eliminate:`;

        // Aggiungi informazioni sulle prime 5 lezioni
        const maxLessonsToShow = 5;
        lessons.slice(0, maxLessonsToShow).forEach(lesson => {
          const lessonDate = format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it });
          confirmMessage += `\n- Lezione #${lesson.id} del ${lessonDate} (${lesson.duration} ore)`;
        });

        // Se ci sono più di 5 lezioni, indica che ce ne sono altre
        if (lessons.length > maxLessonsToShow) {
          confirmMessage += `\n...e altre ${lessons.length - maxLessonsToShow} lezioni`;
        }
      }

      confirmMessage += "\n\nQuesta azione non può essere annullata.";

      if (window.confirm(confirmMessage)) {
        const response = await packageService.delete(id);

        // Naviga alla lista dei pacchetti
        navigate('/packages');
      }
    } catch (err) {
      console.error('Errore nell\'eliminazione del pacchetto:', err);
      alert('Errore nell\'eliminazione del pacchetto. Riprova più tardi.');
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

  if (!packageData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography>Package not found</Typography>
      </Box>
    );
  }

  // Calculate package statistics
  const usedHours = lessons.reduce((total, lesson) => total + parseFloat(lesson.duration), 0);
  const remainingHours = parseFloat(packageData.remaining_hours);
  const totalHours = parseFloat(packageData.total_hours);
  const completionPercentage = (usedHours / totalHours) * 100;

  // Check if package is expired
  const expiryDate = parseISO(packageData.expiry_date);
  const isExpired = isAfter(new Date(), expiryDate);
  const daysUntilExpiry = differenceInDays(expiryDate, new Date());

  return (
    <Box>
      {/* Header with actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Tooltip title="Back to list">
            <IconButton
              color="primary"
              onClick={handleBackToPackages}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h4">
            Dettagli Pacchetto #{packageData.id}
          </Typography>
        </Box>



        <Box>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<EditIcon />}
            onClick={handleEditPackage}
            sx={{ mr: 1 }}
          >
            Modifica
          </Button>

          {/* Aggiungi questo pulsante per l'estensione solo se il pacchetto è scaduto e ha ore rimanenti */}
          {(packageData.status === 'expired' || packageData.status === 'completed') &&
            parseFloat(packageData.remaining_hours) > 0 && (
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleExtendPackage}
                sx={{ mr: 1 }}
              >
                Estendi scadenza +1
              </Button>
            )}

          {/* Pulsante per annullare l'estensione, visibile solo se ci sono estensioni */}
          {packageData.extension_count > 0 && (
            <Button
              variant="outlined"
              color="warning"
              onClick={handleCancelExtension}
              sx={{ mr: 1 }}
            >
              Annulla estensione (-1)
            </Button>
          )}

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeletePackage}
          >
            Elimina
          </Button>
        </Box>
      </Box>

      {/* Main data */}
      <Grid container spacing={1}>
        {/* Header with basic package information */}
        <Grid item xs={12} md={8} >
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" >
                Informazioni Pacchetto
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Left Column */}
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Studente/i
                  </Typography>
                  <Box>
                    {packageData.student_ids.map(studentId => {
                      const studentData = students.find(s => s.id === studentId);
                      return (
                        <Typography
                          key={studentId}
                          variant="body1"
                          fontWeight="medium"
                          gutterBottom
                        >
                          <Link
                            to={`/students/${studentId}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            {studentData ? `${studentData.first_name} ${studentData.last_name}` : `Studente #${studentId}`}
                          </Link>
                        </Typography>
                      );
                    })}
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Stato
                  </Typography>
                  <Chip
                    label={
                      packageData.status === 'in_progress' ? 'In corso' :
                        packageData.status === 'completed' ? 'Terminato' :
                          packageData.status === 'expired' ? 'Scaduto' :
                            'In corso'
                    }
                    color={
                      packageData.status === 'in_progress' ? 'primary' :
                        packageData.status === 'expired' ? 'error' :
                          'success'
                    }
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Stato Pagamento
                  </Typography>
                  <Chip
                    icon={packageData.is_paid ? <CheckIcon /> : <CancelIcon />}
                    label={packageData.is_paid ? 'Pagato' : 'Non Pagato'}
                    color={packageData.is_paid ? 'success' : 'error'}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>

                {/* Dates and times */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data di Inizio
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {format(parseISO(packageData.start_date), 'EEEE dd MMMM yyyy', { locale: it })}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data di Scadenza
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight="medium"
                    color={isExpired ? "error.main" : "inherit"}
                    gutterBottom
                  >
                    {format(parseISO(packageData.expiry_date), 'dd MMMM yyyy', { locale: it })}
                    {packageData.extension_count > 0 && (
                      <Chip
                        label={`+${packageData.extension_count}`}
                        color="secondary"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Data Pagamento
                  </Typography>
                  {packageData.is_paid && packageData.payment_date ? (
                    <Typography variant="body1" fontWeight="medium" color="success.main">
                      {format(parseISO(packageData.payment_date), 'EEEE dd MMMM yyyy', { locale: it })}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Non ancora saldato
                    </Typography>
                  )}
                </Grid>

                {/* Financial details */}
                <Grid item xs={12}>
                  <Divider />
                </Grid>

                {isAdmin() && (
                  <Grid item xs={12} md={4}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Prezzo Pacchetto
                      </Typography>
                    </Box>

                    {isEditingPrice ? (
                      <Box display="flex" alignItems="center" mt={1}>
                        <TextField
                          size="small"
                          type="number"
                          value={priceValue}
                          onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                          InputProps={{
                            startAdornment: <InputAdornment position="start">€</InputAdornment>,
                            inputProps: { min: 0, step: 0.5 }
                          }}
                          sx={{ width: '120px', mr: 1 }}
                        />
                        <Button size="small" variant="contained" onClick={handleSavePrice}>
                          Salva
                        </Button>
                        <Button size="small" onClick={() => setIsEditingPrice(false)} sx={{ ml: 1 }}>
                          Annulla
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <Typography
                          variant="body1"
                          fontWeight="medium"
                          color={!packageData.is_paid || parseFloat(packageData.package_cost) === 0 ? "error.main" : "inherit"}
                        >
                          €{parseFloat(packageData.package_cost).toFixed(2)}
                          {parseFloat(packageData.package_cost) === 0 && (
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                              Prezzo da impostare
                            </Typography>
                          )}
                        </Typography>
                        {packageData.is_paid && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={handleEditPrice}
                            sx={{ mt: 1 }}
                          >
                            Modifica prezzo
                          </Button>
                        )}
                      </>
                    )}
                  </Grid>
                )}

                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Ore Totali
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" gutterBottom>
                    {packageData.total_hours}
                  </Typography>
                </Grid>


                <Grid item xs={12} md={4}>
                  <Typography variant="body2" color="text.secondary">
                    Ore rimanenti
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight={remainingHours > 0 ? '' : 'bold'}
                    color={remainingHours > 0 ? '' : 'error'}
                  >
                    {remainingHours.toFixed(1)}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider /> {/* Divisore aggiunto */}
                  <Box display="flex" flexDirection="column" >
                    <Box display="flex" justifyContent="space-between" sx={{ mt: 13.5 }}>
                      <Typography variant="h6">Completamento:</Typography>
                      <Typography variant="h5" fontWeight="medium">
                        {completionPercentage.toFixed(0)}%
                      </Typography>
                    </Box>

                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={completionPercentage}
                    color={packageData.status === 'completed' ? 'success' : 'primary'}
                    sx={{
                      height: 10,
                      borderRadius: 1,
                      backgroundImage: `repeating-linear-gradient(to right, transparent, transparent 24.5%, 
                      #fff 24.5%, #fff 25%, transparent 25%, transparent 49.5%, #fff 49.5%, #fff 50%, 
                      transparent 50%, transparent 74.5%, #fff 74.5%, #fff 75%, transparent 75%)`,
                      backgroundSize: '100% 100%',
                    }}
                  />

                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Calendario lezioni */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom mb={3.3} >
                Calendario Lezioni
              </Typography>
              <PackageCalendar
                lessons={lessons}
                professors={professors}
                onDayClick={handleDayClick}
                expiryDate={packageData.expiry_date}
              />

            </CardContent>
          </Card>
          <PackageNotes
            packageId={packageData.id}
            initialNotes={packageData.notes}
            onNotesUpdate={handleNotesUpdate}
          />
        </Grid>


        {/* Lesson Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Lezioni del pacchetto
              </Typography>
              {parseFloat(packageData.remaining_hours) > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddLessonIcon />}
                  onClick={handleAddLesson}
                  sx={{ mr: 1 }}
                  size='small'
                >
                  Aggiungi Lezioni al Pacchetto
                </Button>
              )}
            </Box>

            {lessons.length === 0 ? (
              <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                Nessuna lezione ancora caricata
              </Typography>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Data</TableCell>
                        {packageData.student_ids.length > 1 && (
                          <TableCell>Studente</TableCell>
                        )}
                        <TableCell>Professore</TableCell>
                        <TableCell>Durata (ore)</TableCell>
                        <TableCell>Tariffa Oraria</TableCell>
                        <TableCell align="right">Totale</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lessons
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((lesson) => (
                          <TableRow
                            key={lesson.id}
                            component={Link}
                            to={`/lessons/${lesson.id}`}
                            sx={{
                              textDecoration: 'none',
                              '&:hover': { bgcolor: 'action.hover' },
                              cursor: 'pointer',
                            }}
                          >
                            <TableCell>#{lesson.id}</TableCell>
                            <TableCell>
                              {format(parseISO(lesson.lesson_date), 'EEEE dd/MM/yyyy', { locale: it })}
                            </TableCell>
                            {packageData.student_ids.length > 1 && (
                              <TableCell>
                                {students.find(s => s.id === lesson.student_id)
                                  ? `${students.find(s => s.id === lesson.student_id).first_name} ${students.find(s => s.id === lesson.student_id).last_name}`
                                  : `Studente #${lesson.student_id}`}
                              </TableCell>
                            )}
                            <TableCell>
                              {getProfessorNameById(lesson.professor_id)}
                            </TableCell>
                            
                            <TableCell>{lesson.duration}</TableCell>
                            <TableCell>€{parseFloat(lesson.hourly_rate).toFixed(2)}</TableCell>
                            <TableCell align="right">€{parseFloat(lesson.total_payment).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={lessons.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="Rows per page:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
                />
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
      <AddLessonDialog
        open={addLessonDialogOpen}
        onClose={() => setAddLessonDialogOpen(false)}
        selectedDay={selectedDay}
        lessonForm={lessonForm}
        setLessonForm={setLessonForm}
        students={students}
        studentPackages={[packageData]} // Passa solo il pacchetto corrente
        selectedPackage={packageData}
        formError={null}
        formSubmitting={false}
        handleStudentChange={() => { }} // Funzione vuota perché lo studente è fisso
        handlePackageChange={() => { }} // Funzione vuota perché il pacchetto è fisso
        calculatePackageHours={calculatePackageHours}
        currentUser={currentUser}
        selectedProfessor={null}
        updateLessons={updateLessons}
        lessons={studentLessons}
        context="packageDetail" // Specifica il contesto
        fixedPackageId={parseInt(id)} // Passa l'ID del pacchetto fisso
      />
    </Box>
  );
}

export default PackageDetailPage;