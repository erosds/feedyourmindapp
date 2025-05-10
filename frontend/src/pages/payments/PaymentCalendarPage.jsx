// src/pages/payments/PaymentCalendarPage.jsx
import React, { useState, useEffect } from 'react';
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
  Stack,
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

        // Load paid lessons
        const lessonsResponse = await lessonService.getAll();
        const paidLessons = lessonsResponse.data.filter(lesson => 
          lesson.is_paid && 
          lesson.payment_date && 
          !lesson.is_package &&
          lesson.payment_date >= startDateStr &&
          lesson.payment_date <= endDateStr
        );

        // Load paid packages
        const packagesResponse = await packageService.getAll();
        const paidPackages = packagesResponse.data.filter(pkg => 
          pkg.is_paid && 
          pkg.payment_date &&
          pkg.payment_date >= startDateStr &&
          pkg.payment_date <= endDateStr
        );

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
  const handleDayClick = (day) => {
    const dayPayments = payments.filter(payment => 
      isSameDay(parseISO(payment.date), day)
    );
    
    setSelectedDay(day);
    setDayPayments(dayPayments);
    setDialogOpen(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  // Navigate to payment details
  const handlePaymentClick = (payment) => {
    if (payment.type === 'lesson') {
      navigate(`/lessons/${payment.typeId}`);
    } else if (payment.type === 'package') {
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
  const weekdays = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];

  // Get payments for a specific day
  const getPaymentsForDay = (day) => {
    return payments.filter(payment => 
      isSameDay(parseISO(payment.date), day)
    );
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
  const getStudentNamesForDay = (day) => {
    const dayPayments = getPaymentsForDay(day);
    return dayPayments.map(payment => {
      // Extract first name and first letter of last name
      const fullName = payment.studentName || '';
      const nameParts = fullName.split(' ');
      let displayName = '';
      
      if (nameParts.length > 0) {
        displayName = nameParts[0]; // First name
        if (nameParts.length > 1) {
          displayName += ' ' + nameParts[1].charAt(0) + '.'; // First letter of last name
        }
      }
      
      return {
        id: payment.id,
        name: displayName,
        type: payment.type
      };
    });
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
        Calendario Pagamenti
      </Typography>

      {/* Month navigation */}
      <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
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
              Mese Precedente
            </Button>
            <Button 
              onClick={handleResetToCurrentMonth} 
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Mese Corrente
            </Button>
            <Button 
              onClick={handleNextMonth} 
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
            >
              Mese Successivo
            </Button>
          </ButtonGroup>
        </Box>
      </Card>

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
                  p: 1,
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
                    cursor: hasPayments ? 'pointer' : 'default',
                    '&:hover': hasPayments ? {
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
                  onClick={hasPayments ? () => handleDayClick(day) : undefined}
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
                      fontSize: '0.75rem'
                    }}
                  >
                    {format(day, 'd')}
                  </Typography>

                  {/* Payment indicator with student chips */}
                  {hasPayments && (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: '100%',
                        width: '100%'
                      }}
                    >
                      {/* Amount in bold at the top */}
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
                      
                      {/* Number of payments below */}
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{
                          fontSize: '0.7rem',
                          mb: 1,
                          lineHeight: 1
                        }}
                      >
                        {dayPayments.length} pagament{dayPayments.length === 1 ? 'o' : 'i'}
                      </Typography>
                      
                      {/* Student chips filling the rest of the square */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '2px',
                          mt: 0,
                          overflow: 'hidden',
                          flexGrow: 1
                        }}
                      >
                        {studentChips.map((student) => (
                          <Chip
                            key={student.id}
                            label={student.name}
                            size="small"
                            color={student.type === 'package' ? 'secondary' : 'primary'}
                            sx={{ 
                              height: 15, 
                              margin: '1px',
                              '& .MuiChip-label': { 
                                px: 0.5, 
                                fontSize: '0.65rem',
                                fontWeight: 'medium',
                                whiteSpace: 'nowrap'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Monthly summary - moved below the calendar */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Riepilogo del mese di {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={2.5}>
            <Typography variant="body2" color="text.secondary">
              Totale pagamenti
            </Typography>
            <Typography variant="h5" color="success.main">
              €{monthStats.totalAmount.toFixed(2)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={2.5}>
            <Typography variant="body2" color="text.secondary">
              Pacchetti pagati
            </Typography>
            <Typography variant="h5">
              {monthStats.packageCount} pacchett{monthStats.packageCount === 1 ? 'o' : 'i'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={2.5}>
            <Typography variant="body2" color="text.secondary">
              Totale da pacchetti
            </Typography>
            <Typography variant="h5" color="secondary.main">
              €{monthStats.packageTotal.toFixed(2)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={2.5}>
            <Typography variant="body2" color="text.secondary">
              Ore lezioni singole pagate
            </Typography>
            <Typography variant="h5">
              {monthStats.lessonHours.toFixed(1)} ore
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={2}>
            <Typography variant="body2" color="text.secondary">
              Totale da lezioni singole
            </Typography>
            <Typography variant="h5" color="primary.main">
              €{monthStats.lessonTotal.toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Day payments dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Pagamenti del {selectedDay && format(selectedDay, 'EEEE d MMMM yyyy', { locale: it })}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Totale giornaliero
            </Typography>
            <Typography variant="h5" gutterBottom>
              €{dayPayments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <List>
            {dayPayments.map((payment) => (
              <ListItem
                key={payment.id}
                alignItems="flex-start"
                button
                onClick={() => handlePaymentClick(payment)}
                sx={{
                  mb: 1,
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
                    <Typography variant="subtitle1">
                      {payment.studentName} - €{payment.amount.toFixed(2)}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" component="span">
                      {payment.type === 'lesson' 
                        ? `Lezione singola di ${payment.hours} ore` 
                        : `Pacchetto di ${payment.hours} ore`}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PaymentCalendarPage;