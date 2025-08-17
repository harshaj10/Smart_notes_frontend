import React, { useState, ReactNode, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Tooltip,
  Stack,
  Chip,
  Badge,
  useTheme,
  Fade,
} from '@mui/material';
import {
  Menu as MenuIcon,
  NoteAdd as NoteAddIcon,
  Dashboard as DashboardIcon,
  PersonOutline as PersonOutlineIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Notifications as NotificationsIcon,
  BorderColor as BorderColorIcon,
  Share as ShareIcon,
  BookmarkBorder as BookmarkBorderIcon,
  LightbulbOutlined as LightbulbOutlinedIcon,
  Star as StarIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotes } from '../contexts/NotesContext';

const drawerWidth = 250;

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: '100%',
  maxWidth: '100%',
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: drawerWidth,
  }),
}));

/* App logo */
const AppLogo = () => {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <BorderColorIcon sx={{ fontSize: '1.8rem', color: 'white' }} />
      <Typography variant="h6" fontWeight="bold" sx={{ letterSpacing: '0.5px' }}>
        THINKSYNC.AI
      </Typography>
    </Stack>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, title = 'THINKSYNC.AI' }) => {
  const theme = useTheme();
  const { userProfile, signOut } = useAuth();
  const { sharedNotesCount, refreshSharedNotesCount } = useNotes();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    // Add a small delay to show the fade-in animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Add effect to periodically refresh shared notes count
  useEffect(() => {
    if (userProfile) {
      // Refresh count every 30 seconds
      const interval = setInterval(() => {
        refreshSharedNotesCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [userProfile, refreshSharedNotesCount]);

  // Refresh shared notes count when component mounts and when userProfile changes
  useEffect(() => {
    if (userProfile) {
      refreshSharedNotesCount();
    }
  }, [userProfile, refreshSharedNotesCount]);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
    },
    {
      text: 'New Note',
      icon: <NoteAddIcon />,
      path: '/notes/new',
    },
    {
      text: 'Shared Notes',
      icon: <ShareIcon />,
      path: '/shared',
    },
    {
      text: 'Favorites',
      icon: <StarIcon />,
      path: '/favorites',
    },
  ];

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, #2c3e50 0%, #4c6889 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
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
          <AppLogo />
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, ml: 2, fontWeight: 500 }}>
            {title}
          </Typography>
          
          {userProfile && (
            <Fade in={isLoaded}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}>
                  <Chip 
                    label={userProfile.email}
                    size="small"
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.15)', 
                      color: 'white',
                      borderRadius: '4px',
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                </Stack>
                
                <Tooltip title="Notifications">
                  <IconButton color="inherit" sx={{ mr: 1 }}>
                    <Badge badgeContent={0} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                <Tooltip title={`Shared Notes (${sharedNotesCount})`}>
                  <IconButton 
                    color="inherit" 
                    sx={{ mr: 1 }}
                    onClick={() => {
                      refreshSharedNotesCount();
                      // Navigate to shared notes tab
                      if (location.pathname === '/dashboard') {
                        // Trigger tab change to shared notes
                        window.dispatchEvent(new CustomEvent('navigate-to-shared'));
                      } else {
                        navigate('/shared');
                      }
                    }}
                  >
                    <Badge badgeContent={sharedNotesCount} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Account settings">
                  <IconButton
                    onClick={handleProfileMenuOpen}
                    size="small"
                    edge="end"
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    color="inherit"
                    sx={{ 
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderRadius: '50%',
                      p: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.6)',
                      }
                    }}
                  >
                    <Avatar
                      alt={userProfile.displayName}
                      src={userProfile.photoURL}
                      sx={{ 
                        width: 32, 
                        height: 32,
                        background: 'linear-gradient(45deg, #3498db, #8e44ad)',
                      }}
                    >
                      {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={handleProfileMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 220,
                      borderRadius: '12px',
                      boxShadow: '0px 5px 15px rgba(0,0,0,0.15)',
                      overflow: 'visible',
                      '&::before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: -6,
                        right: 14,
                        width: 12,
                        height: 12,
                        bgcolor: 'background.paper',
                        transform: 'rotate(45deg)',
                        zIndex: 0,
                      },
                      '& .MuiMenuItem-root': {
                        px: 2,
                        py: 1.2,
                        borderRadius: '8px',
                        mx: 0.5,
                        my: 0.3,
                      }
                    }
                  }}
                >
                  <Box sx={{ p: 2, pb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {userProfile.displayName || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {userProfile.email}
                    </Typography>
                  </Box>
                  <Divider sx={{ mx: 1 }} />
                  <MenuItem onClick={() => {
                    handleProfileMenuClose();
                    navigate('/profile');
                  }}>
                    <ListItemIcon>
                      <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="My Profile" />
                  </MenuItem>
                  <MenuItem onClick={() => {
                    handleProfileMenuClose();
                    navigate('/settings');
                  }}>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Settings" />
                  </MenuItem>
                  <Divider sx={{ mx: 1 }} />
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
                  </MenuItem>
                </Menu>
              </Box>
            </Fade>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '4px 0 8px rgba(0,0,0,0.05)',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
          {userProfile && (
            <Fade in={isLoaded}>
              <Box sx={{ px: 2, py: 3, mb: 1, background: 'linear-gradient(to right, rgba(52, 152, 219, 0.05), rgba(44, 62, 80, 0.1))' }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                  <Avatar
                    alt={userProfile.displayName}
                    src={userProfile.photoURL}
                    sx={{ 
                      width: 48, 
                      height: 48,
                      background: 'linear-gradient(45deg, #3498db, #8e44ad)',
                      boxShadow: '0 3px 5px rgba(0,0,0,0.2)',
                    }}
                  >
                    {userProfile.displayName?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
                      {userProfile.displayName || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {userProfile.email}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Fade>
          )}
          
          <Box sx={{ px: 2, py: 1.5 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<NoteAddIcon />}
              onClick={() => handleNavigate('/notes/new')}
              fullWidth
              className="gradient-button"
              sx={{ 
                py: 1,
                fontWeight: 'bold',
                boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
              }}
            >
              Create New Note
            </Button>
          </Box>
          
          <Divider sx={{ my: 1.5 }} />
          
          <Typography variant="overline" sx={{ px: 3, mt: 1, color: 'text.secondary', fontWeight: 600 }}>
            MENU
          </Typography>
          
          <List sx={{ px: 1.5 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem
                  key={item.text}
                  disablePadding
                  component="div"
                  sx={{ mb: 0.5 }}
                >
                  <ListItemButton 
                    onClick={() => handleNavigate(item.path)}
                    selected={isActive}
                    sx={{
                      borderRadius: '8px',
                      backgroundColor: isActive ? 'rgba(52, 152, 219, 0.1)' : 'transparent',
                      '&:hover': {
                        backgroundColor: isActive ? 'rgba(52, 152, 219, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        '&:hover': {
                          backgroundColor: 'rgba(52, 152, 219, 0.15)',
                        },
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive ? theme.palette.primary.main : 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }}
                    />
                    {item.text === 'Shared Notes' && (
                      <Chip 
                        label="0" 
                        size="small" 
                        color="primary" 
                        sx={{ 
                          height: 20, 
                          minWidth: 20, 
                          fontSize: '0.7rem',
                        }} 
                      />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
            <ListItem  onClick={() => navigate('/shared-notes')}>
              <ListItemIcon>
                <PeopleIcon />
              </ListItemIcon>
              <ListItemText primary="Shared Notes" />
              {sharedNotesCount > 0 && (
                <Chip 
                  label={sharedNotesCount} 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 1 }}
                />
              )}
            </ListItem>
          </List>
          
          <Divider sx={{ my: 1.5 }} />
          
          <Typography variant="overline" sx={{ px: 3, mt: 1, color: 'text.secondary', fontWeight: 600 }}>
            LABELS
          </Typography>
          
          <List sx={{ px: 1.5 }}>
            {[
              { text: 'Important', color: '#e74c3c', icon: <BookmarkBorderIcon /> },
              { text: 'Personal', color: '#3498db', icon: <PersonOutlineIcon /> },
              { text: 'Ideas', color: '#f39c12', icon: <LightbulbOutlinedIcon /> },
            ].map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton sx={{ borderRadius: '8px' }}>
                  <ListItemIcon sx={{ color: item.color }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                  <Chip 
                    size="small" 
                    sx={{ 
                      bgcolor: `${item.color}20`, 
                      color: item.color,
                      height: 20, 
                      fontSize: '0.7rem',
                    }} 
                    label={Math.floor(Math.random() * 10) + 1} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          <Box sx={{ flexGrow: 1 }} />
          
          <Box 
            sx={{ 
              p: 2, 
              m: 2, 
              borderRadius: '12px', 
              backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              color: 'white',
              textAlign: 'center',
              mt: 'auto',
            }}
          >
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Premium Features
            </Typography>
            <Typography variant="caption" display="block" sx={{ mb: 2 }}>
              Upgrade to unlock more storage & features
            </Typography>
            <Button 
              size="small" 
              variant="contained"
              fullWidth
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                color: 'white',
                textTransform: 'none',
                fontWeight: 'bold',
              }}
            >
              Upgrade
            </Button>
          </Box>
          
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button 
              size="small" 
              startIcon={<SettingsIcon />} 
              onClick={() => handleNavigate('/settings')}
              sx={{ textTransform: 'none', color: 'text.secondary' }}
            >
              Settings
            </Button>
            <Button 
              size="small"
              color="error"
              startIcon={<LogoutIcon />} 
              onClick={handleLogout}
              sx={{ textTransform: 'none' }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>
      <Box component="div" sx={{ flexGrow: 1, mt: '64px', overflow: 'auto' }}>
        <Main open={drawerOpen}>{children}</Main>
      </Box>
    </Box>
  );
};

export default Layout;
