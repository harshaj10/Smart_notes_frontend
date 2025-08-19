import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  ListItemButton,
  Snackbar,
  Chip
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useNotes, NoteDetails } from '../contexts/NotesContext';
import { usersAPI } from '../services/api';

type Permission = 'read' | 'write' | 'admin';

interface Collaborator {
  id: string;
  displayName: string;
  photoURL?: string;
  permission: Permission;
  sharedNotesCount?: number;
}

const ShareNote: React.FC = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { fetchNote, shareNote, revokeAccess, refreshSharedNotesCount } = useNotes();
  
  const [note, setNote] = useState<NoteDetails | null>(null);
  const [email, setEmail] = useState<string>('');
  const [permission, setPermission] = useState<Permission>('read');
  const [owner, setOwner] = useState<Collaborator | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removeDialog, setRemoveDialog] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<Collaborator | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [collaboratorCounts, setCollaboratorCounts] = useState<{[key: string]: number}>({});
  
  const getSharedNotesCount = async (userId: string): Promise<number> => {
    try {
      const response = await usersAPI.getSharedNotesCount(userId);
      return response.count || 0;
    } catch (err) {
      console.error('Error getting shared notes count:', err);
      return 0;
    }
  };

  useEffect(() => {
    const loadNote = async () => {
      try {
        if (noteId) {
          setLoading(true);
          setError(null);
          console.log(`Loading note with ID: ${noteId}`);
          const noteData = await fetchNote(noteId);
          setNote(noteData);
          console.log('Note data loaded:', noteData);
          
          console.log('Fetching collaborators...');
          const collabData = await usersAPI.getCollaborators(noteId);
          console.log('Collaborator data:', collabData);
          setOwner(collabData.owner);
          setCollaborators(collabData.collaborators || []);
          
          const counts: {[key: string]: number} = {};
          for (const collab of collabData.collaborators || []) {
            counts[collab.id] = await getSharedNotesCount(collab.id);
          }
          setCollaboratorCounts(counts);
        }
      } catch (err: any) {
        console.error('Error loading note:', err);
        setError(err.message || 'Failed to load note information');
      } finally {
        setLoading(false);
      }
    };
    
    loadNote();
  }, [noteId, fetchNote]);
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
    setSuccess(null);
    
    if (e.target.value.length >= 3) {
      searchUsers(e.target.value);
    } else {
      setSearchResults([]);
    }
  };
  
  const searchUsers = async (query: string) => {
    try {
      const results = await usersAPI.searchUsers(query);
      console.log('User search results:', results);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };
  
  const handlePermissionChange = (e: any) => {
    setPermission(e.target.value as Permission);
  };
  
  const handleShare = async () => {
    if (!email || !noteId) {
      setError('Email is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Sharing note ${noteId} with ${email}, permission: ${permission}`);
      await shareNote(noteId, { email, permission });
      
      const collabData = await usersAPI.getCollaborators(noteId);
      console.log('Updated collaborator data:', collabData);
      setCollaborators(collabData.collaborators || []);
      setOwner(collabData.owner);
      
      // Update collaborator counts
      const counts = { ...collaboratorCounts };
      for (const collab of collabData.collaborators || []) {
        if (!counts[collab.id]) {
          counts[collab.id] = await getSharedNotesCount(collab.id);
        }
      }
      setCollaboratorCounts(counts);
      
      await refreshSharedNotesCount();
      
      setSuccess(`Note shared with ${email} successfully! They will receive an email notification.`);
      setEmail('');
      
      setSnackbarMessage(`Note shared with ${email} successfully! Email notification sent.`);
      setSnackbarOpen(true);
    } catch (err: any) {
      console.error('Error sharing note:', err);
      setError(err.message || 'Failed to share note');
    } finally {
      setLoading(false);
    }
  };

  // Add the missing openRemoveDialog function
  const openRemoveDialog = (collaborator: Collaborator) => {
    setSelectedUser(collaborator);
    setRemoveDialog(true);
  };

  const handleRemoveAccess = async () => {
    if (!selectedUser || !noteId) {
      setRemoveDialog(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Removing access for user ${selectedUser.id} from note ${noteId}`);
      await revokeAccess(noteId, selectedUser.id);
      
      setCollaborators(prev => prev.filter(c => c.id !== selectedUser.id));
      
      const newCounts = { ...collaboratorCounts };
      delete newCounts[selectedUser.id];
      setCollaboratorCounts(newCounts);
      
      await refreshSharedNotesCount();
      
      setSuccess(`Access removed for ${selectedUser.displayName}`);
      
      setSnackbarMessage(`Access removed for ${selectedUser.displayName}`);
      setSnackbarOpen(true);
    } catch (err: any) {
      console.error('Error removing access:', err);
      setError(err.message || 'Failed to remove access');
    } finally {
      setLoading(false);
      setRemoveDialog(false);
      setSelectedUser(null);
    }
  };
  
  const handleBack = () => {
    navigate(`/notes/${noteId}`);
  };
  
  const selectUser = (user: any) => {
    setEmail(user.email);
    setSearchResults([]);
  };
  
  const handleCopyInvitationLink = () => {
    if (!noteId) return;
    
    const inviteLink = `${window.location.origin}/notes/${noteId}`;
    navigator.clipboard.writeText(inviteLink);
    
    setSnackbarMessage('Invitation link copied to clipboard');
    setSnackbarOpen(true);
  };
  
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };
  
  if (loading && !note) {
    return (
      <Layout title="Share Note">
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout title={note?.title ? `Share: ${note.title}` : 'Share Note'}>
      <Container maxWidth="md">
        <Paper sx={{ p: 3, boxShadow: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleBack} edge="start" sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h1">
              Share Note
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Share with others
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyInvitationLink}
                sx={{ mb: 2 }}
              >
                Copy Invitation Link
              </Button>
              <Typography variant="caption" color="text.secondary" display="block">
                Anyone with the link can view the note if they have an account
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              <TextField
                label="Email"
                variant="outlined"
                value={email}
                onChange={handleEmailChange}
                fullWidth
                sx={{ mb: 2 }}
              />
              
              <FormControl variant="outlined" sx={{ minWidth: 120, mb: 2 }}>
                <InputLabel>Permission</InputLabel>
                <Select
                  value={permission}
                  onChange={handlePermissionChange}
                  label="Permission"
                >
                  <MenuItem value="read">Read</MenuItem>
                  <MenuItem value="write">Write</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<PersonAddIcon />}
                onClick={handleShare}
                disabled={loading || !email}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Share'}
              </Button>
            </Box>
            
            {searchResults.length > 0 && (
              <Paper elevation={3} sx={{ mt: -2, mb: 3, maxHeight: 200, overflow: 'auto' }}>
                <List dense>
                  {searchResults.map((user) => (
                    <ListItem key={user.id} component="div">
                      <ListItemButton onClick={() => selectUser(user)}>
                        <ListItemAvatar>
                          <Avatar src={user.photoURL}>{user.displayName.charAt(0)}</Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={user.displayName}
                          secondary={user.email} 
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
          
          <Box>
            <Typography variant="h6" gutterBottom>
              People with access
            </Typography>
            
            {owner && (
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src={owner.photoURL}>{owner.displayName.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={owner.displayName}
                    secondary="Owner"
                  />
                </ListItem>
              </List>
            )}
            
            {collaborators.length > 0 ? (
              <List sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                {collaborators.map((collab) => (
                  <ListItem key={collab.id}>
                    <ListItemAvatar>
                      <Avatar src={collab.photoURL}>{collab.displayName.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{collab.displayName}</Typography>
                          <Chip 
                            label={`${collaboratorCounts[collab.id] || 0} shared notes`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={`${collab.permission.charAt(0).toUpperCase()}${collab.permission.slice(1)} access`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => openRemoveDialog(collab)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No collaborators yet
              </Typography>
            )}
          </Box>
        </Paper>
      </Container>
      
      <Dialog
        open={removeDialog}
        onClose={() => setRemoveDialog(false)}
      >
        <DialogTitle>Remove access?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedUser && (
              `Are you sure you want to remove ${selectedUser.displayName}'s access to this note?`
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveDialog(false)}>Cancel</Button>
          <Button onClick={handleRemoveAccess} color="error" autoFocus>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        action={
          <Button color="inherit" size="small" onClick={handleCloseSnackbar}>
            Close
          </Button>
        }
      />
    </Layout>
  );
};

export default ShareNote;