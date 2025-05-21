// src/pages/packages/PackageDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
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
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format, parseISO, isAfter, isEqual, differenceInDays, startOfWeek, addWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import { packageService, studentService, lessonService } from '../../services/api';
import PackageCalendar from '../../components/packages/PackageCalendar';
import AddLessonDialog from '../../components/dashboard/AddLessonDialog';
import { useAuth } from '../../context/AuthContext'; // Assicurati di importare useAuth
import getProfessorNameById from '../../utils/professorMapping';
import PackageNotes from '../../components/packages/PackageNotes';
import PackageCompletion from '../../components/packages/PackageCompletion';
import PackagePayments from '../../components/packages/PackagePayments';


function PackageDetailPage() {
  const { id } = useParams();
  const { currentUser, isAdmin } = useAuth();

  const navigate = useNavigate();
  const [packageData, setPackageData] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [professors, setProfessors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
  const location = useLocation();

  const handleBackToPackages = () => {
    // Se c'è un URL di ritorno, usalo
    if (location.state?.returnUrl) {
      navigate(location.state.returnUrl);
    } else {
      // Fallback al comportamento precedente
      navigate('/packages');
    }
  };


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
    // Use functional update to ensure we're working with the most recent state
    setPackageData(prevData => {
      // Create a new object with updated notes
      const newData = {
        ...prevData,
        notes: updatedNotes,
        student_ids: prevData.student_ids
      };

      // Optional: Log to help debug
      console.log('Package data updated with new notes:', newData);

      return newData;
    });
  };

  const handleDeleteLesson = async (lesson, event) => {
    // Previeni la navigazione quando si clicca sul pulsante di eliminazione
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (window.confirm(`Sei sicuro di voler eliminare la lezione #${lesson.id}? Questa azione non può essere annullata.`)) {
      try {
        // Chiama l'API per eliminare la lezione
        await lessonService.delete(lesson.id);

        // Aggiorna lo stato delle lezioni rimuovendo la lezione eliminata
        setLessons(prevLessons => prevLessons.filter(l => l.id !== lesson.id));

        // Ricarica i dati del pacchetto per aggiornare le ore rimanenti
        const packageResponse = await packageService.getById(id);
        setPackageData(packageResponse.data);

        alert('La lezione è stata eliminata con successo.');
      } catch (err) {
        console.error('Error deleting lesson:', err);
        alert('Errore durante l\'eliminazione della lezione. Riprova più tardi.');
      }
    }
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

  const isPackageExpiring = (pkg) => {
    const expiryDate = parseISO(pkg.expiry_date);

    // Ottieni il lunedì della settimana corrente
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 0 per domenica, trasformato in 7
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - dayOfWeek + 1); // Lunedì della settimana corrente
    mondayThisWeek.setHours(0, 0, 0, 0); // Inizio della giornata

    // Ottieni il lunedì della settimana prossima (7 giorni dopo)
    const mondayNextWeek = new Date(mondayThisWeek);
    mondayNextWeek.setDate(mondayThisWeek.getDate() + 7);

    // Controlla se scade tra lunedì di questa settimana e lunedì della prossima
    return expiryDate > mondayThisWeek && expiryDate <= mondayNextWeek;
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


  const handleExtendPackage = async () => {
    try {
      await packageService.extendPackage(id);
      // Ricarica i dati del pacchetto
      const packageResponse = await packageService.getById(id);
      setPackageData(packageResponse.data);
    } catch (err) {
      console.error('Error extending package:', err);

      // Handle specific error about future packages
      if (err.response?.status === 400 && err.response?.data?.detail) {
        alert(err.response.data.detail);
      } else {
        alert('Errore durante l\'estensione della scadenza del pacchetto. Riprova più tardi.');
      }
    }
  };

  // Funzione per verificare se un pacchetto è estendibile
  const isPackageExtendable = (pkg) => {
    if (!pkg) return false;

    // Se il pacchetto non ha ore rimanenti, non è estendibile
    if (parseFloat(pkg.remaining_hours) <= 0) return false;

    const startDate = parseISO(pkg.start_date);
    // Calcola il lunedì della prima settimana
    const mondayWeek1 = startOfWeek(startDate, { weekStartsOn: 1 });
    // Calcola il lunedì della quarta settimana
    const mondayWeek4 = addWeeks(mondayWeek1, 3);
    // Il pacchetto è estendibile se la data odierna è dopo o uguale al lunedì della quarta settimana
    return isAfter(new Date(), mondayWeek4) || isEqual(new Date(), mondayWeek4);
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
  const remainingHours = parseFloat(packageData.remaining_hours);
  const totalHours = parseFloat(packageData.total_hours);

  // Aggiungi questa funzione che calcola le ore per settimana
  const calculateWeeklyLessons = () => {
    // Considera teoriche le ore totali diviso 4 settimane
    const theoreticalHoursPerWeek = totalHours / 4;

    // Solo se abbiamo lezioni
    if (lessons.length === 0) return { weeklyLessons: [0, 0, 0, 0], extraHours: 0 };

    // Inizializza gli array per le lezioni settimanali e ore extra
    const weeklyLessons = [0, 0, 0, 0]; // Ore per settimana (4 settimane)
    let extraHours = 0; // Ore extra oltre le 4 settimane

    let hoursBeforeStart = 0;


    // Calcola le settimane dal pacchetto
    const packageStartDate = parseISO(packageData.start_date);

    lessons.forEach(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      // Calcola la differenza in giorni tra la data della lezione e l'inizio del pacchetto
      const daysDiff = differenceInDays(lessonDate, packageStartDate);

      // Se è entro le prime 4 settimane (28 giorni)
      if (daysDiff < 28) {
        // Determina in quale settimana cade (0-6 giorni = settimana 1, 7-13 = settimana 2, ecc.)
        const weekIndex = Math.min(3, Math.floor(daysDiff / 7));
        // Aggiungi le ore della lezione alla settimana corrispondente
        if (weekIndex >= 0) {
          weeklyLessons[weekIndex] += parseFloat(lesson.duration);
        } else {
          hoursBeforeStart += parseFloat(lesson.duration);
        }
      } else {
        // Se la lezione è oltre le 4 settimane, aggiungi alle ore extra
        extraHours += parseFloat(lesson.duration);
      }
    });

    return {
      weeklyLessons,
      extraHours,
      theoreticalHoursPerWeek,
      hoursBeforeStart,
    };
  };


  // Check if package is expired
  const expiryDate = parseISO(packageData.expiry_date);
  const isExpired = isAfter(new Date(), expiryDate);

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

          {/* Aggiungi questo pulsante per l'estensione solo se il pacchetto è scaduto e ha ore rimanenti */}
          {isPackageExtendable(packageData) && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleExtendPackage}
              sx={{ mr: 1 }}
            >
              Estendi scadenza +1
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
        <Grid item xs={12} md={7} >
          <Card sx={{ mb: 1 }}>
            <CardContent>
              <Typography variant="h6" color="primary">
                Informazioni pacchetto
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Left Column */}
                <Grid item xs={12} md={5}>
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

                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Stato
                  </Typography>
                  <Chip
                    label={
                      packageData.status === 'in_progress' ? 'In corso' :
                        packageData.status === 'completed' ? 'Completato' :
                          packageData.status === 'expired' ? 'Scaduto' :
                            'In corso'
                    }
                    color={
                      packageData.status === 'in_progress'
                        ? (isPackageExpiring(packageData) ? 'warning' : 'primary')
                        : packageData.status === 'expired'
                          ? 'error'
                          : packageData.status === 'completed'
                            ? 'success'
                            : 'default'
                    }
                    size="small"
                  />
                </Grid>

                <Grid item xs={12} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Stato Pagamento
                  </Typography>
                  {packageData.is_paid ? (
                    <Typography variant="body1" fontWeight="medium" color="success.main">
                      <Chip
                        label="Saldato"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {parseFloat(packageData.total_paid) > 0 ? (
                        <Chip
                          label="Acconto"
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          label="Non pagato"
                          color="error"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  )}
                </Grid>

                {/* Dates and times */}
                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12} md={5}>
                  <Typography variant="body2" color="text.secondary">
                    Data di Inizio
                  </Typography>
                  <Typography variant="body1" fontWeight="medium" gutterBottom>
                    {format(parseISO(packageData.start_date), 'EEEE dd MMMM yyyy', { locale: it })}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={3}>
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
                    Data Ultimo Pagamento
                  </Typography>
                  {packageData.is_paid || parseFloat(packageData.total_paid) > 0 ? (
                    <Typography variant="body1" fontWeight="medium">
                      {packageData.payment_date ?
                        format(parseISO(packageData.payment_date), 'dd/MM/yyyy', { locale: it }) :
                        'Data non disponibile'}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">
                      Nessun pagamento
                    </Typography>
                  )}
                </Grid>

                {/* Financial details */}
                <Grid item xs={12}>
                  <Divider />
                </Grid>
                {isAdmin() && (
                  <Grid item xs={12} md={5}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Prezzo Pacchetto
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Typography
                        variant="h6"
                        fontWeight="medium"
                        mt={-1}
                      >
                        €{parseFloat(packageData.package_cost).toFixed(2)}
                      </Typography>

                      {(parseFloat(packageData.package_cost) === 0) && (
                        <Typography variant="caption" color="error" sx={{ ml: 1, alignSelf: "flex-end", mb: 0.5 }}>
                          (da impostare)
                        </Typography>
                      )}

                    </Box>
                  </Grid>
                )}


                <Grid item xs={12} md={3}>
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
                  <Divider />
                </Grid>
                <Grid item xs={12}>
                  {/* Nuovo componente per la visualizzazione del completamento */}
                  {(() => {
                    // Calcola dati settimanali per il nuovo componente
                    const weeklyData = calculateWeeklyLessons();

                    return (
                      <PackageCompletion
                        totalHours={totalHours}
                        weeklyLessons={weeklyData.weeklyLessons}
                        extraHours={weeklyData.extraHours}
                        hoursBeforeStart={weeklyData.hoursBeforeStart}
                      />
                    );
                  })()}
                </Grid>

              </Grid>
            </CardContent>
          </Card>
          {/* Mantiene le note nello stesso Grid item, ma ora c'è spazio sufficiente grazie al margin */}
          <Grid item xs={12}>
            <PackageNotes
              packageId={packageData.id}
              initialNotes={packageData.notes}
              onNotesUpdate={handleNotesUpdate}
            />
          </Grid>
        </Grid>

        <Grid item xs={12} md={5}>
          <PackagePayments
            packageId={packageData.id}
            packageData={packageData}
            onPaymentsUpdate={async () => {
              // Ricarica i dati del pacchetto quando i pagamenti vengono aggiornati
              try {
                const packageResponse = await packageService.getById(id);
                setPackageData(packageResponse.data);
              } catch (err) {
                console.error('Error refreshing package data:', err);
              }
            }}
          />
          <Card sx={{ mt: 1 }}>
            <CardContent>
              <Typography variant="h6" color="primary">
                Calendario lezioni
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1} fontStyle={'italic'}>
                Clicca su un giorno per aggiungere una lezione
              </Typography>
              <PackageCalendar
                lessons={lessons}
                professors={professors}
                onDayClick={handleDayClick}
                expiryDate={packageData.expiry_date}
                startDate={packageData.start_date}
              />
            </CardContent>
          </Card>
        </Grid>


        {/* Lesson Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" color="primary">
                Lezioni del pacchetto
              </Typography>
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
                        <TableCell>Compenso Orario</TableCell>
                        <TableCell>Totale</TableCell>
                        <TableCell align="right">Azioni</TableCell>

                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lessons
                        .sort((a, b) => new Date(b.lesson_date) - new Date(a.lesson_date)) // Ordina dalla più recente alla meno recente
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
                            <TableCell>€{parseFloat(lesson.total_payment).toFixed(2)}</TableCell>
                            <TableCell align="right">
                              {/* Mostra il pulsante Elimina solo se l'utente è admin o è il professore della lezione */}
                              {(isAdmin() || currentUser.id === lesson.professor_id) && (
                                <Tooltip title="Elimina">
                                  <IconButton
                                    color="error"
                                    onClick={(e) => handleDeleteLesson(lesson, e)}
                                    size="small"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      }
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
                  labelRowsPerPage="Righe per pagina:"
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