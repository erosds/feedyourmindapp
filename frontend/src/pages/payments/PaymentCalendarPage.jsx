// src/pages/payments/PaymentCalendarPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonGroup,
  Card,
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
import { lessonService, packageService } from '../../services/api';
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

  // Verify admin access
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

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

        // Fetch student data for each payment
        const studentsResponse = await fetch('/api/students');
        const studentsData = await studentsResponse.json();
        const students = studentsData.data || [];
        
        // Add student names to payments
        const paymentsWithStudentNames = combinedPayments.map(payment => {
          const student = students.find(s => s.id === payment.student_id);
          const studentName = student 
            ? `${student.first_name} ${student.last_name}` 
            : `Studente #${payment.student_id}`;
          
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

    fetchPayments();
  }, [currentMonth]);

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

      {/* Monthly summary */}
      <Box mb={3}>
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Totale pagamenti del mese
              </Typography>
              <Typography variant="h5" color="primary">
                €{payments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Numero di pagamenti
              </Typography>
              <Typography variant="h5">
                {payments.length}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                Ore totali
              </Typography>
              <Typography variant="h5">
                {payments.reduce((sum, payment) => sum + payment.hours, 0).toFixed(1)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Calendar */}
      <Paper sx={{ p: 2 }}>
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
                height: 100, 
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

            return (
              <Grid item xs={12 / 7} key={`day-${index}`}>
                <Box
                  sx={{
                    height: 100,
                    border: '1px solid',
                    borderColor: isCurrentDay ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    position: 'relative',
                    p: 1,
                    cursor: hasPayments ? 'pointer' : 'default',
                    '&:hover': hasPayments ? {
                      backgroundColor: 'action.hover',
                      transform: 'scale(1.02)',
                      transition: 'transform 0.2s'
                    } : {},
                    boxShadow: isCurrentDay ? 1 : 0,
                    backgroundColor: hasPayments ? 'rgba(0, 230, 118, 0.1)' : 'inherit'
                  }}
                  onClick={hasPayments ? () => handleDayClick(day) : undefined}
                >
                  {/* Day number */}
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: isCurrentDay ? 'bold' : 'normal',
                      textAlign: 'right',
                      color: isCurrentDay ? 'primary.main' : 'text.primary'
                    }}
                  >
                    {format(day, 'd')}
                  </Typography>

                  {/* Payment indicator */}
                  {hasPayments && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        €{dayTotal.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayPayments.length} pagament{dayPayments.length === 1 ? 'o' : 'i'}
                      </Typography>
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
        <DialogTitle>
          Pagamenti del {selectedDay && format(selectedDay, 'EEEE d MMMM yyyy', { locale: it })}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Totale giornaliero
            </Typography>
            <Typography variant="h5" color="success.main" gutterBottom>
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
                    <>
                      <Typography variant="body2" color="text.secondary" component="span">
                        {payment.type === 'lesson' 
                          ? `Lezione singola di ${payment.hours} ore` 
                          : `Pacchetto di ${payment.hours} ore`}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          display: 'block', 
                          color: payment.type === 'lesson' ? 'info.main' : 'secondary.main',
                          mt: 0.5
                        }}
                      >
                        {payment.type === 'lesson' ? 'Lezione' : 'Pacchetto'} #{payment.typeId}
                      </Typography>
                    </>
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