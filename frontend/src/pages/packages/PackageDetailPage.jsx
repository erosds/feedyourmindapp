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
} from '@mui/material';
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format, parseISO, isAfter, isEqual, differenceInDays, startOfWeek, addWeeks } from 'date-fns';
import { it } from 'date-fns/locale';
import { packageService, studentService, lessonService } from '../../services/api';
import PackageCalendar from '../../components/packages/PackageCalendar';
import AddLessonDialog from '../../components/dashboard/AddLessonDialog';
import { useAuth } from '../../context/AuthContext';
import getProfessorNameById from '../../utils/professorMapping';
import PackageNotes from '../../components/packages/PackageNotes';
import PackageCompletion from '../../components/packages/PackageCompletion';
import PackagePayments from '../../components/packages/PackagePayments';

function PackageDetailPage() {
  const { id } = useParams();
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // States
  const [packageData, setPackageData] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [professors, setProfessors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addLessonDialogOpen, setAddLessonDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentLessons, setStudentLessons] = useState([]);

  // Stato per il form della lezione
  const [lessonForm, setLessonForm] = useState({
    professor_id: currentUser?.id || '',
    student_id: '',
    lesson_date: new Date(),
    start_time: new Date(new Date().setHours(14, 0, 0, 0)),
    duration: 1,
    is_package: true,
    package_id: null,
    hourly_rate: '12.5',
    is_paid: true,
    payment_date: new Date(),
  });

  const handleBackToPackages = () => {
    if (location.state?.returnUrl) {
      navigate(location.state.returnUrl);
    } else {
      navigate('/packages');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const packageResponse = await packageService.getById(id);
        const packageData = packageResponse.data;
        setPackageData(packageData);

        const studentIds = Array.isArray(packageData.student_ids) ? packageData.student_ids : [];

        if (studentIds.length === 0) {
          setError("Package data is incomplete. No students associated with this package.");
          setLoading(false);
          return;
        }

        try {
          const studentPromises = studentIds.map(studentId =>
            studentService.getById(studentId)
          );
          const studentsResponses = await Promise.all(studentPromises);
          const studentsData = studentsResponses.map(response => response.data);
          setStudents(studentsData);
        } catch (err) {
          console.error("Error loading students:", err);
        }

        const firstStudentId = studentIds[0];
        setLessonForm(prev => ({
          ...prev,
          student_id: firstStudentId,
          package_id: parseInt(id),
          is_package: true
        }));

        const lessonsResponse = await lessonService.getAll();
        const packageLessons = lessonsResponse.data.filter(
          lesson => lesson.package_id === parseInt(id) && lesson.is_package
        );
        setLessons(packageLessons);

        try {
          const studentLessonsResponse = await lessonService.getByStudent(firstStudentId);
          setStudentLessons(studentLessonsResponse.data);
        } catch (err) {
          console.error("Error loading student lessons:", err);
        }

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
    setPackageData(prevData => ({
      ...prevData,
      notes: updatedNotes,
      student_ids: prevData.student_ids
    }));
  };

  const handleDeleteLesson = async (lesson, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (window.confirm(`Sei sicuro di voler eliminare la lezione #${lesson.id}? Questa azione non può essere annullata.`)) {
      try {
        await lessonService.delete(lesson.id);
        setLessons(prevLessons => prevLessons.filter(l => l.id !== lesson.id));
        const packageResponse = await packageService.getById(id);
        setPackageData(packageResponse.data);
        alert('La lezione è stata eliminata con successo.');
      } catch (err) {
        console.error('Error deleting lesson:', err);
        alert('Errore durante l\'eliminazione della lezione. Riprova più tardi.');
      }
    }
  };

  const calculatePackageHours = (packageId, totalHours) => {
    if (!packageId || !totalHours) return { usedHours: 0, availableHours: 0 };

    const usedHours = lessons.reduce((total, lesson) =>
      total + parseFloat(lesson.duration), 0);
    const availableHours = parseFloat(totalHours) - usedHours;

    return {
      usedHours,
      availableHours
    };
  };

  const updateLessons = async () => {
    try {
      const lessonsResponse = await lessonService.getAll();
      const packageLessons = lessonsResponse.data.filter(
        lesson => lesson.package_id === parseInt(id) && lesson.is_package
      );
      setLessons(packageLessons);

      const packageResponse = await packageService.getById(id);
      setPackageData(packageResponse.data);
    } catch (err) {
      console.error('Error updating lessons:', err);
    }
  };

  const isPackageExpiring = (pkg) => {
    const expiryDate = parseISO(pkg.expiry_date);
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - dayOfWeek + 1);
    mondayThisWeek.setHours(0, 0, 0, 0);
    const mondayNextWeek = new Date(mondayThisWeek);
    mondayNextWeek.setDate(mondayThisWeek.getDate() + 7);
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
      const packageResponse = await packageService.getById(id);
      setPackageData(packageResponse.data);
    } catch (err) {
      console.error('Error extending package:', err);
      if (err.response?.status === 400 && err.response?.data?.detail) {
        alert(err.response.data.detail);
      } else {
        alert('Errore durante l\'estensione della scadenza del pacchetto. Riprova più tardi.');
      }
    }
  };

  const isPackageExtendable = (pkg) => {
    if (!pkg) return false;
    if (parseFloat(pkg.remaining_hours) <= 0) return false;
    const startDate = parseISO(pkg.start_date);
    const mondayWeek1 = startOfWeek(startDate, { weekStartsOn: 1 });
    const mondayWeek4 = addWeeks(mondayWeek1, 3);
    return isAfter(new Date(), mondayWeek4) || isEqual(new Date(), mondayWeek4);
  };

  const handleCancelExtension = async () => {
    try {
      const expiryDate = parseISO(packageData.expiry_date);
      const lastWeekStart = new Date(expiryDate);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const hasLessonsInLastWeek = lessons.some(lesson => {
        const lessonDate = parseISO(lesson.lesson_date);
        return lessonDate > lastWeekStart && lessonDate <= expiryDate;
      });

      if (hasLessonsInLastWeek) {
        alert('Non è possibile annullare l\'estensione perché ci sono lezioni programmate nella settimana da rimuovere.');
        return;
      }

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

      if (lessons.length > 0) {
        confirmMessage += `\n\nATTENZIONE: Questo pacchetto contiene ${lessons.length} lezioni che verranno eliminate:`;

        const maxLessonsToShow = 5;
        lessons.slice(0, maxLessonsToShow).forEach(lesson => {
          const lessonDate = format(parseISO(lesson.lesson_date), 'dd/MM/yyyy', { locale: it });
          confirmMessage += `\n- Lezione #${lesson.id} del ${lessonDate} (${lesson.duration} ore)`;
        });

        if (lessons.length > maxLessonsToShow) {
          confirmMessage += `\n...e altre ${lessons.length - maxLessonsToShow} lezioni`;
        }
      }

      confirmMessage += "\n\nQuesta azione non può essere annullata.";

      if (window.confirm(confirmMessage)) {
        await packageService.delete(id);
        navigate('/packages');
      }
    } catch (err) {
      console.error('Errore nell\'eliminazione del pacchetto:', err);
      alert('Errore nell\'eliminazione del pacchetto. Riprova più tardi.');
    }
  };

  const calculateWeeklyLessons = () => {
    const theoreticalHoursPerWeek = totalHours / 4;

    if (lessons.length === 0) return { weeklyLessons: [0, 0, 0, 0], extraHours: 0 };

    const weeklyLessons = [0, 0, 0, 0];
    let extraHours = 0;
    let hoursBeforeStart = 0;

    const packageStartDate = parseISO(packageData.start_date);

    lessons.forEach(lesson => {
      const lessonDate = parseISO(lesson.lesson_date);
      const daysDiff = differenceInDays(lessonDate, packageStartDate);

      if (daysDiff < 28) {
        const weekIndex = Math.min(3, Math.floor(daysDiff / 7));
        if (weekIndex >= 0) {
          weeklyLessons[weekIndex] += parseFloat(lesson.duration);
        } else {
          hoursBeforeStart += parseFloat(lesson.duration);
        }
      } else {
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

  const remainingHours = parseFloat(packageData.remaining_hours);
  const totalHours = parseFloat(packageData.total_hours);
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

      {/* Layout a due colonne */}
      <Grid container spacing={1}>
        {/* COLONNA SINISTRA: Informazioni + Pagamenti */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Informazioni pacchetto */}
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Informazioni pacchetto
                </Typography>
                
                <Grid container spacing={2}>
                  {/* Studente/i */}
                  <Grid item xs={5}>
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

                  {/* Stato e Pagamento */}
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Stato
                    </Typography>
                    <Chip
                      label={
                        packageData.status === 'in_progress' ? 'In corso' :
                          packageData.status === 'completed' ? 'Completato' :
                            packageData.status === 'expired' ? 'Scaduto' : 'In corso'
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

                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      Pagamento
                    </Typography>
                    {packageData.is_paid ? (
                      <Chip
                        label="Saldato"
                        color="success"
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      parseFloat(packageData.total_paid) > 0 ? (
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
                      )
                    )}
                  </Grid>

                  <Grid item xs={12}>
                    <Divider />
                  </Grid>

                  {/* Date */}
                  <Grid item xs={5}>
                    <Typography variant="body2" color="text.secondary">
                      Data di inizio
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {format(parseISO(packageData.start_date), 'dd/MM/yyyy', { locale: it })}
                    </Typography>
                  </Grid>

                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      Data di scadenza
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color={isExpired ? "error.main" : "inherit"}
                    >
                      {format(parseISO(packageData.expiry_date), 'dd/MM/yyyy', { locale: it })}
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

                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      Data saldo
                    </Typography>
                    {packageData.is_paid || parseFloat(packageData.total_paid) > 0 ? (
                      <Typography variant="body1" fontWeight="medium">
                        {packageData.payment_date ?
                          format(parseISO(packageData.payment_date), 'dd/MM/yyyy', { locale: it }) :
                          '-'}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Nessun pagamento
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12}>
                    <Divider />
                  </Grid>

                  {/* Completamento pacchetto */}
                  <Grid item xs={12}>
                    {(() => {
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

            {/* Pagamenti pacchetto */}
            <PackagePayments
              packageId={packageData.id}
              packageData={packageData}
              onPaymentsUpdate={async () => {
                try {
                  const packageResponse = await packageService.getById(id);
                  setPackageData(packageResponse.data);
                } catch (err) {
                  console.error('Error refreshing package data:', err);
                }
              }}
            />
          </Box>
        </Grid>

        {/* COLONNA DESTRA: Calendario + Annotazioni + Lista Lezioni */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Calendario lezioni */}
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Calendario lezioni
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2} fontStyle={'italic'}>
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

            {/* Annotazioni pacchetto */}
            <PackageNotes
              packageId={packageData.id}
              initialNotes={packageData.notes}
              onNotesUpdate={handleNotesUpdate}
            />

            {/* Lista lezioni del pacchetto */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Lezioni pacchetto
              </Typography>

              {lessons.length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
                  Nessuna lezione ancora caricata
                </Typography>
              ) : (
                <Box>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          {packageData.student_ids.length > 1 && (
                            <TableCell>Studente</TableCell>
                          )}
                          <TableCell>Prof.</TableCell>
                          <TableCell>Ore</TableCell>
                          <TableCell>Compenso</TableCell>
                          <TableCell align="right">Azioni</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lessons
                          .sort((a, b) => new Date(b.lesson_date) - new Date(a.lesson_date))
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
                              <TableCell>
                                {format(parseISO(lesson.lesson_date), 'dd/MM/yy', { locale: it })}
                              </TableCell>
                              {packageData.student_ids.length > 1 && (
                                <TableCell>
                                  {students.find(s => s.id === lesson.student_id)
                                    ? `${students.find(s => s.id === lesson.student_id).first_name} ${students.find(s => s.id === lesson.student_id).last_name.charAt(0)}.`
                                    : `#${lesson.student_id}`}
                                </TableCell>
                              )}
                              <TableCell>
                                {getProfessorNameById(lesson.professor_id)}
                              </TableCell>
                              <TableCell>{lesson.duration}</TableCell>
                              <TableCell>€{parseFloat(lesson.total_payment).toFixed(2)}</TableCell>
                              <TableCell align="right">
                                {(isAdmin() || currentUser.id === lesson.professor_id) && (
                                  <Tooltip title="Elimina">
                                    <IconButton
                                      color="error"
                                      onClick={(e) => handleDeleteLesson(lesson, e)}
                                      size="small"
                                    >
                                      <DeleteIcon fontSize="small" />
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
                  
                  {lessons.length > rowsPerPage && (
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25]}
                      component="div"
                      count={lessons.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      labelRowsPerPage="Righe:"
                      labelDisplayedRows={({ from, to, count }) => `${from}-${to} di ${count}`}
                      size="small"
                    />
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* Dialog per aggiungere lezione */}
      <AddLessonDialog
        open={addLessonDialogOpen}
        onClose={() => setAddLessonDialogOpen(false)}
        selectedDay={selectedDay}
        lessonForm={lessonForm}
        setLessonForm={setLessonForm}
        students={students}
        studentPackages={[packageData]}
        selectedPackage={packageData}
        formError={null}
        formSubmitting={false}
        handlePackageChange={() => {}}
        calculatePackageHours={calculatePackageHours}
        currentUser={currentUser}
        selectedProfessor={null}
        updateLessons={updateLessons}
        lessons={studentLessons}
        context="packageDetail"
        fixedPackageId={parseInt(id)}
      />
    </Box>
  );
}

export default PackageDetailPage;