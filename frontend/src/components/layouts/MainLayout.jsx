// src/components/layouts/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
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
  Paper,
  useTheme,
  alpha,
  AppBar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Book as BookIcon,
  MenuBook as MenuBookIcon,
  AdminPanelSettings as AdminDashboardIcon,
  LockReset as LockResetIcon,
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
  const theme = useTheme();

  // Redirect automatico in base al ruolo utente
  useEffect(() => {
    if (location.pathname === '/' && isAdmin()) {
      navigate('/admin-dashboard', { replace: true });
    } else if (location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, isAdmin, navigate, currentUser]);

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

  // Navigazione menu
  let menuItems = [];

  if (isAdmin()) {
    menuItems = [
      { text: 'Dashboard Admin', icon: <AdminDashboardIcon />, path: '/admin-dashboard' },
      { text: 'Dashboard Personale', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Pacchetti', icon: <BookIcon />, path: '/packages' },
      { text: 'Lezioni', icon: <MenuBookIcon />, path: '/lessons' },
      { text: 'Studenti', icon: <SchoolIcon />, path: '/students' },
      { text: 'Professori', icon: <PeopleIcon />, path: '/professors' },
      { text: 'Reset Password', icon: <LockResetIcon />, path: '/admin/reset-password' },
    ];
  } else {
    menuItems = [
      { text: 'MyDashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { text: 'Lezioni', icon: <MenuBookIcon />, path: '/lessons' },
      { text: 'Pacchetti', icon: <BookIcon />, path: '/packages' },
      { text: 'Studenti', icon: <SchoolIcon />, path: '/students' },
    ];
  }

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent'
      }}
    >
      <Toolbar>
        <img src={logo} alt="Logo" style={{ height: 46, marginRight: 12, borderRadius: 8 }} />
        <Typography variant="h6" noWrap component="div" fontWeight="bold">
          FeedYourMind
        </Typography>
      </Toolbar>
      <Divider sx={{ mx: 2, opacity: 0.6 }} />
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.2,
                  px: 2,
                  transition: 'all 0.2s ease-in-out',
                  '&.Mui-selected': {
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                    color: theme.palette.primary.main,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.25),
                    },
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    }
                  },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 42,
                    color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                    transition: 'color 0.2s ease-in-out'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 'medium' : 'normal',
                    fontSize: '0.95rem'
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2, opacity: 0.6 }} />
        {/* L'avatar ora gestisce il menu per profilo e logout */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            borderRadius: 2,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              cursor: 'pointer'
            }
          }}
          onClick={handleMenu}
        >
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main', mr: 2 }}>
            {currentUser?.first_name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {currentUser?.first_name} {currentUser?.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentUser?.is_admin ? 'Amministratore' : 'Professore'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const drawerContainer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 'none'
      }}
    >
      {drawer}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* AppBar per dispositivi mobili */}
      <AppBar
        position="fixed"
        sx={{
          display: { xs: 'block', sm: 'none' },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          borderRadius: 0
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            FeedYourMind App
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer per navigazione */}
      <Box
        component="nav"
        sx={{
          width: { sm: drawerWidth },
          flexShrink: { sm: 0 },
        }}
        aria-label="menu"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.default',
              borderRight: `0px solid ${alpha(theme.palette.divider, 0.2)}`
            },
          }}
        >
          {drawerContainer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              bgcolor: 'background.default',
              borderRight: `0px solid ${alpha(theme.palette.divider, 0.2)}`
            },
          }}
          open
        >
          {drawerContainer}
        </Drawer>
      </Box>

      {/* Contenuto principale */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 2, md: 3 }, // Modifica qui: riduci il padding su schermi piccoli
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` }, // Assicura larghezza 100% su mobile
          minHeight: '100vh',
          backgroundColor: alpha(theme.palette.background.default, 0.5),
          mt: { xs: '56px', sm: 0 }, // Spazio in alto per l'AppBar
          overflow: 'hidden' // Impedisci overflow orizzontale
        }}
      >
        <Outlet />
      </Box>

      {/* Menu per profilo e logout, ora accessibile cliccando sull'avatar nel Drawer */}
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          elevation: 2,
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 180
          }
        }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            navigate(`/professors/${currentUser.id}`);
          }}
          sx={{ py: 1.5 }}
        >
          Profilo
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default MainLayout;