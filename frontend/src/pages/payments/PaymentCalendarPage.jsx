// src/pages/payments/PaymentCalendarPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  useTheme
} from '@mui/material';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,

  addMonths,
  subMonths,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { it } from 'date-fns/locale';
import { lessonService, packageService, studentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { TextField, InputAdornment } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

// Componente per il contenitore di chip con autoscroll
const ScrollableChipsContainer = ({ children }) => {
  const containerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);

  // Verifica se il contenuto necessita di scroll
  useEffect(() => {
    if (containerRef.current) {
      setNeedsScroll(
        containerRef.current.scrollHeight > containerRef.current.clientHeight
      );
    }
  }, [children]);

  // Gestisce l'effetto di scroll automatico
  useEffect(() => {
    if (!isHovering || !needsScroll || !containerRef.current) return;

    let animationId;
    let scrollTop = 0;
    let pauseTimer = null;
    let isPaused = true; // Inizia in pausa all'inizio
    const scrollSpeed = 0.2; // Velocità di scroll (pixel per frame)
    const pauseDuration = 1200; // Pausa di 1 secondo sia all'inizio che alla fine
    const maxScrollTop = containerRef.current.scrollHeight - containerRef.current.clientHeight;

    // Funzione ricorsiva per l'animazione
    const scrollAnimation = () => {
      if (!containerRef.current) return;

      if (isPaused) {
        // Quando è in pausa, attendi e poi continua
        return;
      }

      // Aggiorna la posizione di scroll
      scrollTop += scrollSpeed;

      // Quando raggiunge il fondo, metti in pausa
      if (scrollTop >= maxScrollTop) {
        isPaused = true;
        scrollTop = maxScrollTop; // Assicurati di essere esattamente in fondo

        // Dopo la pausa, torna in cima e riprendi
        pauseTimer = setTimeout(() => {
          scrollTop = 0;
          containerRef.current.scrollTop = 0;

          // Rimani fermo per un momento anche all'inizio
          pauseTimer = setTimeout(() => {
            isPaused = false;
            animationId = requestAnimationFrame(scrollAnimation);
          }, pauseDuration);

        }, pauseDuration);

        return;
      }

      // Applica lo scroll
      containerRef.current.scrollTop = scrollTop;

      // Continua l'animazione
      animationId = requestAnimationFrame(scrollAnimation);
    };

    // Inizia con una pausa all'inizio
    pauseTimer = setTimeout(() => {
      isPaused = false;
      animationId = requestAnimationFrame(scrollAnimation);
    }, pauseDuration);

    // Pulizia quando l'hover finisce
    return () => {
      if (pauseTimer) clearTimeout(pauseTimer);
      cancelAnimationFrame(animationId);

      // Torna in cima quando il mouse esce
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    };
  }, [isHovering, needsScroll]);

  return (
    <Box
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px',
        mt: 0,
        maxHeight: '100px',
        overflow: 'hidden',
        overflowY: 'auto',
        flexGrow: 1,
        scrollbarWidth: 'none', // Firefox
        '&::-webkit-scrollbar': { // Chrome/Safari/Edge
          display: 'none'
        },
        msOverflowStyle: 'none' // IE
      }}
    >
      {children}
    </Box>
  );
};

function PaymentCalendarPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  // States
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [dayPayments, setDayPayments] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [students, setStudents] = useState({});
  // Aggiungi un nuovo stato per le lezioni non pagate
  const [unpaidLessons, setUnpaidLessons] = useState([]);
  const [dayUnpaidLessons, setDayUnpaidLessons] = useState([]);
  const [viewMode, setViewMode] = useState('payments'); // 'payments' o 'unpaid'
  const [expiredPackages, setExpiredPackages] = useState([]);
  const [dayExpiredPackages, setDayExpiredPackages] = useState([]);
  // Aggiungi questi stati dopo gli stati esistenti
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [priceValue, setPriceValue] = useState(0);


  // Verify admin access
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Fetch all students first to use for name display
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await studentService.getAll();
        const studentsMap = {};

        if (response && response.data) {
          response.data.forEach(student => {
            studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
          });
        }

        setStudents(studentsMap);
      } catch (err) {
        console.error('Error fetching students:', err);
      }
    };

    fetchStudents();
  }, []);

  const getExpiredPackagesForDay = (day) => {
    return expiredPackages.filter(pkg =>
      isSameDay(parseISO(pkg.date), day)
    );
  };

  const getExpiredPackagesCountForDay = (day) => {
    return getExpiredPackagesForDay(day).length;
  };

  // Aggiungi questa funzione dopo handlePaymentClick
  const handleOpenPaymentDialog = (item, event) => {
    event.stopPropagation(); // Prevent navigation to details
    setSelectedPaymentItem(item);
    setPaymentDate(new Date());
    setPriceValue(item.amount || 0);
    setPaymentDialogOpen(true);
  };

  // Aggiungi questa funzione dopo handleOpenPaymentDialog
  const handleConfirmPayment = async () => {
    try {
      if (!selectedPaymentItem) return;

      const formattedDate = format(paymentDate, 'yyyy-MM-dd');

      if (selectedPaymentItem.type === 'unpaid') {
        // Per le lezioni non pagate
        await lessonService.update(selectedPaymentItem.typeId, {
          is_paid: true,
          payment_date: formattedDate,
          price: priceValue
        });
      } else if (selectedPaymentItem.type === 'expired-package') {
        // Per i pacchetti scaduti
        // Prima ottieni tutti i dati del pacchetto
        const packageResponse = await packageService.getById(selectedPaymentItem.typeId);
        const packageData = packageResponse.data;

        // Aggiorna solo i campi necessari
        await packageService.update(selectedPaymentItem.typeId, {
          ...packageData,
          is_paid: true,
          payment_date: formattedDate,
          package_cost: priceValue
        });
      }

      // Ricarica i dati per aggiornare la UI
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');

      const [lessonsResponse, packagesResponse] = await Promise.all([
        lessonService.getAll(),
        packageService.getAll()
      ]);

      // Aggiorna i dati nello stato
      const paidLessons = lessonsResponse.data.filter(lesson =>
        lesson.is_paid &&
        lesson.payment_date &&
        !lesson.is_package &&
        lesson.payment_date >= startDateStr &&
        lesson.payment_date <= endDateStr
      );

      const paidPackages = packagesResponse.data.filter(pkg =>
        pkg.is_paid &&
        pkg.payment_date &&
        pkg.payment_date >= startDateStr &&
        pkg.payment_date <= endDateStr
      );

      // Formatta i pagamenti aggiornati
      const combinedPayments = [
        ...paidLessons.map(lesson => ({
          id: `lesson-${lesson.id}`,
          type: 'lesson',
          typeId: lesson.id,
          date: lesson.payment_date,
          student_id: lesson.student_id,
          amount: parseFloat(lesson.price || 0),
          hours: parseFloat(lesson.duration || 0),
          studentName: students[lesson.student_id] || `Studente #${lesson.student_id}`
        })),
        ...paidPackages.map(pkg => ({
          id: `package-${pkg.id}`,
          type: 'package',
          typeId: pkg.id,
          date: pkg.payment_date,
          student_id: pkg.student_ids?.[0] || null,
          amount: parseFloat(pkg.package_cost || 0),
          hours: parseFloat(pkg.total_hours || 0),
          studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`
        }))
      ];

      // Aggiorna anche lezioni non pagate e pacchetti scaduti
      const unpaidLessonsData = lessonsResponse.data.filter(lesson =>
        !lesson.is_paid &&
        !lesson.is_package &&
        lesson.lesson_date >= startDateStr &&
        lesson.lesson_date <= endDateStr
      );

      const formattedUnpaidLessons = unpaidLessonsData.map(lesson => ({
        id: `unpaid-${lesson.id}`,
        type: 'unpaid',
        typeId: lesson.id,
        date: lesson.lesson_date,
        student_id: lesson.student_id,
        amount: parseFloat(lesson.price || 0),
        hours: parseFloat(lesson.duration || 0),
        studentName: students[lesson.student_id] || `Studente #${lesson.student_id}`
      }));

      const expiredPackagesData = packagesResponse.data.filter(pkg =>
        !pkg.is_paid &&
        pkg.status === 'expired' &&
        pkg.expiry_date >= startDateStr &&
        pkg.expiry_date <= endDateStr
      );

      const formattedExpiredPackages = expiredPackagesData.map(pkg => ({
        id: `expired-${pkg.id}`,
        type: 'expired-package',
        typeId: pkg.id,
        date: pkg.expiry_date,
        student_id: pkg.student_ids?.[0] || null,
        amount: parseFloat(pkg.package_cost || 0),
        hours: parseFloat(pkg.total_hours || 0),
        studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`
      }));

      setPayments(combinedPayments);
      setUnpaidLessons(formattedUnpaidLessons);
      setExpiredPackages(formattedExpiredPackages);

      // Aggiorna anche i dati visualizzati per il giorno selezionato
      const dayPayments = combinedPayments.filter(payment =>
        selectedDay && isSameDay(parseISO(payment.date), selectedDay)
      );

      const unpaidLessonsForDay = formattedUnpaidLessons.filter(lesson =>
        selectedDay && isSameDay(parseISO(lesson.date), selectedDay)
      );

      const expiredPackagesForDay = formattedExpiredPackages.filter(pkg =>
        selectedDay && isSameDay(parseISO(pkg.date), selectedDay)
      );

      setDayPayments(dayPayments);
      setDayUnpaidLessons(unpaidLessonsForDay);
      setDayExpiredPackages(expiredPackagesForDay);

      // Chiudi il dialogo di pagamento
      setPaymentDialogOpen(false);

      // Se non ci sono più elementi non pagati, torna alla vista pagamenti
      if (unpaidLessonsForDay.length === 0 && expiredPackagesForDay.length === 0) {
        setViewMode('payments');
      }

    } catch (err) {
      console.error('Errore durante il salvataggio del pagamento:', err);
      alert('Errore durante il salvataggio del pagamento. Riprova più tardi.');
    }
  };

  // Load all payments for the current month
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);

        // Get start and end dates for current month
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        // Format dates for API
        const startDateStr = format(monthStart, 'yyyy-MM-dd');
        const endDateStr = format(monthEnd, 'yyyy-MM-dd');

        // Load all lessons and packages in parallel
        const [lessonsResponse, packagesResponse] = await Promise.all([
          lessonService.getAll(),
          packageService.getAll()
        ]);

        // Filter for paid lessons
        const paidLessons = lessonsResponse.data.filter(lesson =>
          lesson.is_paid &&
          lesson.payment_date &&
          !lesson.is_package &&
          lesson.payment_date >= startDateStr &&
          lesson.payment_date <= endDateStr
        );

        // Load paid packages
        const paidPackages = packagesResponse.data.filter(pkg =>
          pkg.is_paid &&
          pkg.payment_date &&
          pkg.payment_date >= startDateStr &&
          pkg.payment_date <= endDateStr
        );

        // Filtra i pacchetti scaduti e non pagati
        const expiredPackagesData = packagesResponse.data.filter(pkg =>
          !pkg.is_paid &&
          pkg.status === 'expired' &&
          pkg.expiry_date >= startDateStr &&
          pkg.expiry_date <= endDateStr
        );

        // Formatta i pacchetti scaduti
        const formattedExpiredPackages = expiredPackagesData.map(pkg => ({
          id: `expired-${pkg.id}`,
          type: 'expired-package',
          typeId: pkg.id,
          date: pkg.expiry_date,
          student_id: pkg.student_ids?.[0] || null,
          amount: parseFloat(pkg.package_cost || 0),
          hours: parseFloat(pkg.total_hours || 0),
          studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`
        }));

        setExpiredPackages(formattedExpiredPackages);

        // Combine and format payments
        const combinedPayments = [
          ...paidLessons.map(lesson => ({
            id: `lesson-${lesson.id}`,
            type: 'lesson',
            typeId: lesson.id,
            date: lesson.payment_date,
            student_id: lesson.student_id,
            amount: parseFloat(lesson.price || 0),
            hours: parseFloat(lesson.duration || 0)
          })),
          ...paidPackages.map(pkg => ({
            id: `package-${pkg.id}`,
            type: 'package',
            typeId: pkg.id,
            date: pkg.payment_date,
            student_id: pkg.student_ids?.[0] || null, // Use first student if multiple
            amount: parseFloat(pkg.package_cost || 0),
            hours: parseFloat(pkg.total_hours || 0)
          }))
        ];

        // Add student names to payments
        const paymentsWithStudentNames = combinedPayments.map(payment => {
          const studentName = students[payment.student_id] || `Studente #${payment.student_id}`;
          return {
            ...payment,
            studentName
          };
        });

        // Filter for unpaid lessons
        const unpaidLessonsData = lessonsResponse.data.filter(lesson =>
          !lesson.is_paid &&
          !lesson.is_package &&
          lesson.lesson_date >= startDateStr &&
          lesson.lesson_date <= endDateStr
        );

        // Format unpaid lessons
        const formattedUnpaidLessons = unpaidLessonsData.map(lesson => ({
          id: `unpaid-${lesson.id}`,
          type: 'unpaid',
          typeId: lesson.id,
          date: lesson.lesson_date, // Nota: usa lesson_date invece di payment_date
          student_id: lesson.student_id,
          amount: parseFloat(lesson.price || 0),
          hours: parseFloat(lesson.duration || 0),
          studentName: students[lesson.student_id] || `Studente #${lesson.student_id}`
        }));

        setUnpaidLessons(formattedUnpaidLessons);
        setPayments(paymentsWithStudentNames);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError('Impossibile caricare i pagamenti. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    if (Object.keys(students).length > 0) {
      fetchPayments();
    }
  }, [currentMonth, students]);

  // Change month handlers
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const handleResetToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Handle day click
  // Modifica la funzione handleDayClick
  const handleDayClick = (day) => {
    const dayPayments = payments.filter(payment =>
      isSameDay(parseISO(payment.date), day)
    );

    const unpaidLessonsForDay = getUnpaidLessonsForDay(day);
    const expiredPackagesForDay = getExpiredPackagesForDay(day);

    setSelectedDay(day);
    setDayPayments(dayPayments);
    setDayUnpaidLessons(unpaidLessonsForDay);
    setDayExpiredPackages(expiredPackagesForDay);

    // Mantieni la modalità di visualizzazione coerente con quella selezionata nel calendario
    // Questo assicura che il dialogo si apra nella stessa modalità del calendario
    setViewMode(viewMode);  // Non cambiare la modalità, usa quella già attiva

    setDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Navigate to payment details
  const handlePaymentClick = (payment) => {
    if (payment.type === 'lesson' || payment.type === 'unpaid') {
      navigate(`/lessons/${payment.typeId}`);
    } else if (payment.type === 'package' || payment.type === 'expired-package') {
      // Aggiungi gestione esplicita per i pacchetti scaduti
      navigate(`/packages/${payment.typeId}`);
    }
    setDialogOpen(false);
  };

  // Get days of current month
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Get weekday names
  const weekdays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  // Get payments for a specific day
  const getPaymentsForDay = (day) => {
    return payments.filter(payment =>
      isSameDay(parseISO(payment.date), day)
    );
  };

  // Modificare la funzione per ottenere le lezioni non pagate per un giorno
  const getUnpaidLessonsForDay = (day) => {
    return unpaidLessons.filter(lesson =>
      isSameDay(parseISO(lesson.date), day)
    );
  };

  // Conteggio lezioni non pagate per un giorno
  const getUnpaidCountForDay = (day) => {
    return getUnpaidLessonsForDay(day).length;
  };

  // Calculate total payments for a day
  const getTotalForDay = (day) => {
    const dayPayments = getPaymentsForDay(day);
    return dayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  // Calculate start day offset (to align first day with correct weekday column)
  const getFirstDayOffset = () => {
    const firstDay = startOfMonth(currentMonth);
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayOfWeek = firstDay.getDay();
    // Convert to 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  };

  // Calculate monthly stats
  const calculateMonthStats = () => {
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

    const packagePayments = payments.filter(payment => payment.type === 'package');
    const packageCount = packagePayments.length;
    const packageTotal = packagePayments.reduce((sum, payment) => sum + payment.amount, 0);

    const lessonPayments = payments.filter(payment => payment.type === 'lesson');
    const lessonHours = lessonPayments.reduce((sum, payment) => sum + payment.hours, 0);
    const lessonTotal = lessonPayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      totalAmount,
      packageCount,
      packageTotal,
      lessonHours,
      lessonTotal
    };
  };

  // Get student display names for a specific day
  // Modifica la funzione getStudentNamesForDay per ordinare alfabeticamente i nomi
  const getStudentNamesForDay = (day) => {
    // Se siamo in modalità pagamenti, mostra solo i pagamenti
    if (viewMode === 'payments') {
      const dayPayments = getPaymentsForDay(day);
      return dayPayments.map(payment => ({
        id: payment.id,
        name: formatStudentName(payment.studentName),
        type: payment.type
      })).sort((a, b) => a.name.localeCompare(b.name));
    }
    // Se siamo in modalità "da pagare", mostra lezioni non pagate e pacchetti scaduti
    else {
      const dayUnpaid = getUnpaidLessonsForDay(day);
      const dayExpired = getExpiredPackagesForDay(day);

      // Combina lezioni non pagate e pacchetti scaduti
      const allItems = [
        ...dayUnpaid.map(unpaid => ({
          id: unpaid.id,
          name: formatStudentName(unpaid.studentName),
          type: 'unpaid'
        })),
        ...dayExpired.map(pkg => ({
          id: pkg.id,
          name: formatStudentName(pkg.studentName),
          type: 'expired-package'
        }))
      ];

      return allItems.sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  const formatStudentName = (fullName) => {
    const nameParts = fullName.split(' ');
    let displayName = '';

    if (nameParts.length > 0) {
      displayName = nameParts[0];
      if (nameParts.length > 1) {
        displayName += ' ' + nameParts[1].charAt(0) + '.';
      }
    }

    return displayName;
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

  // Calculate monthly statistics
  const monthStats = calculateMonthStats();

  return (
    <Box>
      <Typography variant="h4" gutterBottom mb={3}>
        Agenda Pagamenti
      </Typography>

      {/* Month navigation */}
      <Card sx={{ mb: 1, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'center' },
            justifyContent: 'space-between',
            p: 2
          }}
        >
          <Typography
            variant="subtitle1"
            align="center"
            sx={{
              fontWeight: 'bold',
              fontSize: '1.2rem',
              mb: { xs: 2, sm: 0 }
            }}
          >
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </Typography>
          <ButtonGroup size="small">
            <Button
              onClick={handlePreviousMonth}
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Precedente
            </Button>
            <Button
              onClick={handleResetToCurrentMonth}
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Corrente
            </Button>
            <Button
              onClick={handleNextMonth}
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Successivo
            </Button>
          </ButtonGroup>
        </Box>
      </Card>

      {/* Monthly summary - moved abow the calendar */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <Grid container spacing={2}>
          {viewMode === 'payments' ? (
            /* Statistiche per i pagamenti effettuati */
            <>
              <Grid item xs={12} sm={2}>
                <Typography variant="body2" color="text.secondary">
                  Totale incassato
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  €{monthStats.totalAmount.toFixed(2)}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={2}>
                <Typography variant="body2" color="text.secondary">
                  Pacchetti pagati
                </Typography>
                <Typography variant="h5">
                  {monthStats.packageCount} pacchett{monthStats.packageCount === 1 ? 'o' : 'i'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={2}>
                <Typography variant="body2" color="text.secondary">
                  Totale da pacchetti
                </Typography>
                <Typography variant="h5" color="darkviolet" fontWeight="bold">
                  €{monthStats.packageTotal.toFixed(2)}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={2}>
                <Typography variant="body2" color="text.secondary">
                  Lezioni singole pagate
                </Typography>
                <Typography variant="h5">
                  {monthStats.lessonHours.toFixed(1)} ore
                </Typography>
              </Grid>

              <Grid item xs={12} sm={2}>
                <Typography variant="body2" color="text.secondary">
                  Totale da lezioni singole
                </Typography>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  €{monthStats.lessonTotal.toFixed(2)}
                </Typography>
              </Grid>
            </>
          ) : (
            /* Statistiche per i pagamenti da ricevere */
            <>
              {/* Calcoli per statistiche "da pagare" */}
              {(() => {
                // Calcola totale da lezioni non pagate
                const unpaidTotal = unpaidLessons.reduce((sum, lesson) => sum + lesson.amount, 0);
                const unpaidHours = unpaidLessons.reduce((sum, lesson) => sum + lesson.hours, 0);

                // Calcola totale da pacchetti scaduti
                const expiredPackagesCount = expiredPackages.length;
                const expiredPackagesTotal = expiredPackages.reduce((sum, pkg) => sum + pkg.amount, 0);

                // Totale complessivo da ricevere
                const totalToBePaid = unpaidTotal + expiredPackagesTotal;

                return (
                  <>
                    <Grid item xs={12} sm={2}>
                      <Typography variant="body2" color="text.secondary">
                        Totale da ricevere
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" color="error.main">
                        €{totalToBePaid.toFixed(2)}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <Typography variant="body2" color="text.secondary">
                        Pacchetti da saldare
                      </Typography>
                      <Typography variant="h5">
                        {expiredPackagesCount} pacchett{expiredPackagesCount === 1 ? 'o' : 'i'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <Typography variant="body2" color="text.secondary">
                        Totale da pacchetti
                      </Typography>
                      <Typography variant="h5" color="warning.main" fontWeight="bold">
                        €{expiredPackagesTotal.toFixed(2)}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <Typography variant="body2" color="text.secondary">
                        Lezioni singole non pagate
                      </Typography>
                      <Typography variant="h5">
                        {unpaidHours.toFixed(1)} ore
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={2}>
                      <Typography variant="body2" color="text.secondary">
                        Totale da lezioni singole
                      </Typography>
                      <Typography variant="h5" color="secondary" fontWeight="bold">
                        €{unpaidTotal.toFixed(2)}
                      </Typography>
                    </Grid>
                  </>
                );
              })()}
            </>
          )}
          {/* Colonna del bottone di switch - posizionarlo in alto a destra */}
          <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: { xs: 2, sm: 0 } }}>
            <ButtonGroup size="small">
              <Button
                variant={viewMode === 'payments' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('payments')}
              >
                Pagato
              </Button>
              <Button
                variant={viewMode === 'unpaid' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('unpaid')}
              >
                Non pagato
              </Button>
            </ButtonGroup>
          </Grid>
        </Grid>

      </Paper>

      {/* Calendar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        {/* Calendar header with weekdays */}
        <Grid container spacing={1} sx={{ mb: 1 }}>
          {weekdays.map((day, index) => (
            <Grid item xs={12 / 7} key={`weekday-${index}`}>
              <Box
                sx={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  borderRadius: 1
                }}
              >
                {day}
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Calendar grid with days */}
        <Grid container spacing={1}>
          {/* Empty cells for days before the start of the month */}
          {Array.from({ length: getFirstDayOffset() }).map((_, index) => (
            <Grid item xs={12 / 7} key={`empty-${index}`}>
              <Box sx={{
                height: 120,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1
              }}></Box>
            </Grid>
          ))}

          {/* Days of the month */}
          {daysInMonth.map((day, index) => {
            const dayPayments = getPaymentsForDay(day);
            const hasPayments = dayPayments.length > 0;
            const dayTotal = getTotalForDay(day);
            const isCurrentDay = isToday(day);
            const studentChips = getStudentNamesForDay(day);

            // MODIFICA QUI: Aggiungi questi calcoli
            const unpaidCount = getUnpaidCountForDay(day);
            const expiredCount = getExpiredPackagesCountForDay(day);
            const hasAnyData = hasPayments || unpaidCount > 0 || expiredCount > 0;

            return (
              <Grid item xs={12 / 7} key={`day-${index}`}>
                <Box
                  sx={{
                    height: 120,
                    border: '1px solid',
                    borderColor: isCurrentDay ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    position: 'relative',
                    p: 1,
                    pb: 0.5,
                    // MODIFICA QUI: Usa hasAnyData invece di hasPayments
                    cursor: hasAnyData ? 'pointer' : 'default',
                    '&:hover': hasAnyData ? {
                      backgroundColor: 'action.hover',
                      transform: 'scale(1.02)',
                      transition: 'transform 0.2s'
                    } : {},
                    boxShadow: isCurrentDay ? 1 : 0,
                    backgroundColor: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                  // MODIFICA QUI: Usa hasAnyData invece di hasPayments
                  onClick={hasAnyData ? () => handleDayClick(day) : undefined}
                >
                  {/* Day number in corner */}
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: isCurrentDay ? 'bold' : 'normal',
                      textAlign: 'right',
                      color: isCurrentDay ? 'primary.main' : 'text.primary',
                      position: 'absolute',
                      top: 2,
                      right: 4,
                      fontSize: '0.8rem'
                    }}
                  >
                    {format(day, 'd')}
                  </Typography>

                  {/* MODIFICA QUI: Cambia la condizione da hasPayments a hasAnyData */}
                  {hasAnyData && (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        width: '100%'
                      }}
                    >
                      {/* Amount in bold at the top - cambia in base alla modalità */}
                      {(() => {
                        if (viewMode === 'payments' && hasPayments) {
                          // Se in modalità "pagato" e ci sono pagamenti, mostra il totale pagato
                          return (
                            <Typography
                              variant="body1"
                              color="success.main"
                              fontWeight="bold"
                              sx={{
                                mt: 0.5,
                                mb: 0.5,
                                fontSize: '1rem',
                                lineHeight: 1
                              }}
                            >
                              €{dayTotal.toFixed(2)}
                            </Typography>
                          );
                        } else if (viewMode === 'unpaid') {
                          // Se in modalità "da pagare", calcola e mostra il totale da pagare
                          const unpaidAmount = getUnpaidLessonsForDay(day).reduce((sum, lesson) => sum + lesson.amount, 0);
                          const expiredAmount = getExpiredPackagesForDay(day).reduce((sum, pkg) => sum + pkg.amount, 0);
                          const totalToBePaid = unpaidAmount + expiredAmount;

                          // Mostra solo se c'è un importo da pagare
                          if (totalToBePaid > 0) {
                            return (
                              <Typography
                                variant="body1"
                                color="error.main"
                                fontWeight="bold"
                                sx={{
                                  mt: 0.5,
                                  mb: 0.5,
                                  fontSize: '1rem',
                                  lineHeight: 1
                                }}
                              >
                                €{totalToBePaid.toFixed(2)}
                              </Typography>
                            );
                          }
                        }

                        // Se non ci sono pagamenti nella modalità selezionata, non mostrare nulla
                        return null;
                      })()}

                      {/* Riepilogo numero di elementi */}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.7rem',
                          mb: 1,
                          lineHeight: 1,
                          mt: hasPayments ? 0 : 1 // mantieni il margine se non ci sono pagamenti
                        }}
                      >
                        {/* Mostra sempre le informazioni sui pagamenti, in grassetto solo se viewMode === 'payments' */}
                        {hasPayments && (
                          <span style={{ fontWeight: viewMode === 'payments' ? 'bold' : 'normal' }}>
                            {dayPayments.length} pagament{dayPayments.length === 1 ? 'o' : 'i'}
                          </span>
                        )}

                        {/* Mostra sempre le informazioni sulle lezioni non pagate, in grassetto solo se viewMode === 'unpaid' */}
                        {unpaidCount > 0 && (
                          <>
                            {hasPayments && " - "}
                            <span style={{ fontWeight: viewMode === 'unpaid' ? 'bold' : 'normal' }}>
                              {unpaidCount} lezion{unpaidCount === 1 ? 'e' : 'i'} non pagat{unpaidCount === 1 ? 'a' : 'e'}
                            </span>
                          </>
                        )}

                        {/* Mostra sempre le informazioni sui pacchetti scaduti, in grassetto solo se viewMode === 'unpaid' */}
                        {expiredCount > 0 && (
                          <>
                            {(hasPayments || unpaidCount > 0) && " - "}
                            <span style={{ fontWeight: viewMode === 'unpaid' ? 'bold' : 'normal' }}>
                              {expiredCount} pacchett{expiredCount === 1 ? 'o scaduto' : 'i scaduti'}
                            </span>
                          </>
                        )}
                      </Typography>

                      {/* Student chips with auto-scroll component - always show */}
                      <ScrollableChipsContainer>
                        {studentChips.map((student) => (
                          <Chip
                            key={student.id}
                            label={student.name}
                            size="small"
                            sx={{
                              height: 16,
                              margin: '1px',
                              backgroundColor: student.type === 'package'
                                ? 'darkviolet'
                                : student.type === 'expired-package'
                                  ? 'warning.main'
                                  : student.type === 'unpaid'
                                    ? 'secondary.main'
                                    : 'primary.main',
                              color: 'white',
                              '& .MuiChip-label': {
                                px: 0.6,
                                fontSize: '0.65rem',
                                fontWeight: 'medium',
                                whiteSpace: 'nowrap'
                              }
                            }}
                          />
                        ))}
                      </ScrollableChipsContainer>
                    </Box>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Day payments dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {selectedDay && format(selectedDay, 'EEEE d MMMM yyyy', { locale: it })}
          </Typography>
          <ButtonGroup size="small">
            <Button
              variant={viewMode === 'payments' ? 'contained' : 'outlined'}
              onClick={() => setViewMode('payments')}
            >
              Pagato
            </Button>
            <Button
              variant={viewMode === 'unpaid' ? 'contained' : 'outlined'}
              color='primary'
              onClick={() => setViewMode('unpaid')}
            >
              Non pagato
            </Button>
          </ButtonGroup>
        </DialogTitle>
        <DialogContent>
          {viewMode === 'payments' ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Totale giornaliero
                  </Typography>
                  <Typography variant="h5" gutterBottom>
                    €{dayPayments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 1 }} />

              <List dense>
                {dayPayments
                  .sort((a, b) => a.studentName.localeCompare(b.studentName))
                  .map((payment) => (
                    <ListItem
                      key={payment.id}
                      alignItems="flex-start"
                      button
                      onClick={() => handlePaymentClick(payment)}
                      sx={{
                        mb: 1,
                        py: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ mb: -0.5 }}>
                            <b>{payment.studentName}</b> ha pagato <b>€{payment.amount.toFixed(2)}</b>
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" component="span" sx={{ display: 'inline' }}>
                            <Typography
                              variant="caption"
                              component="span"
                              color={payment.type === 'lesson' ? 'primary' : 'darkviolet'}
                              sx={{ fontWeight: 500 }}
                            >
                              {payment.type === 'lesson' ? 'Lezione singola' : 'Pacchetto'}
                            </Typography>{' '}
                            di {payment.hours} ore
                          </Typography>
                        }
                        sx={{ my: 0 }}
                      />
                    </ListItem>
                  ))}
              </List>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Totale da saldare
                  </Typography>
                  <Typography variant="h5" gutterBottom>
                    €{(dayUnpaidLessons.reduce((sum, lesson) => sum + lesson.amount, 0) +
                      dayExpiredPackages.reduce((sum, pkg) => sum + pkg.amount, 0)).toFixed(2)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 1 }} />
              {dayExpiredPackages.length > 0 && (
                <>
                  <List dense>
                    {dayExpiredPackages
                      .sort((a, b) => a.studentName.localeCompare(b.studentName))
                      .map((pkg) => (
                        <ListItem
                          key={pkg.id}
                          alignItems="flex-start"
                          button
                          onClick={() => handlePaymentClick(pkg)}
                          sx={{
                            mb: 1,
                            py: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ mb: -0.5 }}>
                                <b>{pkg.studentName}</b> deve pagare <b>€{pkg.amount.toFixed(2)}</b>
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" component="span" sx={{ display: 'inline' }}>
                                <Typography
                                  variant="caption"
                                  component="span"
                                  color="warning.main"
                                  sx={{ fontWeight: 500 }}
                                >
                                  Pacchetto scaduto
                                </Typography>{' '}
                                di {pkg.hours} ore
                              </Typography>
                            }
                            sx={{ my: 0 }}
                          />
                            <Button
                              variant="contained"
                              size="small"
                              onClick={(e) => handleOpenPaymentDialog(pkg, e)}
                              sx={{
                                minWidth: '40px', height: '30px', ml: 1, bgcolor: 'warning.main', alignSelf: 'center' // Aggiungi questo per centrare verticalmente
                              }}
                            >
                              Segna come pagato
                            </Button>
                        </ListItem>
                      ))}
                  </List>
                </>
              )}
              <List dense>
                {dayUnpaidLessons
                  .sort((a, b) => a.studentName.localeCompare(b.studentName))
                  .map((lesson) => (
                    <ListItem
                      key={lesson.id}
                      alignItems="flex-start"
                      button
                      onClick={() => handlePaymentClick(lesson)}
                      sx={{
                        mb: 1,
                        py: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ mb: -0.5 }}>
                            <b>{lesson.studentName}</b> deve pagare <b>€{lesson.amount.toFixed(2)}</b>
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" component="span" sx={{ display: 'inline' }}>
                            <Typography
                              variant="caption"
                              component="span"
                              color="secondary"
                              sx={{ fontWeight: 500 }}
                            >
                              Lezione singola
                            </Typography>{' '}
                            di {lesson.hours} ore
                          </Typography>
                        }
                        sx={{ my: 0 }}
                      />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => handleOpenPaymentDialog(lesson, e)}
                          sx={{
                            minWidth: '40px', height: '30px', ml: 1, bgcolor: 'secondary.main', alignSelf: 'center' // Aggiungi questo per centrare verticalmente
                          }}
                        >
                          Segna come pagata
                        </Button>
                    </ListItem>
                  ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogo per impostare il pagamento */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          Conferma Pagamento
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label={selectedPaymentItem?.type === 'unpaid' ? "Prezzo Lezione" : "Prezzo Pacchetto"}
              type="number"
              value={priceValue}
              onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position="start">€</InputAdornment>,
              }}
            />
            <DatePicker
              label="Data pagamento"
              value={paymentDate}
              onChange={(date) => setPaymentDate(date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: "outlined"
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Annulla</Button>
          <Button
            onClick={handleConfirmPayment}
            variant="contained"
            color="primary"
          >
            Conferma Pagamento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PaymentCalendarPage;