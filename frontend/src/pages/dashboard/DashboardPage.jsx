// src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Typography,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { statsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

function DashboardPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [financeStats, setFinanceStats] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [professorStats, setProfessorStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch student stats
        const studentResponse = await statsService.getStudentStats();
        setStudentStats(studentResponse.data);
        
        // Fetch professor stats if admin
        if (isAdmin()) {
          const professorResponse = await statsService.getProfessorStats();
          setProfessorStats(professorResponse.data);
          
          const financeResponse = await statsService.getFinanceStats();
          setFinanceStats(financeResponse.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError('Impossibile caricare le statistiche. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAdmin]);

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

  // Prepara i dati per i grafici
  const studentPieData = [
    { name: 'Studenti Attivi', value: studentStats?.active_students || 0 },
    { name: 'Studenti Inattivi', value: (studentStats?.total_students || 0) - (studentStats?.active_students || 0) },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Cards di riepilogo */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Studenti
              </Typography>
              <Typography variant="h3" color="primary">
                {studentStats?.total_students || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Studenti totali registrati
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {isAdmin() && (
          <>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Entrate Totali
                  </Typography>
                  <Typography variant="h3" color="primary">
                    €{financeStats?.total_income?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entrate totali (pacchetti + lezioni singole)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Guadagno Netto
                  </Typography>
                  <Typography variant="h3" color="primary">
                    €{financeStats?.net_profit?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entrate - Pagamenti ai professori
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {/* Grafico studenti */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 300,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Distribuzione Studenti
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={studentPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {studentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top studenti */}
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 300,
            }}
          >
            <Typography variant="h6" gutterBottom>
              Top Studenti
            </Typography>
            {studentStats?.top_students?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={studentStats.top_students}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="lesson_count" name="Numero Lezioni" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography variant="body2" color="text.secondary">
                  Nessuna lezione registrata
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Top professori (solo admin) */}
        {isAdmin() && professorStats?.top_professors?.length > 0 && (
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                height: 300,
              }}
            >
              <Typography variant="h6" gutterBottom>
                Top Professori
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={professorStats.top_professors}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="lesson_count" name="Numero Lezioni" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="total_earnings" name="Guadagni (€)" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Dettaglio finanziario (solo admin) */}
        {isAdmin() && financeStats && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dettaglio Finanziario
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  divider={<Divider orientation="vertical" flexItem />}
                  justifyContent="space-around"
                  alignItems="center"
                  sx={{ mt: 2 }}
                >
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      Entrate da Pacchetti
                    </Typography>
                    <Typography variant="h6" color="primary">
                      €{financeStats.packages_income?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                  
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      Entrate da Lezioni Singole
                    </Typography>
                    <Typography variant="h6" color="primary">
                      €{financeStats.single_lessons_income?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                  
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      Uscite (Pagamenti Professori)
                    </Typography>
                    <Typography variant="h6" color="error">
                      €{financeStats.expenses?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                  
                  <Box textAlign="center">
                    <Typography variant="body2" color="text.secondary">
                      Profitto Netto
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      €{financeStats.net_profit?.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default DashboardPage;