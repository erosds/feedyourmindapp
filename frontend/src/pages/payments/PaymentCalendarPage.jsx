// frontend/src/pages/payments/PaymentCalendarPage.jsx (Refactored)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  CircularProgress,
  Paper,
  Typography,
  Tooltip,
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
import InfoIcon from '@mui/icons-material/Info';


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

  const [infoDialogOpen, setInfoDialogOpen] = useState(false);


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
            packagePaymentsInPeriod.push(...paymentsInPeriod.map(payment => {
              // For each payment, determine if it's a final payment or partial payment
              const packageCost = parseFloat(pkg.package_cost || 0);

              // Skip calculation for open packages (cost = 0)
              if (packageCost === 0) {
                return {
                  id: `package-payment-${payment.id}`,
                  type: 'package-payment',
                  typeId: payment.id,
                  packageId: parseInt(packageId),
                  date: payment.payment_date,
                  student_id: pkg.student_ids?.[0] || null,
                  amount: parseFloat(payment.amount || 0),
                  hours: parseFloat(pkg.total_hours || 0),
                  notes: payment.notes,
                  studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`,
                  isFinalPayment: false, // Open packages never have "final" payments
                  packageCost: packageCost
                };
              }

              // Calculate cumulative payments up to this specific payment
              // Sort all payments by date first
              const sortedPayments = [...payments].sort((a, b) =>
                new Date(a.payment_date) - new Date(b.payment_date)
              );

              // Find the index of the current payment in the sorted list
              const currentPaymentIndex = sortedPayments.findIndex(p => p.id === payment.id);

              // Calculate sum of payments up to and including this payment
              const sumUntilThisPayment = sortedPayments
                .slice(0, currentPaymentIndex + 1)
                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

              // Determine if it's a final payment (reaches or exceeds the package cost)
              const isFinalPayment = sumUntilThisPayment >= packageCost;

              return {
                id: `package-payment-${payment.id}`,
                type: 'package-payment',
                typeId: payment.id,
                packageId: parseInt(packageId),
                date: payment.payment_date,
                student_id: pkg.student_ids?.[0] || null,
                amount: parseFloat(payment.amount || 0),
                hours: parseFloat(pkg.total_hours || 0),
                notes: payment.notes,
                studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`,
                isFinalPayment, // This will now correctly identify final payments
                paymentType: isFinalPayment ? 'saldo' : 'acconto',
                packageCost: packageCost
              };
            }));
          }
        });

        // Filter for expired and unpaid packages
        const expiredPackagesData = packagesResponse.data.filter(pkg => {
          // Converti esplicitamente in numeri per un confronto affidabile
          const totalPaid = parseFloat(pkg.total_paid || 0);
          const packageCost = parseFloat(pkg.package_cost || 0);

          // MODIFICA: Gestione separata per pacchetti aperti (costo = 0) e pacchetti normali
          let isNotFullyPaid;

          if (packageCost === 0) {
            // Per pacchetti aperti: sono "non pagati" se non hanno ricevuto pagamenti e sono scaduti
            // oppure se sono stati pagati parzialmente ma non finalizzati
            isNotFullyPaid = !pkg.is_paid; // Semplicemente se il pacchetto non è marcato come pagato
          } else {
            // Per pacchetti normali: sono "non pagati" se il totale pagato è minore del costo
            isNotFullyPaid = totalPaid < packageCost;
          }

          return isNotFullyPaid &&
            pkg.status === 'expired' &&
            pkg.expiry_date >= startDateStr &&
            pkg.expiry_date <= endDateStr;
        });

        // Also filter for packages expiring this week (still active)
        const expiringPackagesData = packagesResponse.data.filter(pkg => {
          const expiryDate = parseISO(pkg.expiry_date);

          // MODIFICA: Stessa logica per i pacchetti in scadenza
          const totalPaid = parseFloat(pkg.total_paid || 0);
          const packageCost = parseFloat(pkg.package_cost || 0);

          let isNotFullyPaid;
          if (packageCost === 0) {
            isNotFullyPaid = !pkg.is_paid;
          } else {
            isNotFullyPaid = totalPaid < packageCost;
          }

          return (
            isNotFullyPaid &&
            pkg.status === 'in_progress' &&
            isPackageExpiring(pkg) &&
            expiryDate >= monthStart && expiryDate <= monthEnd
          );
        });

        // Format expired packages, showing the remaining amount or "da concordare" for open packages
        const formattedExpiredPackages = [
          ...expiredPackagesData.map(pkg => {
            const totalPaid = parseFloat(pkg.total_paid || 0);
            const packageCost = parseFloat(pkg.package_cost || 0);

            // MODIFICA: Per pacchetti aperti, mostra 0 come amount (verrà gestito nell'UI)
            const remainingAmount = packageCost === 0 ? 0 : Math.max(0, packageCost - totalPaid);

            return {
              id: `expired-${pkg.id}`,
              type: 'expired-package',
              typeId: pkg.id,
              date: pkg.expiry_date,
              student_id: pkg.student_ids?.[0] || null,
              amount: remainingAmount,
              hours: parseFloat(pkg.total_hours || 0),
              studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`,
              isOpenPackage: packageCost === 0 // NUOVO: Flag per identificare pacchetti aperti
            };
          }),
          ...expiringPackagesData.map(pkg => {
            const totalPaid = parseFloat(pkg.total_paid || 0);
            const packageCost = parseFloat(pkg.package_cost || 0);

            // MODIFICA: Stessa logica per pacchetti in scadenza
            const remainingAmount = packageCost === 0 ? 0 : Math.max(0, packageCost - totalPaid);

            return {
              id: `expiring-${pkg.id}`,
              type: 'expiring-package',
              typeId: pkg.id,
              date: pkg.expiry_date,
              student_id: pkg.student_ids?.[0] || null,
              amount: remainingAmount,
              hours: parseFloat(pkg.total_hours || 0),
              studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`,
              isOpenPackage: packageCost === 0 // NUOVO: Flag per identificare pacchetti aperti
            };
          })
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
          ...packagePaymentsInPeriod
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
  // Nel file frontend/src/pages/payments/PaymentCalendarPage.jsx
  // Trova la funzione getStudentNamesForDay e modifica la parte che genera le chip per i pacchetti scaduti/in scadenza

  // Sostituisci questa parte nel codice esistente:
  const getStudentNamesForDay = (day) => {
    // If in payments mode, show only payments
    if (viewMode === 'payments') {
      const dayPayments = getPaymentsForDay(day);

      // Separa pacchetti e lezioni
      const packages = dayPayments
        .filter(payment => payment.type === 'package' || payment.type === 'package-payment')
        .map(payment => ({
          id: payment.id,
          name: formatStudentName(payment.studentName),
          type: payment.type === 'package-payment' ? 'package-payment' : 'package',
          isFinalPayment: payment.isFinalPayment // Aggiungi questa proprietà
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const lessons = dayPayments.filter(payment => payment.type === 'lesson')
        .map(payment => ({
          id: payment.id,
          name: formatStudentName(payment.studentName),
          type: payment.type
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Concatena pacchetti prima, poi lezioni
      return [...packages, ...lessons];
    }
    // If in "unpaid" mode, show unpaid lessons and expired packages
    else {
      const dayUnpaid = getUnpaidLessonsForDay(day);
      const dayExpired = getExpiredPackagesForDay(day);

      // Sort expired packages: prima pacchetti normali, poi aperti, poi alfabeticamente
      const expiredPackages = dayExpired
        .filter(pkg => pkg.type === 'expired-package')
        .map(pkg => ({
          id: pkg.id,
          name: formatStudentName(pkg.studentName),
          type: 'expired-package',
          isOpenPackage: pkg.isOpenPackage
        }))
        .sort((a, b) => {
          // Prima ordina per tipo: pacchetti normali prima di quelli aperti
          if (a.isOpenPackage !== b.isOpenPackage) {
            return a.isOpenPackage ? 1 : -1; // false (normali) prima di true (aperti)
          }
          // Poi ordina alfabeticamente
          return a.name.localeCompare(b.name);
        });

      // Sort expiring packages: prima pacchetti normali, poi aperti, poi alfabeticamente
      const expiringPackages = dayExpired
        .filter(pkg => pkg.type === 'expiring-package')
        .map(pkg => ({
          id: pkg.id,
          name: formatStudentName(pkg.studentName),
          type: 'expiring-package',
          isOpenPackage: pkg.isOpenPackage
        }))
        .sort((a, b) => {
          // Prima ordina per tipo: pacchetti normali prima di quelli aperti
          if (a.isOpenPackage !== b.isOpenPackage) {
            return a.isOpenPackage ? 1 : -1; // false (normali) prima di true (aperti)
          }
          // Poi ordina alfabeticamente
          return a.name.localeCompare(b.name);
        });

      // Sort unpaid lessons alphabetically
      const unpaidLessons = dayUnpaid.map(unpaid => ({
        id: unpaid.id,
        name: formatStudentName(unpaid.studentName),
        type: 'unpaid'
      })).sort((a, b) => a.name.localeCompare(b.name));

      // Concatena prima i pacchetti scaduti, poi quelli in scadenza, infine le lezioni non pagate
      return [...expiredPackages, ...expiringPackages, ...unpaidLessons];
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

  // Modifica della funzione handlePaymentClick in PaymentCalendarPage.jsx
  const handlePaymentClick = (payment) => {
    if (payment.type === 'lesson' || payment.type === 'unpaid') {
      navigate(`/lessons/${payment.typeId}`);
    } else if (payment.type === 'package-payment') {
      // For package payments, go to the corresponding package
      navigate(`/packages/${payment.packageId}`);
    } else if (payment.type === 'package' || payment.type === 'expired-package' || payment.type === 'expiring-package') {
      // Aggiunto supporto per 'expiring-package'
      navigate(`/packages/${payment.typeId}`);
    }
    setDialogOpen(false);
  };

  const handleOpenPaymentDialog = (item, event) => {
    event.stopPropagation(); // Prevent navigation to details
    setSelectedPaymentItem(item);
    setPaymentDate(new Date());

    // MODIFICA: Gestione speciale per pacchetti aperti
    if (item.isOpenPackage) {
      // Per pacchetti aperti, suggerisci un importo vuoto perché il prezzo è da concordare
      setPriceValue('');
    } else {
      // Per altri tipi, usa l'importo esistente
      setPriceValue(item.amount || 0);
    }

    setPaymentDialogOpen(true);
  };

  // Modifica della funzione handleConfirmPayment in PaymentCalendarPage.jsx
  // Sostituisci COMPLETAMENTE la funzione handleConfirmPayment in PaymentCalendarPage.jsx

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
      } else if (selectedPaymentItem.type === 'expired-package' || selectedPaymentItem.type === 'expiring-package') {
        // MODIFICA: Per pacchetti scaduti/in scadenza (inclusi quelli aperti), aggiungiamo un nuovo pagamento

        // Validazione speciale per pacchetti aperti
        if (selectedPaymentItem.isOpenPackage) {
          if (!priceValue || priceValue <= 0) {
            alert('Per i pacchetti aperti è necessario inserire un importo valido');
            return;
          }
        }

        await packageService.addPayment(selectedPaymentItem.typeId, {
          amount: priceValue,
          payment_date: formattedDate,
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

        // Calcola il costo totale del pacchetto
        const packageCost = parseFloat(pkg.package_cost || 0);

        // Per ogni pagamento, calcola se è finale
        filteredPayments.forEach((payment) => {
          // Skip calculation for open packages
          if (packageCost === 0) {
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
              isFinalPayment: false,
              packageCost: packageCost
            });
            return;
          }

          // Sort all payments by date
          const sortedPayments = [...payments].sort((a, b) =>
            new Date(a.payment_date) - new Date(b.payment_date)
          );

          // Find current payment index
          const currentPaymentIndex = sortedPayments.findIndex(p => p.id === payment.id);

          // Calculate cumulative sum up to this payment
          const sumUntilThisPayment = sortedPayments
            .slice(0, currentPaymentIndex + 1)
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

          // Determine if this is the final payment
          const isFinalPayment = sumUntilThisPayment >= packageCost;

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
            isFinalPayment, // Correctly calculated
            packageCost: packageCost
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

      // *** QUI È LA CORREZIONE PRINCIPALE ***
      // PACCHETTI SCADUTI - SOLO status === 'expired'
      const expiredPackagesData = packagesResponse.data.filter(pkg => {
        // CORREZIONE: Usa la stessa logica del caricamento iniziale
        const totalPaid = parseFloat(pkg.total_paid || 0);
        const packageCost = parseFloat(pkg.package_cost || 0);

        // Gestione separata per pacchetti aperti (costo = 0) e pacchetti normali
        let isNotFullyPaid;

        if (packageCost === 0) {
          // Per pacchetti aperti: sono "non pagati" se non sono marcati come pagati
          isNotFullyPaid = !pkg.is_paid;
        } else {
          // Per pacchetti normali: sono "non pagati" se il totale pagato è minore del costo
          isNotFullyPaid = totalPaid < packageCost;
        }

        // Filtra per data di scadenza nel periodo E per stato non completamente pagato
        return isNotFullyPaid &&
          pkg.status === 'expired' &&
          pkg.expiry_date >= startDateStr &&
          pkg.expiry_date <= endDateStr;
      });

      // PACCHETTI IN SCADENZA - SOLO status === 'in_progress'
      const expiringPackagesData = packagesResponse.data.filter(pkg => {
        const expiryDate = parseISO(pkg.expiry_date);

        // CORREZIONE: Stessa logica per i pacchetti in scadenza
        const totalPaid = parseFloat(pkg.total_paid || 0);
        const packageCost = parseFloat(pkg.package_cost || 0);

        let isNotFullyPaid;
        if (packageCost === 0) {
          isNotFullyPaid = !pkg.is_paid;
        } else {
          isNotFullyPaid = totalPaid < packageCost;
        }

        return (
          isNotFullyPaid &&
          pkg.status === 'in_progress' &&
          isPackageExpiring(pkg) &&
          expiryDate >= monthStart && expiryDate <= monthEnd
        );
      });

      const formattedExpiredPackages = [
        ...expiredPackagesData.map(pkg => {
          // CORREZIONE: Calcola il totale versato usando i pagamenti effettivi
          const packagePayments = packagePaymentsMap[pkg.id] || [];
          const totalPaid = packagePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
          const packageCost = parseFloat(pkg.package_cost || 0);

          // Per pacchetti aperti, mostra 0 come amount (verrà gestito nell'UI)
          const remainingAmount = packageCost === 0 ? 0 : Math.max(0, packageCost - totalPaid);

          return {
            id: `expired-${pkg.id}`,
            type: 'expired-package',
            typeId: pkg.id,
            date: pkg.expiry_date,
            student_id: pkg.student_ids?.[0] || null,
            amount: remainingAmount,
            hours: parseFloat(pkg.total_hours || 0),
            studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`,
            isOpenPackage: packageCost === 0 // Flag per identificare pacchetti aperti
          };
        }),
        ...expiringPackagesData.map(pkg => {
          // CORREZIONE: Stessa logica per pacchetti in scadenza
          const packagePayments = packagePaymentsMap[pkg.id] || [];
          const totalPaid = packagePayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
          const packageCost = parseFloat(pkg.package_cost || 0);

          const remainingAmount = packageCost === 0 ? 0 : Math.max(0, packageCost - totalPaid);

          return {
            id: `expiring-${pkg.id}`,
            type: 'expiring-package',
            typeId: pkg.id,
            date: pkg.expiry_date,
            student_id: pkg.student_ids?.[0] || null,
            amount: remainingAmount,
            hours: parseFloat(pkg.total_hours || 0),
            studentName: students[pkg.student_ids?.[0]] || `Studente #${pkg.student_ids?.[0]}`,
            isOpenPackage: packageCost === 0 // Flag per identificare pacchetti aperti
          };
        })
      ];

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

      // MODIFICA: Messaggio di errore più specifico per pacchetti aperti
      let errorMessage = 'Errore durante il salvataggio del pagamento. Riprova più tardi.';

      if (selectedPaymentItem?.isOpenPackage && err.response?.status === 400) {
        errorMessage = 'Errore: verificare che l\'importo sia valido per il pacchetto aperto.';
      }

      alert(errorMessage);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ mr: 2 }}>
          Agenda Incassi
        </Typography>
        <Box display="flex" alignItems="center">

          <Tooltip title="Informazioni sui colori del calendario">
            <IconButton
              color="primary"
              onClick={() => setInfoDialogOpen(true)}
              sx={{ mr: 1 }}
            >
              <InfoIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

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

      {/* Info Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Legenda colori calendario pagamenti</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', textAlign: 'justify' }}>
            Modalità "Pagato"
          </Typography>

          <Box sx={{ mb: 3, ml: 1, mr: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="Nome"
                  size="small"
                  sx={{
                    backgroundColor: 'darkviolet',
                    color: 'white',
                    fontSize: '0.65rem',
                    height: 20
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                <b>Saldo pacchetto</b> - Pagamento finale che completa il pacchetto
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="Nome"
                  size="small"
                  sx={{
                    backgroundColor: 'mediumpurple',
                    color: 'white',
                    fontSize: '0.65rem',
                    height: 20
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                <b>Acconto pacchetto</b> - Pagamento parziale del pacchetto
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="Nome"
                  size="small"
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'white',
                    fontSize: '0.65rem',
                    height: 20
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                <b>Lezione singola</b> - Pagamento per lezione individuale
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body1" paragraph sx={{ fontWeight: 'bold', textAlign: 'justify' }}>
            Modalità "Non pagato"
          </Typography>

          <Box sx={{ mb: 3, ml: 1, mr: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="Nome"
                  size="small"
                  sx={{
                    backgroundColor: 'warning.main',
                    color: 'white',
                    fontSize: '0.65rem',
                    height: 20
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                <b>Pacchetto scaduto</b> - Pacchetto non ancora saldato completamente
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="Nome"
                  size="small"
                  sx={{
                    backgroundColor: 'darkorange',
                    color: 'white',
                    fontSize: '0.65rem',
                    height: 20
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                <b>Pacchetto aperto scaduto</b> - Pacchetto aperto, non ancora saldato completamente
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center' }}>
              <Box>
                <Chip
                  label="Nome"
                  size="small"
                  sx={{
                    backgroundColor: 'secondary.main',
                    color: 'white',
                    fontSize: '0.65rem',
                    height: 20
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                <b>Lezione singola non pagata</b> - Lezione individuale da saldare
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)} color="primary">
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PaymentCalendarPage;