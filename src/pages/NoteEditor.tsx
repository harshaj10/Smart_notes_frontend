import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  TextField,
  Toolbar,
  Typography,
  Alert,
  Paper,
  Tooltip,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Zoom,
  Switch,
  FormControlLabel,
  Menu,
  MenuItem,
  Snackbar
} from '@mui/material';
import {
  Save as SaveIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  Lightbulb as LightbulbIcon,
  AutoAwesome as AutoAwesomeIcon,
  Title as TitleIcon
} from '@mui/icons-material';
import { EditorState, ContentState, convertToRaw, Modifier, SelectionState } from 'draft-js';
import { Editor } from 'react-draft-wysiwyg';
import htmlToDraft from 'html-to-draftjs';
import draftToHtml from 'draftjs-to-html';
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import { debounce } from 'lodash';
import Layout from '../components/Layout';
import AISuggestions from '../components/AISuggestions';
import { useNotes, NoteVersion } from '../contexts/NotesContext';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import aiService, { AISuggestion } from '../services/ai';

const NoteEditor: React.FC = () => {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const {
    currentNote,
    fetchNote,
    updateNote,
    deleteNote,
    createNote,
    loading,
    error,
    updateNoteContent,  // Use the optimized method for content updates
  } = useNotes();
  
  const [title, setTitle] = useState<string>('');
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState<boolean>(false);

    
  // eslint-disable-next-line 
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [isNewNote, setIsNewNote] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [remoteContent, setRemoteContent] = useState<string | null>(null);
  
  // Speech recognition reference
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<string>('');
  
  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  
  // AI menu and actions state
  const [aiMenuAnchorEl, setAiMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [aiActionLoading, setAiActionLoading] = useState<boolean>(false);
  const [aiActionType, setAiActionType] = useState<string>('');
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<string[]>([]);
  const [analysisOpen, setAnalysisOpen] = useState<boolean>(false);
  
  // Add a flag to track if we're applying remote updates
  
  // Flag to prevent loops when applying remote updates
  const isApplyingRemoteUpdateRef = useRef<boolean>(false);
  
  // Debounce AI suggestions
  const debouncedGetSuggestions = useRef(
    debounce(async (content: string) => {
      if (!aiEnabled || !content) return;
      
      try {
        setAiSuggestionsLoading(true);
        const suggestions = await aiService.getSuggestions(content);
        setAiSuggestions(suggestions);
      } catch (err) {
        console.error('Error getting AI suggestions:', err);
      } finally {
        setAiSuggestionsLoading(false);
      }
    }, 2000)
  ).current;
  
  useEffect(() => {
    const loadNote = async () => {
      try {
        if (noteId) {
          if (noteId === 'new') {
            setIsNewNote(true);
            setTitle('Untitled Note');
            setEditorState(EditorState.createEmpty());
          } else {
            const note = await fetchNote(noteId);
            setTitle(note.title);
            
            // Convert HTML content to Draft.js editor state
            if (note.content) {
              const contentBlock = htmlToDraft(note.content);
              if (contentBlock) {
                const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
                const newEditorState = EditorState.createWithContent(contentState);
                setEditorState(newEditorState);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading note:', err);
      }
    };
    
    loadNote();
    
    // Set up real-time updates listener
    const socket = getSocket();
    if (socket && noteId && noteId !== 'new') {
      socket.on('note-updated', (data: {noteId: string, userId: string, content?: string, title?: string}) => {
        if (data.noteId === noteId && data.userId !== userProfile?.id) {
          // Store remote content for later application rather than updating immediately
          if (data.content) {
            setRemoteContent(data.content);
          }
          
          // Update title if provided
          if (data.title) {
            setTitle(data.title);
          }
        }
      });
    }
    
    return () => {
      if (socket) {
        socket.off('note-updated');
        socket.off('cursor-moved');
      }
    };
  }, [noteId, userProfile, fetchNote]);
  
  // Handle remote content updates separately from local edits
  useEffect(() => {
    if (remoteContent && !isApplyingRemoteUpdateRef.current) {
      isApplyingRemoteUpdateRef.current = true;
      
      // Convert received HTML content to Draft.js editor state
      const contentBlock = htmlToDraft(remoteContent);
      if (contentBlock) {
        const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
        const newEditorState = EditorState.createWithContent(contentState);
        setEditorState(newEditorState);
      }
      
      // Reset the remote content flag
      setRemoteContent(null);
      
      // Allow local updates again after a short delay
      setTimeout(() => {
        isApplyingRemoteUpdateRef.current = false;
      }, 300);
    }
  }, [remoteContent]);
  
  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      
      // Convert HTML content to Draft.js editor state - only if not already editing
      if (currentNote.content && !isApplyingRemoteUpdateRef.current) {
        const contentBlock = htmlToDraft(currentNote.content);
        if (contentBlock) {
          const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
          const newEditorState = EditorState.createWithContent(contentState);
          setEditorState(newEditorState);
        }
      }
    }
  }, [currentNote]);
  
  // Handle auto-saving
  // const debouncedSave = useRef(
  //   debounce(async (noteId: string, data: {title?: string, content?: string}) => {
  //     try {
  //       setIsSaving(true);
  //       await updateNote(noteId, data);
  //       setSaveError(null);
  //     } catch (err) {
  //       console.error('Error saving note:', err);
  //       setSaveError('Failed to autosave. Try saving manually.');
  //     } finally {
  //       setIsSaving(false);
  //     }
  //   }, 1000)
  // ).current;
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    if (noteId && noteId !== 'new') {
      // Use the regular updateNote for title changes (not debounced as heavily)
      updateNote(noteId, { title: newTitle });
    }
  };
  
  // First fix the type issues with handleEditorChange function and parameter types
  const handleEditorChange = useCallback((editorState: EditorState) => {
    if (isApplyingRemoteUpdateRef.current) return; // Skip if we're applying a remote update
    
    // Always update the editor state for both existing and new notes
    setEditorState(editorState);
    
    // Convert editor state to HTML for saving
    const contentState = editorState.getCurrentContent();
    const htmlContent = draftToHtml(convertToRaw(contentState));
    
    // For existing notes, update content with debouncing
    if (currentNote && currentNote.id) {
      updateNoteContent(currentNote.id, htmlContent);
    }
    // For new notes, we don't need to update anything in real-time, 
    // content will be saved when the user clicks Save
  }, [currentNote, updateNoteContent]);
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      
      // Convert editor state to HTML
      const contentState = editorState.getCurrentContent();
      const htmlContent = draftToHtml(convertToRaw(contentState));
      
      if (isNewNote) {
        // Use createNote instead of updateNote for new notes
        const newNote = await createNote({ title, content: htmlContent });
        if (newNote && newNote.id) {
          navigate(`/notes/${newNote.id}`);
        } else {
          navigate('/dashboard');
        }
      } else if (noteId) {
        await updateNote(noteId, { title, content: htmlContent });
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error saving note:', err);
      setSaveError('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!noteId || noteId === 'new') return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteNote(noteId);
        navigate('/dashboard');
      } catch (err) {
        console.error('Error deleting note:', err);
      }
    }
  };
  
  const handleShare = () => {
    if (noteId && noteId !== 'new') {
      navigate(`/notes/${noteId}/share`);
    }
  };
  
  const handleViewVersions = async () => {
    try {
      // Here you would fetch and display the version history
      setVersionsOpen(true);
    } catch (err) {
      console.error('Error fetching versions:', err);
    }
  };
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  
  // Fix the socket event handler to properly type the data parameter
  useEffect(() => {
    const loadNote = async () => {
      try {
        if (noteId) {
          if (noteId === 'new') {
            setIsNewNote(true);
            setTitle('Untitled Note');
            setEditorState(EditorState.createEmpty());
          } else {
            const note = await fetchNote(noteId);
            setTitle(note.title);
            
            // Convert HTML content to Draft.js editor state
            if (note.content) {
              const contentBlock = htmlToDraft(note.content);
              if (contentBlock) {
                const contentState = ContentState.createFromBlockArray(contentBlock.contentBlocks);
                const newEditorState = EditorState.createWithContent(contentState);
                setEditorState(newEditorState);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading note:', err);
      }
    };
    
    loadNote();
    
    // Set up real-time updates listener
    const socket = getSocket();
    if (socket && noteId && noteId !== 'new') {
      socket.on('note-updated', (data: {noteId: string, userId: string, content?: string, title?: string}) => {
        if (data.noteId === noteId && data.userId !== userProfile?.id) {
          // Store remote content for later application rather than updating immediately
          if (data.content) {
            setRemoteContent(data.content);
          }
          
          // Update title if provided
          if (data.title) {
            setTitle(data.title);
          }
        }
      });
    }
    
    return () => {
      if (socket) {
        socket.off('note-updated');
        socket.off('cursor-moved');
      }
    };
  }, [noteId, userProfile, fetchNote]);
  
  // Fix the insert text function to work with EditorState
  // const insertTextAtCursor = useCallback((text: string) => {
  //   const contentState = editorState.getCurrentContent();
    
  //   // Insert the transcribed text at cursor position
  //   const selectionState = editorState.getSelection();
  //   const newContentState = Modifier.insertText(
  //     contentState,
  //     selectionState,
  //     text
  //   );
    
  //   const newEditorState = EditorState.push(
  //     editorState,
  //     newContentState,
  //     'insert-characters'
  //   );
    
  //   setEditorState(newEditorState);
    
  //   // Also update the content in the backend if we have a valid note
  //   if (currentNote && currentNote.id) {
  //     const htmlContent = draftToHtml(convertToRaw(newContentState));
  //     updateNoteContent(currentNote.id, htmlContent);
  //   }
  // }, [editorState, currentNote, updateNoteContent]);
  
  const handleStartRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
      setRecordingStatus('Listening...');
    } else {
      setRecordingStatus('Speech recognition not available');
    }
  };
  
  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setRecordingStatus('');
    }
  };
  
  // Check if user has write permission
  const canEdit = isNewNote || 
    (currentNote && 
     (currentNote.createdBy === userProfile?.id || 
      (currentNote.permission && ['write', 'admin'].includes(currentNote.permission))));
  
  const toolbarOptions = {
    options: ['inline', 'blockType', 'list', 'textAlign', 'colorPicker', 'link', 'history'],
    inline: {
      options: ['bold', 'italic', 'underline', 'strikethrough'],
    },
  };
  
  // Toggle AI suggestions on/off
  const handleToggleAI = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAiEnabled(event.target.checked);
    if (!event.target.checked) {
      setAiSuggestions([]);
    }
  };
  
  // Fix the apply AI suggestion function
  const handleApplySuggestion = (suggestionText: string) => {
    const contentState = editorState.getCurrentContent();
    const plainText = contentState.getPlainText();
    
    // Create a new paragraph with the suggestion
    const newContentState = Modifier.insertText(
      contentState,
      editorState.getSelection().merge({
        anchorOffset: plainText.length,
        focusOffset: plainText.length,
      }),
      `\n\n${suggestionText}`
    );
    
    const newEditorState = EditorState.push(
      editorState,
      newContentState,
      'insert-characters'
    );
    
    setEditorState(newEditorState);
    
    // Also update the content in the backend if we have a valid note
    if (currentNote && currentNote.id) {
      const htmlContent = draftToHtml(convertToRaw(newContentState));
      updateNoteContent(currentNote.id, htmlContent);
    }
    
    // Clear the suggestions after applying one
    setAiSuggestions([]);
  };
  
  // Request AI suggestions when content changes
  useEffect(() => {
    if (!aiEnabled) return;
    
    const contentState = editorState.getCurrentContent();
    const plainText = contentState.getPlainText();
    
    if (plainText.length > 20) {
      debouncedGetSuggestions(plainText);
    } else {
      setAiSuggestions([]);
    }
    
    return () => {
      debouncedGetSuggestions.cancel();
    };
  }, [editorState, aiEnabled, debouncedGetSuggestions]);
  
  // Get the current paragraph text at cursor position
  const getCurrentParagraphText = useCallback(() => {
    const contentState = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const currentBlock = contentState.getBlockForKey(selection.getStartKey());
    return currentBlock.getText();
  }, [editorState]);
  
  // AI menu handlers
  const handleOpenAiMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAiMenuAnchorEl(event.currentTarget);
  };
  
  const handleCloseAiMenu = () => {
    setAiMenuAnchorEl(null);
  };
  
  // Handle AI completion for the current paragraph
  const handleAiCompletion = async () => {
    try {
      setAiActionLoading(true);
      setAiActionType('completion');
      handleCloseAiMenu();
      
      const paragraphText = getCurrentParagraphText();
      if (paragraphText.length < 10) {
        setSnackbarMessage('Please write more text to get meaningful completions');
        setSnackbarOpen(true);
        return;
      }
      
      const completionText = await aiService.getCompletion(paragraphText);
      
      if (!completionText) {
        setSnackbarMessage('Could not generate completion. Please try again.');
        setSnackbarOpen(true);
        return;
      }
      
      // Insert the completion at the end of the current paragraph
      const contentState = editorState.getCurrentContent();
      const selection = editorState.getSelection();
      const currentBlock = contentState.getBlockForKey(selection.getStartKey());
      
      // Create a selection at the end of the current block
      const endOfBlockSelection = SelectionState.createEmpty(currentBlock.getKey()).merge({
        anchorOffset: currentBlock.getLength(),
        focusOffset: currentBlock.getLength(),
      });
      
      // Insert the completion text
      const newContentState = Modifier.insertText(
        contentState,
        endOfBlockSelection,
        completionText
      );
      
      const newEditorState = EditorState.push(
        editorState,
        newContentState,
        'insert-characters'
      );
      
      setEditorState(newEditorState);
      
      // Update the content in the backend if we have a valid note
      if (currentNote && currentNote.id) {
        const htmlContent = draftToHtml(convertToRaw(newContentState));
        updateNoteContent(currentNote.id, htmlContent);
      }
      
      setSnackbarMessage('AI completion applied successfully!');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error generating AI completion:', error);
      setSnackbarMessage('Error generating AI completion');
      setSnackbarOpen(true);
    } finally {
      setAiActionLoading(false);
      setAiActionType('');
    }
  };
  
  // Handle AI title suggestion
  const handleAiTitleSuggestion = async () => {
    try {
      setAiActionLoading(true);
      setAiActionType('title');
      handleCloseAiMenu();
      
      const contentState = editorState.getCurrentContent();
      const plainText = contentState.getPlainText();
      
      if (plainText.length < 50) {
        setSnackbarMessage('Please write more content to generate a meaningful title');
        setSnackbarOpen(true);
        return;
      }
      
      const suggestedTitle = await aiService.suggestTitle(plainText);
      
      if (suggestedTitle) {
        setTitle(suggestedTitle);
        
        // Update the title in the backend if we have a valid note
        if (currentNote && currentNote.id) {
          updateNote(currentNote.id, { title: suggestedTitle });
        }
        
        setSnackbarMessage('Title suggestion applied');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('Could not generate title suggestion');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error generating AI title suggestion:', error);
      setSnackbarMessage('Error generating title suggestion');
      setSnackbarOpen(true);
    } finally {
      setAiActionLoading(false);
      setAiActionType('');
    }
  };
  
  // Handle AI content analysis
  const handleAiAnalysis = async () => {
    try {
      setAiActionLoading(true);
      setAiActionType('analysis');
      handleCloseAiMenu();
      
      const contentState = editorState.getCurrentContent();
      const plainText = contentState.getPlainText();
      
      if (plainText.length < 100) {
        setSnackbarMessage('Please write more content for a meaningful analysis');
        setSnackbarOpen(true);
        return;
      }
      
      const analysisResults = await aiService.analyzeContent(plainText);
      
      if (analysisResults && analysisResults.length > 0) {
        // Open a dialog to display the analysis results
        setAiAnalysisResults(analysisResults);
        setAnalysisOpen(true);
      } else {
        setSnackbarMessage('No analysis suggestions available');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      setSnackbarMessage('Error analyzing content');
      setSnackbarOpen(true);
    } finally {
      setAiActionLoading(false);
      setAiActionType('');
    }
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };
  
  return (
    <Layout title={isNewNote ? "New Note" : title}>
      <Container maxWidth="lg">
        <Paper sx={{ p: 2, mb: 2 }}>
          <Toolbar disableGutters sx={{ mb: 2 }}>
            <IconButton onClick={handleBack} edge="start" sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {isNewNote ? "Create New Note" : "Edit Note"}
            </Typography>
            
            {canEdit && (
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={aiEnabled}
                      onChange={handleToggleAI}
                      color="primary"
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LightbulbIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="body2">AI Assist</Typography>
                    </Box>
                  }
                  sx={{ mr: 2 }}
                />
                
                <Tooltip title="AI Tools">
                  <IconButton 
                    onClick={handleOpenAiMenu}
                    disabled={!aiEnabled || aiActionLoading}
                    sx={{ mr: 1 }}
                    color="primary"
                  >
                    {aiActionLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <AutoAwesomeIcon />
                    )}
                  </IconButton>
                </Tooltip>
                
                <Menu
                  anchorEl={aiMenuAnchorEl}
                  open={Boolean(aiMenuAnchorEl)}
                  onClose={handleCloseAiMenu}
                >
                  <MenuItem onClick={handleAiCompletion}>
                    <LightbulbIcon fontSize="small" sx={{ mr: 1 }} />
                    Complete current paragraph
                  </MenuItem>
                  <MenuItem onClick={handleAiTitleSuggestion}>
                    <TitleIcon fontSize="small" sx={{ mr: 1 }} />
                    Suggest title
                  </MenuItem>
                  <MenuItem onClick={handleAiAnalysis}>
                    <AutoAwesomeIcon fontSize="small" sx={{ mr: 1 }} />
                    Analyze content
                  </MenuItem>
                </Menu>
              </>
            )}
            
            {/* Existing buttons */}
            {!isNewNote && (
              <>
                <Tooltip title="View History">
                  <IconButton onClick={handleViewVersions} disabled={loading}>
                    <HistoryIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Share">
                  <IconButton 
                    onClick={handleShare} 
                    disabled={loading || isNewNote || (currentNote?.createdBy !== userProfile?.id)}
                  >
                    <ShareIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="Delete">
                  <IconButton 
                    onClick={handleDelete} 
                    disabled={loading || isNewNote || (currentNote?.createdBy !== userProfile?.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              color="primary"
              onClick={handleSave}
              disabled={loading || isSaving || !canEdit}
              sx={{ ml: 2 }}
            >
              {isSaving ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </Toolbar>
          
          {(error || saveError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || saveError}
            </Alert>
          )}
          
          {loading && !currentNote && !isNewNote ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Note metadata and collaborators */}
              {!isNewNote && currentNote && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {currentNote.collaborators?.map((collab) => (
                      <Chip
                        key={collab.id}
                        avatar={
                          <Avatar 
                            alt={collab.displayName} 
                            src={collab.photoURL}
                          >
                            {collab.displayName.charAt(0)}
                          </Avatar>
                        }
                        label={`${collab.displayName} (${collab.permission})`}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              <TextField
                fullWidth
                variant="outlined"
                label="Title"
                value={title}
                onChange={handleTitleChange}
                disabled={!canEdit}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ height: '500px', mb: 2, border: '1px solid #ddd', borderRadius: '4px', position: 'relative' }}>
                {/* AI Suggestions Component */}
                {canEdit && aiEnabled && (
                  <AISuggestions
                    suggestions={aiSuggestions}
                    loading={aiSuggestionsLoading}
                    onApplySuggestion={handleApplySuggestion}
                  />
                )}
                
                <Editor
                  editorState={editorState}
                  onEditorStateChange={handleEditorChange}
                  toolbar={toolbarOptions}
                  readOnly={!canEdit}
                  editorStyle={{
                    height: '430px',
                    padding: '0 15px',
                    overflowY: 'auto',
                  }}
                />
                
                {/* Floating Voice Button */}
                {canEdit && (
                  <Box sx={{ position: 'absolute', right: 20, bottom: 20 }}>
                    <Zoom in={true}>
                      <Fab
                        color={isRecording ? "secondary" : "primary"}
                        size="medium"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        aria-label={isRecording ? "stop recording" : "start recording"}
                        sx={{
                          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                          animation: isRecording ? 'pulse 1.5s infinite' : 'none',
                          '@keyframes pulse': {
                            '0%': {
                              boxShadow: '0 0 0 0 rgba(231, 76, 60, 0.7)',
                            },
                            '70%': {
                              boxShadow: '0 0 0 10px rgba(231, 76, 60, 0)',
                            },
                            '100%': {
                              boxShadow: '0 0 0 0 rgba(231, 76, 60, 0)',
                            },
                          },
                        }}
                      >
                        {isRecording ? <StopIcon /> : <MicIcon />}
                      </Fab>
                    </Zoom>
                    
                    {/* Recording Status */}
                    {isRecording && (
                      <Chip
                        label={recordingStatus || "Recording..."}
                        color="secondary"
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: '-30px',
                          right: 0,
                          fontWeight: 'bold',
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </>
          )}
        </Paper>
      </Container>
      
      {/* Versions Dialog */}
      <Dialog open={versionsOpen} onClose={() => setVersionsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Note History</DialogTitle>
        <DialogContent>
          {versions.length === 0 ? (
            <Typography>No version history available</Typography>
          ) : (
            <Box>
              {/* Version history would be displayed here */}
              {versions.map((version) => (
                <Box key={version.id} sx={{ mb: 2, p: 2, border: '1px solid #eee' }}>
                  <Typography variant="subtitle1">
                    Version {version.versionNumber} - {new Date(version.createdAt).toLocaleString()}
                  </Typography>
                  <Typography variant="subtitle2">
                    By: {version.displayName}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Title: {version.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Analysis Dialog */}
      <Dialog open={analysisOpen} onClose={() => setAnalysisOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AutoAwesomeIcon sx={{ mr: 1 }} color="primary" />
            AI Content Analysis
          </Box>
        </DialogTitle>
        <DialogContent>
          {aiAnalysisResults.length === 0 ? (
            <Typography>No analysis results available</Typography>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Here are some suggestions to improve your note:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {aiAnalysisResults.map((result, index) => (
                    <Box component="li" key={index} sx={{ mb: 1.5 }}>
                      <Typography variant="body1">{result}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnalysisOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Layout>
  );
};

export default NoteEditor;