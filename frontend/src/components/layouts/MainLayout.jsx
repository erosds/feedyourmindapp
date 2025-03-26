// src/components/layouts/MainLayout.jsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Book as BookIcon,
  MenuBook as MenuBookIcon,
  AccountCircle,
  AdminPanelSettings as AdminDashboardIcon,
  LockReset as LockResetIcon, // Aggiungi questa linea

} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import logo from '../assets/logo.jpg';

const drawerWidth = 240;

function MainLayout() {
  const { currentUser, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleClose();
    navigate(`/professors/${currentUser.id}`);
  };

  // Navigazione menu
  let menuItems = [];

  if (isAdmin()) {
    // Per gli admin, metti prima la dashboard admin e poi la dashboard normale
    menuItems = [
      { text: 'AdminDashboard', icon: <AdminDashboardIcon />, path: '/admin-dashboard' },
      { text: 'MyDashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Pacchetti', icon: <BookIcon />, path: '/packages' },
      { text: 'Lezioni', icon: <MenuBookIcon />, path: '/lessons' },
      { text: 'Studenti', icon: <SchoolIcon />, path: '/students' },
      { text: 'Professori', icon: <PeopleIcon />, path: '/professors' },
      { text: 'Reset Password', icon: <LockResetIcon />, path: '/admin/reset-password' }, // Aggiungi questa linea

    ];
  } else {
    // Per gli utenti normali, mostra solo le opzioni standard
    menuItems = [
      { text: 'MyDashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Lezioni', icon: <MenuBookIcon />, path: '/lessons' },
      { text: 'Pacchetti', icon: <BookIcon />, path: '/packages' },
      { text: 'Studenti', icon: <SchoolIcon />, path: '/students' },
    ];
  }

  const drawer = (
    <div>
      <Toolbar>
        <img src={logo} alt="Logo" style={{ height: 46, marginRight: 12 }} />
        <Typography variant="h6" noWrap component="div">
          FeedYourMind
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname.startsWith(item.path)}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Titolo dinamico basato sul percorso */}
            {location.pathname.includes('/admin-dashboard') && 'AdminDashboard'}
            {location.pathname.includes('/dashboard') && !location.pathname.includes('/admin-dashboard') && 'MyDashboard'}
            {location.pathname.includes('/professors') && 'Gestione Professori'}
            {location.pathname.includes('/students') && 'Gestione Studenti'}
            {location.pathname.includes('/packages') && 'Gestione Pacchetti'}
            {location.pathname.includes('/lessons') && 'Gestione Lezioni'}
            {location.pathname.includes('/admin/reset-password') && 'Reset Password Utenti'} {/* Aggiungi questa linea */}

          </Typography>

          {currentUser && (
            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                  {currentUser.first_name.charAt(0)}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleProfile}>Profilo</MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="menu"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

export default MainLayout;