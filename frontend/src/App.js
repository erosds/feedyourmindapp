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
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import AdminResetPasswordPage from './pages/admin/ResetPasswordPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import AdminDashboardPage from './pages/dashboard/AdminDashboardPage';

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
import RootRedirect from './components/auth/RootRedirect';
import PaymentCalendarPage from './pages/payments/PaymentCalendarPage';

import FAQPage from './pages/faq/FAQPage';

import ActivityLogPage from './pages/activity/ActivityLogPage';
import UserActivityPage from './pages/activity/UserActivityPage';

// Scegli tema
import {theme} from './services/theme'


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
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route 
                path="/admin/reset-password" 
                element={<AdminRoute><AdminResetPasswordPage /></AdminRoute>} 
              />
              
              {/* Root redirect based on user role */}
              <Route path="/" element={<RootRedirect />} />
              
              {/* Main App Routes */}
              <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* Admin dashboard route */}
                <Route 
                  path="/admin-dashboard" 
                  element={<AdminRoute><AdminDashboardPage /></AdminRoute>} 
                />

                {/* Payment Calendar Route */}
                <Route 
                  path="/payments/calendar" 
                  element={<AdminRoute><PaymentCalendarPage /></AdminRoute>} 
                />

                <Route 
                  path="/activities" 
                  element={<AdminRoute><ActivityLogPage /></AdminRoute>} 
                />
                <Route 
                  path="/activities/user/:professorId" 
                  element={<AdminRoute><UserActivityPage /></AdminRoute>} 
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

                <Route path="/faq" element={<FAQPage />} />
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