import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  useTheme,
  Fade,
  Grow
} from '@mui/material';
import {
  Google as GoogleIcon,
  EditNote as EditNoteIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

// Note-taking illustration
const loginIllustration = 'https://cdn-icons-png.flaticon.com/512/6295/6295417.png';

const Login: React.FC = () => {
  const theme = useTheme();
  const { currentUser, signIn, error } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Redirect if user is already logged in
    if (currentUser) {
      navigate('/dashboard');
    }
    
    // Delay to show animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      await signIn();
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Feature items
  const features = [
    {
      icon: <EditNoteIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />,
      title: 'Smart Formatting',
      description: 'Format your notes with rich text, code blocks, and more'
    },
    {
      icon: <ShareIcon sx={{ fontSize: 32, color: theme.palette.secondary.main }} />,
      title: 'Easy Sharing',
      description: 'Share notes with others and collaborate in real-time'
    },
    {
      icon: <CloudIcon sx={{ fontSize: 32, color: theme.palette.info.main }} />,
      title: 'Cloud Sync',
      description: 'Access your notes from any device, anywhere'
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />,
      title: 'Secure',
      description: 'Your notes are encrypted and protected'
    }
  ];

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        py: 4
      }}
    >
      {/* Background pattern elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,152,219,0.1) 0%, rgba(52,152,219,0) 70%)',
          zIndex: 0
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: '10%',
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(231,76,60,0.1) 0%, rgba(231,76,60,0) 70%)',
          zIndex: 0
        }}
      />
      
      <Container maxWidth="lg">
        <Grid container spacing={2} alignItems="center" justifyContent="center">
          <Grid container size={{xs:12, md:6}} sx={{ zIndex: 1 }}>
            <Fade in={isLoaded} timeout={800}>
              <Box 
                sx={{ 
                  p: { xs: 2, sm: 4 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                  <Grow in={isLoaded} timeout={1000}>
                    <img 
                      src={loginIllustration} 
                      alt="Smart Notes" 
                      style={{ maxWidth: '180px', marginBottom: '1rem' }} 
                    />
                  </Grow>
                  <Typography 
                    variant="h3" 
                    component="h1" 
                    fontWeight="bold"
                    sx={{ 
                      mb: 1, 
                      background: 'linear-gradient(45deg, #2c3e50, #3498db)',
                      backgroundClip: 'text',
                      textFillColor: 'transparent',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    Smart Notes
                  </Typography>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Capture your thoughts, organize your life
                  </Typography>
                </Box>
                
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {features.map((feature, index) => (
                    <Grid container size={{xs:6}} key={index}>
                      <Fade in={isLoaded} timeout={1000 + (index * 200)}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            p: 2,
                            height: '100%',
                          }}
                        >
                          <Box sx={{ mb: 1 }}>{feature.icon}</Box>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {feature.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {feature.description}
                          </Typography>
                        </Box>
                      </Fade>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Fade>
          </Grid>
          
          <Grid container size={{xs:12, md:6}} sx={{ zIndex: 1 }}>
            <Fade in={isLoaded} timeout={1200}>
              <Paper
                elevation={4}
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: '16px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                  <Typography variant="h4" component="div" fontWeight="bold" gutterBottom>
                    Welcome Back
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Sign in to continue to Smart Notes
                  </Typography>
                </Box>

                {(authError || error) && (
                  <Alert severity="error" sx={{ mb: 3, width: '100%', borderRadius: '8px' }}>
                    {authError || error}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  fullWidth
                  sx={{
                    py: 1.5,
                    backgroundColor: '#4285F4',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(66, 133, 244, 0.25)',
                    '&:hover': {
                      backgroundColor: '#357ae8',
                      boxShadow: '0 6px 10px rgba(66, 133, 244, 0.3)',
                    },
                    textTransform: 'none',
                    fontSize: '1rem',
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Continue with Google'
                  )}
                </Button>

                <Divider sx={{ my: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    OR
                  </Typography>
                </Divider>

                {/* Placeholder for future auth methods */}
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  disabled
                  sx={{
                    py: 1.5,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontSize: '1rem',
                  }}
                >
                  More options coming soon
                </Button>
                
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </Typography>
                </Box>
              </Paper>
            </Fade>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center', zIndex: 1, position: 'relative' }}>
          <Typography variant="body2" color="text.secondary">
            © 2025 Smart Notes. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;