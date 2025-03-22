// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { it } from 'date-fns/locale';

// Context
import { AuthProvider } from './context/AuthContext';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminDashboardPage from './pages/dashboard/AdminDashboardPage'; // Importa la nuova dashboard amministrativa

// Professor Pages
import ProfessorListPage from './pages/professors/ProfessorListPage';
import ProfessorDetailPage from './pages/professors/ProfessorDetailPage';
import ProfessorFormPage from './pages/professors/ProfessorFormPage';

// Student Pages
import StudentListPage from './pages/students/StudentListPage';
import StudentDetailPage from './pages/students/StudentDetailPage';
import StudentFormPage from './pages/students/StudentFormPage';

// Package Pages
import PackageListPage from './pages/packages/PackageListPage';
import PackageDetailPage from './pages/packages/PackageDetailPage';
import PackageFormPage from './pages/packages/PackageFormPage';

// Lesson Pages
import LessonListPage from './pages/lessons/LessonListPage';
import LessonDetailPage from './pages/lessons/LessonDetailPage';
import LessonFormPage from './pages/lessons/LessonFormPage';

// Other Pages
import NotFoundPage from './pages/NotFoundPage';

// Guards
import PrivateRoute from './components/auth/PrivateRoute';
import AdminRoute from './components/auth/AdminRoute';

// Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              {/* Main App Routes */}
              <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* Nuova rotta per la dashboard amministrativa - protetta da AdminRoute */}
                <Route 
                  path="/admin-dashboard" 
                  element={<AdminRoute><AdminDashboardPage /></AdminRoute>} 
                />

                {/* Professor Routes */}
                <Route path="/professors" element={<ProfessorListPage />} />
                <Route path="/professors/:id" element={<ProfessorDetailPage />} />
                <Route 
                  path="/professors/new" 
                  element={<AdminRoute><ProfessorFormPage /></AdminRoute>} 
                />
                <Route 
                  path="/professors/edit/:id" 
                  element={<AdminRoute><ProfessorFormPage /></AdminRoute>} 
                />

                {/* Student Routes */}
                <Route path="/students" element={<StudentListPage />} />
                <Route path="/students/:id" element={<StudentDetailPage />} />
                <Route path="/students/new" element={<StudentFormPage />} />
                <Route path="/students/edit/:id" element={<StudentFormPage />} />

                {/* Package Routes */}
                <Route path="/packages" element={<PackageListPage />} />
                <Route path="/packages/:id" element={<PackageDetailPage />} />
                <Route path="/packages/new" element={<PackageFormPage />} />
                <Route path="/packages/edit/:id" element={<PackageFormPage />} />

                {/* Lesson Routes */}
                <Route path="/lessons" element={<LessonListPage />} />
                <Route path="/lessons/:id" element={<LessonDetailPage />} />
                <Route path="/lessons/new" element={<LessonFormPage />} />
                <Route path="/lessons/edit/:id" element={<LessonFormPage />} />
              </Route>

              {/* 404 Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;