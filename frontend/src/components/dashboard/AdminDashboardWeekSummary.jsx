// src/components/dashboard/AdminDashboardWeekSummary.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider
} from '@mui/material';
import { parseISO, isWithinInterval, format } from 'date-fns';
import { it } from 'date-fns/locale';

function AdminDashboardWeekSummary({
  currentWeekStart,
  weekEnd,
  allLessons = [],
  allPackages = [],
  professorWeeklyData = []
}) {
  const [weeklyStats, setWeeklyStats] = useState({
    income: 0,
    payments: 0,
    profit: 0,
    pendingAmount: 0
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
        pendingAmount: 0
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

    // Update state with calculated values
    setWeeklyStats({
      income: totalIncome,
      payments: totalPayments,
      profit: totalIncome - totalPayments,
      pendingAmount: totalPendingAmount
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 1 }}>
      <Grid container spacing={2}>
        {/* Income */}
        <Grid item xs={12} sm={3}>
          <Typography variant="body2" color="text.secondary">
            Incasso
          </Typography>
          <Typography variant="h5" color="success.main" fontWeight="bold">
            €{weeklyStats.income.toFixed(2)}
          </Typography>
        </Grid>

        {/* Pending Payments */}
        <Grid item xs={12} sm={3}>
          <Typography variant="body2" color="text.secondary">
            Da incassare
          </Typography>
          <Typography variant="h5" color="text.primary">
            €{weeklyStats.pendingAmount.toFixed(2)}
          </Typography>
        </Grid>

        {/* Payments to professors */}
        <Grid item xs={12} sm={3}>
          <Typography variant="body2" color="text.secondary">
            Pagamenti
          </Typography>
          <Typography variant="h5" color="text.primary">
            €{weeklyStats.payments.toFixed(2)}
          </Typography>
        </Grid>

        {/* Profit */}
        <Grid item xs={12} sm={3}>
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