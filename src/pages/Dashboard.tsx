import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Typography,
  Alert,
  Paper,
  Avatar,
  Chip,
  Fade,
  useTheme,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Share as ShareIcon, 
  NoteAdd as NoteAddIcon,
  Book as BookIcon,
  Bookmark as BookmarkIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useNotes } from '../contexts/NotesContext';
import { format } from 'date-fns';
import PDFService from '../services/pdf';

// Array of gradient backgrounds for notes
const noteGradients = [
  { light: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', dark: '#3498db' },
  { light: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', dark: '#9b59b6' },
  { light: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)', dark: '#34495e' },
  { light: 'linear-gradient(135deg, #fff1eb 0%, #ace0f9 100%)', dark: '#3498db' },
  { light: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', dark: '#f39c12' },
];

// Empty state illustrations
const emptyStateImage = 'https://cdn-icons-png.flaticon.com/512/6195/6195678.png';
const sharedEmptyStateImage = 'https://cdn-icons-png.flaticon.com/512/6195/6195692.png';

interface DashboardProps {
  initialTab?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ initialTab = 0 }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { notes, loading, error, fetchNotes, deleteNote } = useNotes();
  const [tabValue, setTabValue] = useState<number>(initialTab);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Update tab value when initialTab prop changes
    setTabValue(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetchNotes();
    // Add a small delay to show the fade-in animation
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchNotes]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateNote = () => {
    navigate('/notes/new');
  };

  const handleNoteClick = (noteId: string) => {
    navigate(`/notes/${noteId}`);
  };

  const handleDeleteNote = async (
    event: React.MouseEvent<HTMLButtonElement>,
    noteId: string
  ) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to archive this note?')) {
      try {
        await deleteNote(noteId);
      } catch (err) {
        console.error('Error deleting note:', err);
      }
    }
  };

  const handleShareNote = (
    event: React.MouseEvent<HTMLButtonElement>,
    noteId: string
  ) => {
    event.stopPropagation();
    navigate(`/notes/${noteId}/share`);
  };

  const handleDownloadPDF = async (
    event: React.MouseEvent<HTMLButtonElement>,
    note: any
  ) => {
    event.stopPropagation();
    try {
      const pdfOptions = {
        title: note.title || 'Untitled Note',
        content: note.content || 'No content available',
        author: note.ownerName || note.creator?.displayName || 'Unknown Author',
        createdAt: note.createdAt
      };
      
      await PDFService.generateRichFormatPDF(pdfOptions);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF. Please try again.');
    }
  };

  // Function to get a consistent color for each note based on ID
  const getNoteGradient = (id: string) => {
    const sum = id.split('')
      .map(char => char.charCodeAt(0))
      .reduce((a, b) => a + b, 0);
    return noteGradients[sum % noteGradients.length];
  };

  // Function to get a priority class for a note (for visual variety)
  const getPriorityClass = (id: string) => {
    const sum = id.split('')
      .map(char => char.charCodeAt(0))
      .reduce((a, b) => a + b, 0);
    const priorities = ['priority-low', 'priority-medium', 'priority-high'];
    return priorities[sum % priorities.length];
  };

  // Render note card with enhanced styling
  const renderNoteCard = (
    note: any,
    canDelete: boolean = true,
    canShare: boolean = true
  ) => {
    const updatedAt = new Date(note.updatedAt);
    const noteGradient = getNoteGradient(note.id);
    const priorityClass = getPriorityClass(note.id);
    
    // Get first letter of title for avatar
    const titleFirstLetter = note.title?.charAt(0).toUpperCase() || 'N';
    
    return (
      <Fade in={isLoaded} timeout={500}>
        <Card
          key={note.id}
          className={`note-card ${priorityClass}`}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'white',
          }}
        >
          <CardActionArea
            onClick={() => handleNoteClick(note.id)}
            sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: noteGradient.light,
                opacity: 0.4,
                zIndex: 0,
              }}
            />
            
            <CardContent sx={{ width: '100%', flexGrow: 1, position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar 
                  sx={{ 
                    bgcolor: noteGradient.dark, 
                    width: 30, 
                    height: 30, 
                    mr: 1, 
                    fontSize: '0.875rem' 
                  }}
                >
                  {titleFirstLetter}
                </Avatar>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    fontWeight: 600,
                  }}
                >
                  {note.title}
                </Typography>
              </Box>
              
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  mb: 2,
                  height: '4.5em',
                  fontSize: '0.9rem',
                }}
              >
                {note.content ? note.content.replace(/<[^>]*>/g, '') : 'No content'}
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                <Chip 
                  label={format(updatedAt, 'MMM d, yyyy')} 
                  size="small" 
                  sx={{ 
                    backgroundColor: 'rgba(0,0,0,0.05)', 
                    fontSize: '0.7rem',
                    height: '24px' 
                  }}
                />
                {note.ownerName && (
                  <Tooltip title={`Owner: ${note.ownerName}`}>
                    <Chip 
                      icon={<BookmarkIcon sx={{ fontSize: '0.8rem !important' }} />}
                      label={note.ownerName.split(' ')[0]} 
                      size="small" 
                      sx={{ 
                        backgroundColor: 'rgba(0,0,0,0.05)', 
                        fontSize: '0.7rem',
                        height: '24px' 
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            </CardContent>
          </CardActionArea>
          
          <Divider />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
            <Tooltip title="Download PDF">
              <IconButton
                size="small"
                onClick={(e) => handleDownloadPDF(e, note)}
                aria-label="download"
                sx={{ color: theme.palette.primary.main }}
              >
                <PdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {canShare && (
              <Tooltip title="Share note">
                <IconButton
                  size="small"
                  onClick={(e) => handleShareNote(e, note.id)}
                  aria-label="share"
                  sx={{ color: theme.palette.primary.main }}
                >
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            {canDelete && (
              <Tooltip title="Archive note">
                <IconButton
                  size="small"
                  onClick={(e) => handleDeleteNote(e, note.id)}
                  aria-label="delete"
                  sx={{ color: '#f44336' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Card>
      </Fade>
    );
  };

  // Render empty state with illustration
  const renderEmptyState = (type: 'own' | 'shared') => {
    return (
      <Fade in={isLoaded} timeout={800}>
        <Box className="empty-state">
          <img 
            src={type === 'own' ? emptyStateImage : sharedEmptyStateImage} 
            alt={type === 'own' ? "No notes" : "No shared notes"} 
          />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {type === 'own' 
              ? "You don't have any notes yet" 
              : "No notes have been shared with you yet"
            }
          </Typography>
          {type === 'own' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateNote}
              sx={{ mt: 2 }}
              className="gradient-button"
            >
              Create your first note
            </Button>
          )}
        </Box>
      </Fade>
    );
  };

  return (
    <Layout title="Dashboard">
      <Container className="dashboard-container">
        <Fade in={isLoaded} timeout={300}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BookIcon 
                sx={{ 
                  fontSize: '2.5rem', 
                  color: theme.palette.primary.main,
                  mr: 2
                }} 
              />
              <Typography variant="h4" component="h1" fontWeight="bold">
                My Notes
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleCreateNote}
              className="gradient-button"
              sx={{
                px: 3, 
                py: 1
              }}
            >
              New Note
            </Button>
          </Box>
        </Fade>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Paper 
          elevation={0} 
          sx={{ 
            borderRadius: '12px', 
            overflow: 'hidden', 
            mb: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="note tabs"
            sx={{ 
              backgroundColor: 'white',
              '& .MuiTabs-indicator': {
                height: 3,
              },
            }}
          >
            <Tab 
              label="My Notes" 
              icon={<NoteAddIcon />} 
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }}
            />
            <Tab 
              label="Shared with Me" 
              icon={<ShareIcon />} 
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '1rem' }}
            />
          </Tabs>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }} className="loading-spinner">
            <CircularProgress size={60} thickness={4} />
          </Box>
        ) : (
          <>
            {tabValue === 0 && (
                  <>
                    {notes.own.length > 0 ? (
                      <Grid container spacing={3} className="slide-up">
                        {notes.own.map((note) => (
                          <Grid size={{xs:12, sm:6, md:4}} key={note.id}>
                            {renderNoteCard(note)}
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      renderEmptyState('own')
                    )}
                  </>
                )}

                {tabValue === 1 && (
                  <>
                    {notes.shared.length > 0 ? (
                      <Grid container spacing={3} className="slide-up">
                        {notes.shared.map((note) => (
                          <Grid size={{ xs:12, sm:6, md:4}} key={note.id}>
                            {renderNoteCard(note, note.permission === 'admin', note.permission === 'admin')}
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      renderEmptyState('shared')
                    )}
                  </>
                )}
          </>
        )}
      </Container>
    </Layout>
  );
};

export default Dashboard;