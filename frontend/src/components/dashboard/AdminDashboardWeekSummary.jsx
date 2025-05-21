// frontend/src/components/dashboard/AdminDashboardWeekSummary.jsx
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

function AdminDashboardWeekSummary({
  currentWeekStart,
  weekEnd,
  allLessons = [],
  allPackages = [],
  professorWeeklyData = []
}) {
  const navigate = useNavigate();
  const [periodStats, setPeriodStats] = useState({
    income: 0,
    payments: 0,
    profit: 0,
    pendingAmount: 0,
    lessonsCount: { total: 0, paid: 0 },
    packagesCount: { expiring: 0, paid: 0 }
  });

  useEffect(() => {
    calculatePeriodStats();
  }, [currentWeekStart, weekEnd, allLessons, allPackages, professorWeeklyData]);

  const calculatePeriodStats = () => {
    // Skip if no data is available
    if (!allLessons.length && !allPackages.length) {
      setPeriodStats({
        income: 0,
        payments: 0,
        profit: 0,
        pendingAmount: 0,
        lessonsCount: { total: 0, paid: 0 },
        packagesCount: { expiring: 0, paid: 0 }
      });
      return;
    }

    // Format dates for comparison
    const periodStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const periodEndStr = format(weekEnd, 'yyyy-MM-dd');

    // INCOME: Calculate income from lessons that were paid within the period
    const paidLessons = allLessons.filter(lesson =>
      lesson.is_paid &&
      lesson.payment_date &&
      !lesson.is_package &&
      lesson.payment_date >= periodStartStr &&
      lesson.payment_date <= periodEndStr
    );

    // Get all package payments made in the period (including partial payments)
    const packagePaymentsInPeriod = allPackages
      .filter(pkg => pkg.payments && pkg.payments.length > 0)
      .flatMap(pkg =>
        pkg.payments.filter(payment =>
          payment.payment_date >= periodStartStr &&
          payment.payment_date <= periodEndStr
        )
      );

    const lessonIncome = paidLessons.reduce((sum, lesson) => sum + parseFloat(lesson.price || 0), 0);
    const packageIncome = packagePaymentsInPeriod.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
    const totalIncome = lessonIncome + packageIncome;

    // PAYMENTS: Get total payments to professors for the period
    const totalPayments = professorWeeklyData.reduce(
      (sum, prof) => sum + prof.totalPayment,
      0
    );

    // PENDING PAYMENTS: Calculate unpaid lessons from this period
    const unpaidLessons = allLessons.filter(lesson =>
      !lesson.is_paid &&
      !lesson.is_package &&
      lesson.lesson_date >= periodStartStr &&
      lesson.lesson_date <= periodEndStr
    );

    const unpaidAmount = unpaidLessons.reduce((sum, lesson) => {
      // Use either the lesson price or a default (20€ * duration)
      const price = parseFloat(lesson.price) || (parseFloat(lesson.duration) * 20);
      return sum + price;
    }, 0);

    // Get expired but unpaid/partially paid packages from this period
    const expiredUnpaidPackages = allPackages.filter(pkg =>
      pkg.status === 'expired' &&
      parseFloat(pkg.total_paid || 0) < parseFloat(pkg.package_cost || 0) &&
      pkg.expiry_date >= periodStartStr &&
      pkg.expiry_date <= periodEndStr
    );

    // Also include packages that are expiring this week but not fully paid
    const expiringUnpaidPackages = allPackages.filter(pkg => {
      if (pkg.status !== 'in_progress') return false;
      if (parseFloat(pkg.total_paid || 0) >= parseFloat(pkg.package_cost || 0)) return false;

      // Check if expiry date is within the period
      if (!(pkg.expiry_date >= periodStartStr && pkg.expiry_date <= periodEndStr)) return false;

      return true;
    });

    // Combine expired and expiring packages with remaining payment due
    const combinedUnpaidPackages = [...expiredUnpaidPackages, ...expiringUnpaidPackages];

    const unpaidPackagesAmount = combinedUnpaidPackages.reduce(
      (sum, pkg) => {
        // Consider only the portion that hasn't been paid yet
        const packageCost = parseFloat(pkg.package_cost || 0);
        const totalPaid = parseFloat(pkg.total_paid || 0);
        return sum + Math.max(0, packageCost - totalPaid);
      }, 0
    );

    const totalPendingAmount = unpaidAmount + unpaidPackagesAmount;

    // Lezioni single nel periodo (period lessons stats)
    const periodLessons = allLessons.filter(lesson =>
      lesson.lesson_date >= periodStartStr &&
      lesson.lesson_date <= periodEndStr &&
      !lesson.is_package // Solo lezioni singole
    );

    const periodLessonsPaid = periodLessons.filter(lesson => lesson.is_paid);

    // Pacchetti in scadenza nel periodo (expiring packages stats)
    const expiringPackages = allPackages.filter(pkg =>
      pkg.expiry_date >= periodStartStr &&
      pkg.expiry_date <= periodEndStr
    );

    // Consider a package as "paid" if total_paid >= package_cost
    const paidExpiringPackages = expiringPackages.filter(pkg =>
      parseFloat(pkg.package_cost || 0) > 0 && // Aggiungi questa condizione
      parseFloat(pkg.total_paid || 0) >= parseFloat(pkg.package_cost || 0)
    );

    // Update state with calculated values
    setPeriodStats({
      income: totalIncome,
      payments: totalPayments,
      profit: totalIncome - totalPayments,
      pendingAmount: totalPendingAmount,
      lessonsCount: {
        total: periodLessons.length,
        paid: periodLessonsPaid.length
      },
      packagesCount: {
        expiring: expiringPackages.length,
        paid: paidExpiringPackages.length
      }
    });
  };

  const navigateToPeriodLessons = () => {
    // Format dates for URL parameters
    const startDateParam = format(currentWeekStart, 'yyyy-MM-dd');
    const endDateParam = format(weekEnd, 'yyyy-MM-dd');

    // Navigate to lessons page with date filter parameters
    navigate(`/lessons?type=single&time=custom&startDate=${startDateParam}&endDate=${endDateParam}&isRange=true&order=asc&orderBy=is_paid`);
  };

  const navigateToPeriodExpiringPackages = () => {
    // Format dates for URL parameters
    const startDateParam = format(currentWeekStart, 'yyyy-MM-dd');
    const endDateParam = format(weekEnd, 'yyyy-MM-dd');

    // Navigate to packages page with expiry date filter parameters
    navigate(`/packages?expiry=custom&startDate=${startDateParam}&endDate=${endDateParam}&isRange=true&order=desc&orderBy=is_paid`);
  };

  return (
    <Paper sx={{ p: 2, mb: 1 }}>
      <Grid container spacing={2}>
        {/* Income */}
        <Grid item xs={12} sm={6} md={2}>
          <Typography variant="body2" color="text.secondary">
            Incasso
          </Typography>
          <Typography variant="h5" color="success.main" fontWeight="bold">
            €{periodStats.income.toFixed(2)}
          </Typography>
        </Grid>

        {/* Pending Payments */}
        <Grid item xs={12} sm={6} md={2}>
          <Typography variant="body2" color="text.secondary">
            Da incassare
          </Typography>
          <Typography variant="h5" color="text.primary">
            €{periodStats.pendingAmount.toFixed(2)}
          </Typography>
        </Grid>

        {/* Payments to professors */}
        <Grid item xs={12} sm={6} md={2}>
          <Typography variant="body2" color="text.secondary">
            Pagamenti prof.
          </Typography>
          <Typography variant="h5" color="text.primary">
            €{periodStats.payments.toFixed(2)}
          </Typography>
        </Grid>

        {/* Profit */}
        <Grid item xs={12} sm={6} md={2}>
          <Typography variant="body2" color="text.secondary">
            Ricavi
          </Typography>
          <Typography
            variant="h5"
            color="text.primary"
          >
            €{periodStats.profit.toFixed(2)}
          </Typography>
        </Grid>

        {/* Statistiche lezioni periodo - Make this clickable */}
        <Grid item xs={12} sm={6} md={2}>
          <Tooltip title='Lezioni singole pagate/Lezioni singole nel periodo selezionato'>
            <Box
              onClick={navigateToPeriodLessons}
              sx={{
                cursor: 'pointer',
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  transform: 'translateY(-2px)',
                  boxShadow: 1
                }
              }}
            >
              <Typography variant="body2" color="primary.main">
                Lezioni singole
              </Typography>
              <Typography variant="h5" color="text.primary">
                {periodStats.lessonsCount.paid}/{periodStats.lessonsCount.total}
              </Typography>
            </Box>
          </Tooltip>
        </Grid>

        {/* Statistiche pacchetti in scadenza */}
        <Grid item xs={12} sm={6} md={1}>
          <Tooltip title="Pacchetti saldati/Pacchetti in scadenza nel periodo selezionato">
            <Box
              onClick={navigateToPeriodExpiringPackages}
              sx={{
                cursor: 'pointer',
                borderRadius: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  transform: 'translateY(-2px)',
                  boxShadow: 1
                }
              }}
            >
              <Typography variant="body2" color="primary.main">
                Pacchetti
              </Typography>
              <Typography variant="h5" color="text.primary">
                {periodStats.packagesCount.paid}/{periodStats.packagesCount.expiring}
              </Typography>
            </Box>
          </Tooltip>
        </Grid>

      </Grid>
    </Paper>
  );
}

export default AdminDashboardWeekSummary;