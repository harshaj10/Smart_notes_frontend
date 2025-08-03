import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NoteEditor from './pages/NoteEditor';
import ShareNote from './pages/ShareNote';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotesProvider } from './contexts/NotesContext';

// Theme configuration
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      light: '#3e5c76',
      main: '#2c3e50',
      dark: '#1a2530',
      contrastText: '#fff',
    },
    secondary: {
      light: '#ff6b6b',
      main: '#e74c3c',
      dark: '#c0392b',
      contrastText: '#fff',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    success: {
      main: '#2ecc71',
    },
    info: {
      main: '#3498db',
    },
    warning: {
      main: '#f39c12',
    },
    error: {
      main: '#e74c3c',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0px 2px 5px rgba(0, 0, 0, 0.05)',
    '0px 4px 8px rgba(0, 0, 0, 0.08)',
    '0px 6px 12px rgba(0, 0, 0, 0.1)',
    '0px 8px 15px rgba(0, 0, 0, 0.12)',
    '0px 10px 18px rgba(0, 0, 0, 0.14)',
    '0px 12px 22px rgba(0, 0, 0, 0.16)',
    '0px 14px 24px rgba(0, 0, 0, 0.18)',
    '0px 16px 26px rgba(0, 0, 0, 0.2)',
    '0px 18px 28px rgba(0, 0, 0, 0.22)',
    '0px 20px 30px rgba(0, 0, 0, 0.24)',
    '0px 22px 32px rgba(0, 0, 0, 0.26)',
    '0px 24px 34px rgba(0, 0, 0, 0.28)',
    '0px 26px 36px rgba(0, 0, 0, 0.3)',
    '0px 28px 38px rgba(0, 0, 0, 0.32)',
    '0px 30px 40px rgba(0, 0, 0, 0.34)',
    '0px 32px 42px rgba(0, 0, 0, 0.36)',
    '0px 34px 44px rgba(0, 0, 0, 0.38)',
    '0px 36px 46px rgba(0, 0, 0, 0.4)',
    '0px 38px 48px rgba(0, 0, 0, 0.42)',
    '0px 40px 50px rgba(0, 0, 0, 0.44)',
    '0px 42px 52px rgba(0, 0, 0, 0.46)',
    '0px 44px 54px rgba(0, 0, 0, 0.48)',
    '0px 46px 56px rgba(0, 0, 0, 0.5)',
    '0px 48px 60px rgba(0, 0, 0, 0.52)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s ease-in-out',
        },
      },
    },
  },
});

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

// Main App component
const AppContent: React.FC = () => {
  return (
    <NotesProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/shared" 
          element={
            <ProtectedRoute>
              <Dashboard initialTab={1} />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/notes/:noteId" 
          element={
            <ProtectedRoute>
              <NoteEditor />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/notes/:noteId/share" 
          element={
            <ProtectedRoute>
              <ShareNote />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </NotesProvider>
  );
};

// Root component with providers
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
