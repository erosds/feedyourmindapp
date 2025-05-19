// Modifiche a AdminDashboardWeekSummary.jsx
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import { format } from 'date-fns';
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

    // INCOME: Calculate income from lessons and packages that were paid within the period
    const paidLessons = allLessons.filter(lesson =>
      lesson.is_paid &&
      lesson.payment_date &&
      !lesson.is_package &&
      lesson.payment_date >= periodStartStr &&
      lesson.payment_date <= periodEndStr
    );

    const paidPackages = allPackages.filter(pkg =>
      pkg.is_paid &&
      pkg.payment_date &&
      pkg.payment_date >= periodStartStr &&
      pkg.payment_date <= periodEndStr
    );

    const lessonIncome = paidLessons.reduce((sum, lesson) => sum + parseFloat(lesson.price || 0), 0);
    const packageIncome = paidPackages.reduce((sum, pkg) => sum + parseFloat(pkg.package_cost || 0), 0);
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

    // Expired but unpaid packages from this period
    const expiredUnpaidPackages = allPackages.filter(pkg =>
      !pkg.is_paid &&
      pkg.expiry_date >= periodStartStr &&
      pkg.expiry_date <= periodEndStr
    );

    const unpaidPackagesAmount = expiredUnpaidPackages.reduce(
      (sum, pkg) => sum + parseFloat(pkg.package_cost || 0),
      0
    );

    const totalPendingAmount = unpaidAmount + unpaidPackagesAmount;

    // Calcolo statistiche su lezioni del periodo
    const periodLessons = allLessons.filter(lesson =>
      lesson.lesson_date >= periodStartStr &&
      lesson.lesson_date <= periodEndStr &&
      !lesson.is_package // Solo lezioni singole
    );

    const periodLessonsPaid = periodLessons.filter(lesson => lesson.is_paid);

    // Calcolo statistiche su pacchetti in scadenza in questo periodo
    const expiringPackages = allPackages.filter(pkg =>
      pkg.expiry_date >= periodStartStr &&
      pkg.expiry_date <= periodEndStr
    );

    const paidExpiringPackages = expiringPackages.filter(pkg => pkg.is_paid);

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
            Pagamenti
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
          <Tooltip title="Pacchetti pagati/Pacchetti in scadenza nel periodo selezionato">
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