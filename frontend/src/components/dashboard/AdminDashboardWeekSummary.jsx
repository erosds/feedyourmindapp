// src/components/dashboard/AdminDashboardWeekSummary.jsx
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,  // Add this import
} from '@mui/material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom'; // Add this import

function AdminDashboardWeekSummary({
  currentWeekStart,
  weekEnd,
  allLessons = [],
  allPackages = [],
  professorWeeklyData = []
}) {
  const navigate = useNavigate(); // Add this line
  const [weeklyStats, setWeeklyStats] = useState({
    income: 0,
    payments: 0,
    profit: 0,
    pendingAmount: 0,
    // Nuovi campi
    lessonsCount: { total: 0, paid: 0 },
    packagesCount: { expiring: 0, paid: 0 }
  });

  useEffect(() => {
    calculateWeeklyStats();
  }, [currentWeekStart, weekEnd, allLessons, allPackages, professorWeeklyData]);

  const calculateWeeklyStats = () => {
    // Skip if no data is available
    if (!allLessons.length && !allPackages.length) {
      setWeeklyStats({
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
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    // INCOME: Calculate income from lessons and packages that were paid within the week
    const paidLessons = allLessons.filter(lesson =>
      lesson.is_paid &&
      lesson.payment_date &&
      !lesson.is_package &&
      lesson.payment_date >= weekStartStr &&
      lesson.payment_date <= weekEndStr
    );

    const paidPackages = allPackages.filter(pkg =>
      pkg.is_paid &&
      pkg.payment_date &&
      pkg.payment_date >= weekStartStr &&
      pkg.payment_date <= weekEndStr
    );

    const lessonIncome = paidLessons.reduce((sum, lesson) => sum + parseFloat(lesson.price || 0), 0);
    const packageIncome = paidPackages.reduce((sum, pkg) => sum + parseFloat(pkg.package_cost || 0), 0);
    const totalIncome = lessonIncome + packageIncome;

    // PAYMENTS: Get total payments to professors for the week
    const totalPayments = professorWeeklyData.reduce(
      (sum, prof) => sum + prof.totalPayment,
      0
    );

    // PENDING PAYMENTS: Calculate unpaid lessons from this week
    const unpaidLessons = allLessons.filter(lesson =>
      !lesson.is_paid &&
      !lesson.is_package &&
      lesson.lesson_date >= weekStartStr &&
      lesson.lesson_date <= weekEndStr
    );

    const unpaidAmount = unpaidLessons.reduce((sum, lesson) => {
      // Use either the lesson price or a default (20€ * duration)
      const price = parseFloat(lesson.price) || (parseFloat(lesson.duration) * 20);
      return sum + price;
    }, 0);

    // Expired but unpaid packages from this week
    const expiredUnpaidPackages = allPackages.filter(pkg =>
      !pkg.is_paid &&
      pkg.expiry_date >= weekStartStr &&
      pkg.expiry_date <= weekEndStr
    );

    const unpaidPackagesAmount = expiredUnpaidPackages.reduce(
      (sum, pkg) => sum + parseFloat(pkg.package_cost || 0),
      0
    );

    const totalPendingAmount = unpaidAmount + unpaidPackagesAmount;

    // NUOVO: Calcolo statistiche su lezioni della settimana 
    const weekLessons = allLessons.filter(lesson =>
      lesson.lesson_date >= weekStartStr &&
      lesson.lesson_date <= weekEndStr &&
      !lesson.is_package // Solo lezioni singole
    );

    const weekLessonsPaid = weekLessons.filter(lesson => lesson.is_paid);

    // NUOVO: Calcolo statistiche su pacchetti in scadenza questa settimana
    const expiringPackages = allPackages.filter(pkg =>
      pkg.expiry_date >= weekStartStr &&
      pkg.expiry_date <= weekEndStr
    );

    const paidExpiringPackages = expiringPackages.filter(pkg => pkg.is_paid);

    // Update state with calculated values
    setWeeklyStats({
      income: totalIncome,
      payments: totalPayments,
      profit: totalIncome - totalPayments,
      pendingAmount: totalPendingAmount,
      lessonsCount: {
        total: weekLessons.length,
        paid: weekLessonsPaid.length
      },
      packagesCount: {
        expiring: expiringPackages.length,
        paid: paidExpiringPackages.length
      }
    });
  };

  const navigateToWeekLessons = () => {
    // Format dates for URL parameters
    const startDateParam = format(currentWeekStart, 'yyyy-MM-dd');
    const endDateParam = format(weekEnd, 'yyyy-MM-dd');

    // Navigate to lessons page with date filter parameters
    navigate(`/lessons?time=custom&startDate=${startDateParam}&endDate=${endDateParam}&isRange=true`);
  };

  const navigateToWeekExpiringPackages = () => {
    // Format dates for URL parameters
    const startDateParam = format(currentWeekStart, 'yyyy-MM-dd');
    const endDateParam = format(weekEnd, 'yyyy-MM-dd');

    // Navigate to packages page with expiry date filter parameters
    navigate(`/packages?expiry=custom&startDate=${startDateParam}&endDate=${endDateParam}&isRange=true`);
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
            €{weeklyStats.income.toFixed(2)}
          </Typography>
        </Grid>

        {/* NUOVO: Statistiche lezioni settimana - Make this clickable */}
        <Grid item xs={12} sm={6} md={2}>
          <Box
            onClick={navigateToWeekLessons}
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
            <Typography variant="body2" color="text.secondary">
              Lezioni saldate
            </Typography>
            <Typography variant="h5" color="text.primary">
              {weeklyStats.lessonsCount.paid}/{weeklyStats.lessonsCount.total}
            </Typography>
          </Box>
        </Grid>

        {/* NUOVO: Statistiche pacchetti in scadenza */}
        <Grid item xs={12} sm={6} md={2}>
          <Box
            onClick={navigateToWeekExpiringPackages}
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
            <Typography variant="body2" color="text.secondary">
              Pacchetti saldati
            </Typography>
            <Typography variant="h5" color="text.primary">
              {weeklyStats.packagesCount.paid}/{weeklyStats.packagesCount.expiring}
            </Typography>
          </Box>
        </Grid>

        {/* Pending Payments */}
        <Grid item xs={12} sm={6} md={2}>
          <Typography variant="body2" color="text.secondary">
            Da incassare
          </Typography>
          <Typography variant="h5" color="text.primary">
            €{weeklyStats.pendingAmount.toFixed(2)}
          </Typography>
        </Grid>

        {/* Payments to professors */}
        <Grid item xs={12} sm={6} md={2}>
          <Typography variant="body2" color="text.secondary">
            Pagamenti
          </Typography>
          <Typography variant="h5" color="text.primary">
            €{weeklyStats.payments.toFixed(2)}
          </Typography>
        </Grid>

        {/* Profit */}
        <Grid item xs={12} sm={6} md={2}>
          <Typography variant="body2" color="text.secondary">
            Ricavi
          </Typography>
          <Typography
            variant="h5"
            color="primary.main"
            fontWeight="bold"
          >
            €{weeklyStats.profit.toFixed(2)}
          </Typography>
        </Grid>

      </Grid>
    </Paper>
  );
}

export default AdminDashboardWeekSummary;