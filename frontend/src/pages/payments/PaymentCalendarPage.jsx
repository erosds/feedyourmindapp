// frontend/src/pages/payments/PaymentCalendarPage.jsx (Refactored)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CircularProgress,
  Paper,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns';
import { it } from 'date-fns/locale';
import { lessonService, packageService, studentService, professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Import our componentized modules
import DesktopCalendarView from '../../components/payments/DesktopCalendarView';
import MobileCalendarView from '../../components/payments/MobileCalendarView';
import DayDetailsDialog from '../../components/payments/DayDetailsDialog';
import PaymentConfirmationDialog from '../../components/payments/PaymentConfirmationDialog';
import MonthlyStatsDisplay from '../../components/payments/MonthlyStatsDisplay';

function PaymentCalendarPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // States
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [dayPayments, setDayPayments] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [students, setStudents] = useState({});
  const [unpaidLessons, setUnpaidLessons] = useState([]);
  const [dayUnpaidLessons, setDayUnpaidLessons] = useState([]);
  const [viewMode, setViewMode] = useState('payments'); // 'payments' o 'unpaid'
  const [expiredPackages, setExpiredPackages] = useState([]);
  const [dayExpiredPackages, setDayExpiredPackages] = useState([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState(null);
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [priceValue, setPriceValue] = useState(0);
  const [professors, setProfessors] = useState({});

  // Verify admin access
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Get weekday names
  const weekdays = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

  // Calculate first day offset for calendar grid
  const getFirstDayOffset = () => {
    const firstDay = startOfMonth(currentMonth);
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const dayOfWeek = firstDay.getDay();
    // Convert to 0 = Monday, 1 = Tuesday, ..., 6 = Sunday
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  };

  // Get days of current month
  const daysInMonth = (() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = [];
    let currentDay = monthStart;
    while (currentDay <= monthEnd) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return days;
  })();

  // Helper function to get professor name
  const getProfessorName = (professorId) => {
    return professors[professorId] || `Professore #${professorId}`;
  };

  // Helper function to check if a package is expiring
  const isPackageExpiring = (pkg) => {
    const expiryDate = parseISO(pkg.expiry_date);

    // Get Monday of the current week
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // 0 for Sunday, transform to 7
    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - dayOfWeek + 1); // Monday of current week
    mondayThisWeek.setHours(0, 0, 0, 0); // Start of day

    // Get Monday of next week (7 days later)
    const mondayNextWeek = new Date(mondayThisWeek);
    mondayNextWeek.setDate(mondayThisWeek.getDate() + 7);

    // Check if it expires between Monday of this week and Monday of next week
    return expiryDate > mondayThisWeek && expiryDate <= mondayNextWeek;
  };

  // Load all data (students, professors)
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load students and professors in parallel
        const [studentsResponse, professorsResponse] = await Promise.all([
          studentService.getAll(),
          professorService.getAll()
        ]);

        const studentsMap = {};
        if (studentsResponse && studentsResponse.data) {
          studentsResponse.data.forEach(student => {
            studentsMap[student.id] = `${student.first_name} ${student.last_name}`;
          });
        }
        setStudents(studentsMap);

        const professorsMap = {};
        if (professorsResponse && professorsResponse.data) {
          professorsResponse.data.forEach(professor => {
            professorsMap[professor.id] = `${professor.first_name} ${professor.last_name}`;
          });
        }
        setProfessors(professorsMap);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  // Load payments data based on current month
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

        // Load all lessons, packages, and package payments in parallel
        const [lessonsResponse, packagesResponse, allPackagesResponse] = await Promise.all([
          lessonService.getAll(),
          packageService.getAll(),
          packageService.getAll() // Use this call again to get all packages
        ]);

        // For each package, load related payments
        const packagePaymentsPromises = allPackagesResponse.data.map(pkg =>
          packageService.getPayments(pkg.id)
        );

        const packagePaymentsResponses = await Promise.all(packagePaymentsPromises);

        // Create a map of payments for each package
        const packagePaymentsMap = {};
        packagePaymentsResponses.forEach((response, index) => {
          const packageId = allPackagesResponse.data[index].id;
          packagePaymentsMap[packageId] = response.data || [];
        });

        // Filter for single lesson payments
        const paidLessons = lessonsResponse.data.filter(lesson =>
          lesson.is_paid &&
          lesson.payment_date &&
          !lesson.is_package &&
          lesson.payment_date >= startDateStr &&
          lesson.payment_date <= endDateStr
        );

        // Collect package payments in the period
        const packagePaymentsInPeriod = [];

        Object.entries(packagePaymentsMap).forEach(([packageId, payments]) => {
          // Find the corresponding package
          const pkg = allPackagesResponse.data.find(p => p.id === parseInt(packageId));

          if (pkg) {
            // Filter payments within the period
            const paymentsInPeriod = payments.filter(payment =>
              payment.payment_date >= startDateStr &&
              payment.payment_date <= endDateStr
            );

            // Add the payments to our array
            packagePaymentsInPeriod.push(...paymentsInPeriod.map(payment => ({
              id: `package-payment-${payment.id}`,
              type: 'package-payment',
              typeId: payment.id,
              packageId: parseInt(packageId),
              date: payment.payment_date,
              student_id: pkg.student_ids?.[0] || null,
              amount: parseFloat(payment.amount || 0),
              hours: parseFloat(pkg.total_hours || 0),
              notes: payment.notes,
              studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`
            })));
          }
        });

        // Filter for expired and unpaid packages
        const expiredPackagesData = packagesResponse.data.filter(pkg => {
          // Converti esplicitamente in numeri per un confronto affidabile
          const totalPaid = parseFloat(pkg.total_paid || 0);
          const packageCost = parseFloat(pkg.package_cost || 0);

          // Un pacchetto è considerato "non pagato" se il totale pagato è minore del costo
          // e se il costo del pacchetto è maggiore di zero (per evitare pacchetti con costo zero)
          const isNotFullyPaid = totalPaid < packageCost && packageCost > 0;

          return isNotFullyPaid &&
            pkg.status === 'expired' &&
            pkg.expiry_date >= startDateStr &&
            pkg.expiry_date <= endDateStr;
        });

        // Also filter for packages expiring this week (still active)
        const expiringPackagesData = packagesResponse.data.filter(pkg => {
          const expiryDate = parseISO(pkg.expiry_date);
          return (
            pkg.total_paid < pkg.package_cost && // Not fully paid
            pkg.status === 'in_progress' &&
            isPackageExpiring(pkg) &&
            expiryDate >= monthStart && expiryDate <= monthEnd
          );
        });

        // Format expired packages, showing only the remaining amount to pay
        const formattedExpiredPackages = [
          ...expiredPackagesData.map(pkg => ({
            id: `expired-${pkg.id}`,
            type: 'expired-package',
            typeId: pkg.id,
            date: pkg.expiry_date,
            student_id: pkg.student_ids?.[0] || null,
            amount: parseFloat(pkg.package_cost || 0) - parseFloat(pkg.total_paid || 0), // Only the remaining amount
            hours: parseFloat(pkg.total_hours || 0),
            studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`
          })),
          ...expiringPackagesData.map(pkg => ({
            id: `expiring-${pkg.id}`,
            type: 'expired-package',
            typeId: pkg.id,
            date: pkg.expiry_date,
            student_id: pkg.student_ids?.[0] || null,
            amount: parseFloat(pkg.package_cost || 0) - parseFloat(pkg.total_paid || 0), // Only the remaining amount
            hours: parseFloat(pkg.total_hours || 0),
            studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`
          }))
        ];

        setExpiredPackages(formattedExpiredPackages);

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
          date: lesson.lesson_date,
          student_id: lesson.student_id,
          amount: parseFloat(lesson.price || 0),
          hours: parseFloat(lesson.duration || 0),
          studentName: students[lesson.student_id] || `Studente #${lesson.student_id}`,
          professorName: getProfessorName(lesson.professor_id)
        }));

        // Combine and format payments (lessons + package payments)
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
          ...packagePaymentsInPeriod.map(payment => {
            // For each payment, determine if it's a final payment or partial payment
            const pkg = allPackagesResponse.data.find(p => p.id === payment.packageId);
            if (!pkg) return payment;

            // Calculate the sum of all previous payments (including this one)
            const packagePayments = packagePaymentsMap[payment.packageId] || [];
            const paymentIndex = packagePayments.findIndex(p => p.id === payment.typeId);
            if (paymentIndex === -1) return payment;

            // Calculate the sum of payments up to this payment
            const sumUntilThisPayment = packagePayments
              .slice(0, paymentIndex + 1)
              .reduce((sum, p) => sum + parseFloat(p.amount), 0);

            // Determine if it's a final payment (reaches or exceeds the package cost)
            const packageCost = parseFloat(pkg.package_cost || 0);
            const isFinalPayment = sumUntilThisPayment >= packageCost && packageCost > 0;

            return {
              ...payment,
              isFinalPayment, // Add this information
              paymentType: isFinalPayment ? 'saldo' : 'acconto',
              packageCost
            };
          })
        ];

        setUnpaidLessons(formattedUnpaidLessons);
        setPayments(combinedPayments);
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

  // Get payments for a specific day
  const getPaymentsForDay = (day) => {
    return payments.filter(payment =>
      isSameDay(parseISO(payment.date), day)
    );
  };

  // Get unpaid lessons for a day
  const getUnpaidLessonsForDay = (day) => {
    return unpaidLessons.filter(lesson =>
      isSameDay(parseISO(lesson.date), day)
    );
  };

  // Get expired packages for a day
  const getExpiredPackagesForDay = (day) => {
    return expiredPackages.filter(pkg =>
      isSameDay(parseISO(pkg.date), day)
    );
  };

  // Count unpaid lessons for a day
  const getUnpaidCountForDay = (day) => {
    return getUnpaidLessonsForDay(day).length;
  };

  // Count expired packages for a day
  const getExpiredPackagesCountForDay = (day) => {
    return getExpiredPackagesForDay(day).length;
  };

  // Calculate total payments for a day
  const getTotalForDay = (day) => {
    const dayPayments = getPaymentsForDay(day);
    return dayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  // Format student names for display
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

  // Get formatted student names for calendar display
  const getStudentNamesForDay = (day) => {
    // If in payments mode, show only payments
    if (viewMode === 'payments') {
      const dayPayments = getPaymentsForDay(day);

      // Separate packages and lessons
      const packages = dayPayments
        .filter(payment => payment.type === 'package' || payment.type === 'package-payment')
        .map(payment => ({
          id: payment.id,
          name: formatStudentName(payment.studentName),
          type: payment.type === 'package-payment' ? 'package-payment' : 'package'
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const lessons = dayPayments.filter(payment => payment.type === 'lesson')
        .map(payment => ({
          id: payment.id,
          name: formatStudentName(payment.studentName),
          type: payment.type
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Concatenate packages first, then lessons
      return [...packages, ...lessons];
    }
    // If in "unpaid" mode, show unpaid lessons and expired packages
    else {
      const dayUnpaid = getUnpaidLessonsForDay(day);
      const dayExpired = getExpiredPackagesForDay(day);

      // Sort expired packages alphabetically
      const expiredPackages = dayExpired.map(pkg => ({
        id: pkg.id,
        name: formatStudentName(pkg.studentName),
        type: 'expired-package'
      })).sort((a, b) => a.name.localeCompare(b.name));

      // Sort unpaid lessons alphabetically
      const unpaidLessons = dayUnpaid.map(unpaid => ({
        id: unpaid.id,
        name: formatStudentName(unpaid.studentName),
        type: 'unpaid'
      })).sort((a, b) => a.name.localeCompare(b.name));

      // Concatenate expired packages first, then unpaid lessons
      return [...expiredPackages, ...unpaidLessons];
    }
  };

  // Calculate monthly stats
  const calculateMonthStats = () => {
    // Count package payments (not packages themselves)
    const packagePayments = payments.filter(payment => payment.type === 'package-payment');
    const packagePaymentsCount = packagePayments.length;
    const packagePaymentsTotal = packagePayments.reduce((sum, payment) => sum + payment.amount, 0);

    const lessonPayments = payments.filter(payment => payment.type === 'lesson');
    const lessonHours = lessonPayments.reduce((sum, payment) => sum + payment.hours, 0);
    const lessonTotal = lessonPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const totalAmount = packagePaymentsTotal + lessonTotal;

    return {
      totalAmount,
      packagePaymentsCount,
      packagePaymentsTotal,
      lessonHours,
      lessonTotal
    };
  };

  // Event Handlers
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };

  const handleResetToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const handleDayClick = (day) => {
    const dayPayments = getPaymentsForDay(day);
    const unpaidLessonsForDay = getUnpaidLessonsForDay(day);
    const expiredPackagesForDay = getExpiredPackagesForDay(day);

    setSelectedDay(day);
    setDayPayments(dayPayments);
    setDayUnpaidLessons(unpaidLessonsForDay);
    setDayExpiredPackages(expiredPackagesForDay);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handlePaymentClick = (payment) => {
    if (payment.type === 'lesson' || payment.type === 'unpaid') {
      navigate(`/lessons/${payment.typeId}`);
    } else if (payment.type === 'package-payment') {
      // For package payments, go to the corresponding package
      navigate(`/packages/${payment.packageId}`);
    } else if (payment.type === 'package' || payment.type === 'expired-package') {
      navigate(`/packages/${payment.typeId}`);
    }
    setDialogOpen(false);
  };

  const handleOpenPaymentDialog = (item, event) => {
    event.stopPropagation(); // Prevent navigation to details
    setSelectedPaymentItem(item);
    setPaymentDate(new Date());
    setPriceValue(item.amount || 0);
    setPaymentDialogOpen(true);
  };

  // Modifica della funzione handleConfirmPayment in PaymentCalendarPage.jsx
  const handleConfirmPayment = async () => {
    try {
      if (!selectedPaymentItem) return;

      const formattedDate = format(paymentDate, 'yyyy-MM-dd');

      if (selectedPaymentItem.type === 'unpaid') {
        // Per lezioni non pagate, aggiorniamo la lezione
        await lessonService.update(selectedPaymentItem.typeId, {
          is_paid: true,
          payment_date: formattedDate,
          price: priceValue
        });
      } else if (selectedPaymentItem.type === 'expired-package') {
        // Per pacchetti scaduti, invece di modificare il package_cost,
        // aggiungiamo un nuovo pagamento al pacchetto con packageService.addPayment
        await packageService.addPayment(selectedPaymentItem.typeId, {
          amount: priceValue,
          payment_date: formattedDate,
          notes: "Pagamento generato da calendario pagamenti"
        });
      }

      // Ricarica i dati per aggiornare l'UI
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');

      // Recupera lezioni e pacchetti aggiornati
      const [lessonsResponse, packagesResponse] = await Promise.all([
        lessonService.getAll(),
        packageService.getAll()
      ]);

      // Per ogni pacchetto, recupera i relativi pagamenti
      const packagePaymentsPromises = packagesResponse.data.map(pkg =>
        packageService.getPayments(pkg.id)
      );

      // Attendi tutti i risultati
      const packagePaymentsResponses = await Promise.all(packagePaymentsPromises);

      // Crea un mapping tra pacchetti e pagamenti
      const packagePaymentsMap = {};
      packagePaymentsResponses.forEach((response, index) => {
        const packageId = packagesResponse.data[index].id;
        packagePaymentsMap[packageId] = response.data || [];
      });

      // Lezioni con pagamento nel periodo selezionato
      const paidLessons = lessonsResponse.data.filter(lesson =>
        lesson.is_paid &&
        lesson.payment_date &&
        !lesson.is_package &&
        lesson.payment_date >= startDateStr &&
        lesson.payment_date <= endDateStr
      );

      // Formatta i pagamenti delle lezioni
      const lessonPayments = paidLessons.map(lesson => ({
        id: `lesson-${lesson.id}`,
        type: 'lesson',
        typeId: lesson.id,
        date: lesson.payment_date,
        student_id: lesson.student_id,
        amount: parseFloat(lesson.price || 0),
        hours: parseFloat(lesson.duration || 0),
        studentName: students[lesson.student_id] || `Studente #${lesson.student_id}`
      }));

      // Raccogli tutti i pagamenti di pacchetti nel periodo
      const packagePaymentsInPeriod = [];
      packagesResponse.data.forEach(pkg => {
        const packageId = pkg.id;
        const payments = packagePaymentsMap[packageId] || [];

        // Filtra i pagamenti nel periodo
        const filteredPayments = payments.filter(payment =>
          payment.payment_date >= startDateStr &&
          payment.payment_date <= endDateStr
        );

        // Calcola il costo totale del pacchetto e i pagamenti accumulati per ogni pagamento
        filteredPayments.forEach((payment, index) => {
          // Calcola la somma dei pagamenti fino a questo pagamento
          const paymentsUntilThis = payments.slice(0, payments.findIndex(p => p.id === payment.id) + 1);
          const sumPaid = paymentsUntilThis.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

          // Determina se questo è il pagamento finale (raggiunge o supera il costo del pacchetto)
          const isFinalPayment = sumPaid >= parseFloat(pkg.package_cost || 0) && parseFloat(pkg.package_cost || 0) > 0;

          packagePaymentsInPeriod.push({
            id: `package-payment-${payment.id}`,
            type: 'package-payment',
            typeId: payment.id,
            packageId: packageId,
            date: payment.payment_date,
            student_id: pkg.student_ids?.[0] || null,
            amount: parseFloat(payment.amount || 0),
            hours: parseFloat(pkg.total_hours || 0),
            notes: payment.notes,
            studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`,
            isFinalPayment, // Indica se questo è il pagamento finale
            packageCost: parseFloat(pkg.package_cost || 0)
          });
        });
      });

      // Combina tutti i pagamenti
      const allPayments = [...lessonPayments, ...packagePaymentsInPeriod];
      setPayments(allPayments);

      // Aggiorna i dati di lezioni non pagate
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
        studentName: students[lesson.student_id] || `Studente #${lesson.student_id}`,
        professorName: getProfessorName(lesson.professor_id)
      }));

      setUnpaidLessons(formattedUnpaidLessons);

      // Aggiorna i pacchetti scaduti non pagati completamente
      const expiredPackagesData = packagesResponse.data.filter(pkg => {
        if (pkg.status !== 'expired' && pkg.status !== 'in_progress') return false;

        // Calcola quanto è stato pagato
        const packagePayments = packagePaymentsMap[pkg.id] || [];
        const totalPaid = packagePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        // Considera solo pacchetti non completamente pagati
        if (totalPaid >= parseFloat(pkg.package_cost || 0)) return false;

        // Filtra per data di scadenza nel periodo
        return pkg.expiry_date >= startDateStr && pkg.expiry_date <= endDateStr;
      });

      const formattedExpiredPackages = expiredPackagesData.map(pkg => {
        // Calcola quanto è stato pagato
        const packagePayments = packagePaymentsMap[pkg.id] || [];
        const totalPaid = packagePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        // Calcola quanto resta da pagare
        const remainingAmount = Math.max(0, parseFloat(pkg.package_cost || 0) - totalPaid);

        return {
          id: `expired-${pkg.id}`,
          type: 'expired-package',
          typeId: pkg.id,
          date: pkg.expiry_date,
          student_id: pkg.student_ids?.[0] || null,
          amount: remainingAmount, // Solo l'importo rimanente
          hours: parseFloat(pkg.total_hours || 0),
          studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`
        };
      });

      setExpiredPackages(formattedExpiredPackages);

      // Aggiorna i dati visualizzati per il giorno selezionato
      const dayPayments = allPayments.filter(payment =>
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

      // Chiudi il dialog di pagamento
      setPaymentDialogOpen(false);

      // Se non ci sono più elementi non pagati, passa alla vista dei pagamenti
      if (unpaidLessonsForDay.length === 0 && expiredPackagesForDay.length === 0) {
        setViewMode('payments');
      }

    } catch (err) {
      console.error('Error saving payment:', err);
      alert('Errore durante il salvataggio del pagamento. Riprova più tardi.');
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

  const monthStats = calculateMonthStats();

  return (
    <Box>
      <Typography variant="h4" gutterBottom mb={3}>
        Agenda Incassi
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

      {/* Monthly summary */}
      <Paper sx={{ p: 2, mb: 1 }}>
        <MonthlyStatsDisplay
          viewMode={viewMode}
          setViewMode={setViewMode}
          monthStats={monthStats}
          unpaidLessons={unpaidLessons}
          expiredPackages={expiredPackages}
        />
      </Paper>

      {/* Calendar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        {!isMobile ? (
          <DesktopCalendarView
            daysInMonth={daysInMonth}
            weekdays={weekdays}
            getFirstDayOffset={getFirstDayOffset}
            getPaymentsForDay={getPaymentsForDay}
            getTotalForDay={getTotalForDay}
            getUnpaidLessonsForDay={getUnpaidLessonsForDay}
            getUnpaidCountForDay={getUnpaidCountForDay}
            getExpiredPackagesForDay={getExpiredPackagesForDay}
            getExpiredPackagesCountForDay={getExpiredPackagesCountForDay}
            getStudentNamesForDay={getStudentNamesForDay}
            viewMode={viewMode}
            handleDayClick={handleDayClick}
          />
        ) : (
          <MobileCalendarView
            daysInMonth={daysInMonth}
            getPaymentsForDay={getPaymentsForDay}
            getTotalForDay={getTotalForDay}
            // Parte mancante del codice da aggiungere alla fine del componente
            getUnpaidLessonsForDay={getUnpaidLessonsForDay}
            getUnpaidCountForDay={getUnpaidCountForDay}
            getExpiredPackagesForDay={getExpiredPackagesForDay}
            getExpiredPackagesCountForDay={getExpiredPackagesCountForDay}
            getStudentNamesForDay={getStudentNamesForDay}
            viewMode={viewMode}
            handleDayClick={handleDayClick}
          />
        )}
      </Paper>

      {/* Day details dialog */}
      <DayDetailsDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        selectedDay={selectedDay}
        dayPayments={dayPayments}
        dayUnpaidLessons={dayUnpaidLessons}
        dayExpiredPackages={dayExpiredPackages}
        viewMode={viewMode}
        setViewMode={setViewMode}
        handlePaymentClick={handlePaymentClick}
        handleOpenPaymentDialog={handleOpenPaymentDialog}
      />

      {/* Payment confirmation dialog */}
      <PaymentConfirmationDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        selectedPaymentItem={selectedPaymentItem}
        paymentDate={paymentDate}
        setPaymentDate={setPaymentDate}
        priceValue={priceValue}
        setPriceValue={setPriceValue}
        onConfirm={handleConfirmPayment}
      />
    </Box>
  );
}

export default PaymentCalendarPage;