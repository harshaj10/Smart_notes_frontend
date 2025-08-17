import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { notesAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { initSocket, joinNote, leaveNote, sendNoteUpdate } from '../services/socket';
import { debounce } from 'lodash';

// Note interface
export interface Note {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  ownerName?: string;
  permission?: 'read' | 'write' | 'admin';
}

// Note with additional details
export interface NoteDetails extends Note {
  creator?: {
    displayName: string;
    photoURL?: string;
  };
  collaborators?: Array<{
    id: string;
    displayName: string;
    photoURL?: string;
    permission: 'read' | 'write' | 'admin';
  }>;
}

// Version interface
export interface NoteVersion {
  id: number;
  noteId: string;
  title: string;
  content: string;
  versionNumber: number;
  createdBy: string;
  createdAt: string;
  displayName?: string;
}

// Notes context interface
interface NotesContextType {
  notes: {
    own: Note[];
    shared: Note[];
  };
  currentNote: NoteDetails | null;
  versions: NoteVersion[];
  loading: boolean;
  error: string | null;
  sharedNotesCount: number; // Add this new property
  fetchNotes: () => Promise<void>;
  fetchNote: (noteId: string) => Promise<NoteDetails>;
  createNote: (data: { title: string; content?: string }) => Promise<Note>;
  updateNote: (noteId: string, data: { title?: string; content?: string }) => Promise<Note>;
  deleteNote: (noteId: string) => Promise<void>;
  shareNote: (noteId: string, data: { email: string; permission: 'read' | 'write' | 'admin' }) => Promise<void>;
  revokeAccess: (noteId: string, userId: string) => Promise<void>;
  fetchVersions: (noteId: string) => Promise<NoteVersion[]>;
  fetchVersion: (noteId: string, versionNumber: number) => Promise<NoteVersion>;
  setCurrentNote: (note: NoteDetails | null) => void;
  updateNoteContent: (noteId: string, content: string) => void;
  updateCurrentNoteContent: (content: string) => void;
  refreshSharedNotesCount: () => Promise<void>; // Add this
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const useNotes = (): NotesContextType => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

interface NotesProviderProps {
  children: ReactNode;
}

export const NotesProvider: React.FC<NotesProviderProps> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [notes, setNotes] = useState<{ own: Note[]; shared: Note[] }>({ own: [], shared: [] });
  const [currentNote, setCurrentNote] = useState<NoteDetails | null>(null);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedNotesCount, setSharedNotesCount] = useState<number>(0);
  const socketInitialized = useRef<boolean>(false);
  const currentNoteId = useRef<string | null>(null);
  
  // Add debounce timer refs
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const socketUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string | null>(null);

  // Initialize socket connection when user is authenticated (only once)
  useEffect(() => {
    const initSocketConnection = async () => {
      // Only try to initialize socket when user is fully authenticated
      if (currentUser && userProfile) {
        try {
          console.log('Attempting to initialize socket with authenticated user');
          await initSocket();
          socketInitialized.current = true;
          console.log('Socket initialized successfully');
        } catch (err) {
          console.warn('Socket initialization failed, will retry when authentication is complete', err);
          // Don't set socketInitialized to true so we can retry later
        }
      }
    };
    
    if (currentUser && userProfile && !socketInitialized.current) {
      initSocketConnection();
    }
    
    // Store ref values in variables to use in cleanup to avoid the exhaustive-deps warning
    const updateTimerCurrent = updateTimerRef.current;
    const socketUpdateTimerCurrent = socketUpdateTimerRef.current;
    
    // Clean up timers on unmount
    return () => {
      if (updateTimerCurrent) {
        clearTimeout(updateTimerCurrent);
      }
      if (socketUpdateTimerCurrent) {
        clearTimeout(socketUpdateTimerCurrent);
      }
    };
  }, [currentUser, userProfile]); // Added userProfile as dependency

  // Join note room when current note changes - with optimized logic to prevent infinite loops
  useEffect(() => {
    if (!currentNote) {
      return;
    }
    
    // Only join if the note ID has changed
    if (currentNoteId.current !== currentNote.id) {
      // Leave the previous note room if there was one
      if (currentNoteId.current) {
        leaveNote(currentNoteId.current);
      }
      
      currentNoteId.current = currentNote.id;
      joinNote(currentNote.id);
      
      // Store the initial content for comparison
      lastContentRef.current = currentNote.content;
    }

    return () => {
      if (currentNoteId.current) {
        leaveNote(currentNoteId.current);
        currentNoteId.current = null;
      }
    };
  }, [currentNote]); // Including currentNote in dependencies

  // Fetch notes when user profile changes
  useEffect(() => {
    if (userProfile) {
      fetchNotes();
    }
    // eslint-disable-next-line
  }, [userProfile]); // fetchNotes is defined with useCallback, so it's stable

  // Add function to fetch live shared notes count
  const fetchSharedNotesCount = useCallback(async (): Promise<void> => {
    if (!userProfile?.id) return;
    
    try {
      const response = await notesAPI.getSharedNotesCount(userProfile.id);
      setSharedNotesCount(response.count || 0);
    } catch (err) {
      console.error('Error fetching shared notes count:', err);
    }
  }, [userProfile?.id]);

  const fetchNotes = useCallback(async (): Promise<void> => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await notesAPI.getAllNotes();
      setNotes(data);
      // Fetch live count instead of using local state
      await fetchSharedNotesCount();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notes');
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, fetchSharedNotesCount]);

  // Fetch shared notes count when user profile changes
  useEffect(() => {
    if (userProfile) {
      fetchNotes();
      fetchSharedNotesCount();
    }
  }, [userProfile, fetchNotes, fetchSharedNotesCount]);

  // Add function to refresh shared notes count
  const refreshSharedNotesCount = useCallback(async (): Promise<void> => {
    await fetchSharedNotesCount();
  }, [fetchSharedNotesCount]);

  const fetchNote = useCallback(async (noteId: string): Promise<NoteDetails> => {
    if (currentNote && currentNote.id === noteId) {
      return currentNote; // Return cached note if it's the same to prevent unnecessary fetches
    }
    
    try {
      setLoading(true);
      setError(null);
      const note = await notesAPI.getNote(noteId);
      setCurrentNote(note);
      return note;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch note');
      console.error('Error fetching note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentNote]);

  const createNote = async (data: { title: string; content?: string }): Promise<Note> => {
    try {
      setLoading(true);
      setError(null);
      const newNote = await notesAPI.createNote(data);
      setNotes(prev => ({
        ...prev,
        own: [newNote, ...prev.own]
      }));
      return newNote;
    } catch (err: any) {
      setError(err.message || 'Failed to create note');
      console.error('Error creating note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update the updateNoteContent function to properly handle debouncing
  // Separate function specifically for content updates to prevent excessive API calls
  // eslint-disable-next-line
  const updateNoteContent = useCallback(
    debounce(async (noteId: string, content: string) => {
      if (!noteId || noteId === 'new') return;
      
      try {
        // Update local state immediately for smoother UX
        setNotes((prevNotes) => {
          const newOwn = prevNotes.own.map(note => 
            note.id === noteId ? { ...note, content, updatedAt: new Date().toISOString() } : note
          );
          const newShared = prevNotes.shared.map(note => 
            note.id === noteId ? { ...note, content, updatedAt: new Date().toISOString() } : note
          );
          return {
            own: newOwn,
            shared: newShared
          };
        });
        
        if (currentNote && currentNote.id === noteId) {
          setCurrentNote((prev) => 
            prev ? { ...prev, content, updatedAt: new Date().toISOString() } : prev
          );
        }
        
        // Send real-time update to collaborators with minimal delay
        if (userProfile) {
          sendNoteUpdate({
            noteId,
            content,
            userId: userProfile.id
          });
        }
        
        // Make the actual API call with a longer delay to reduce server load
        const response = await notesAPI.updateNote(noteId, { content });
        return response;
      } catch (error) {
        console.error('Error updating note content:', error);
        setError('Failed to update note content. Please try again.');
        throw error;
      }
    }, 1000),
    [currentNote, setCurrentNote, setNotes, userProfile]
  );

  const updateNote = async (noteId: string, data: { title?: string; content?: string }): Promise<Note> => {
    // For content-only updates, use the debounced version
    if (data.content !== undefined && data.title === undefined) {
      updateNoteContent(noteId, data.content);
      // Return the current note (optimistically updated)
      const currentNoteInList = [...notes.own, ...notes.shared].find(note => note.id === noteId);
      return currentNoteInList || { ...data, id: noteId } as Note;
    }
    
    try {
      setLoading(true);
      setError(null);
      const updatedNote = await notesAPI.updateNote(noteId, data);
      
      // Update notes list
      setNotes(prev => {
        const newOwn = prev.own.map(note => 
          note.id === noteId ? { ...note, ...data, updatedAt: new Date().toISOString() } : note
        );
        const newShared = prev.shared.map(note => 
          note.id === noteId ? { ...note, ...data, updatedAt: new Date().toISOString() } : note
        );
        return {
          own: newOwn,
          shared: newShared
        };
      });
      
      // Update current note if it's the one being edited
      if (currentNote && currentNote.id === noteId) {
        setCurrentNote(prevNote => {
          if (!prevNote) return null;
          return { ...prevNote, ...data, updatedAt: new Date().toISOString() };
        });
      }
      
      // For title updates, notify others via socket
      if (userProfile && data.title !== undefined) {
        sendNoteUpdate({
          noteId,
          content: currentNote?.content || '',
          userId: userProfile.id,
          title: data.title
        });
      }
      
      return updatedNote;
    } catch (err: any) {
      setError(err.message || 'Failed to update note');
      console.error('Error updating note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await notesAPI.deleteNote(noteId);
      
      // Update notes list
      setNotes(prev => {
        const newOwn = prev.own.filter(note => note.id !== noteId);
        const newShared = prev.shared.filter(note => note.id !== noteId);
        return {
          own: newOwn,
          shared: newShared
        };
      });
      
      // Reset current note if it's the one being deleted
      if (currentNote && currentNote.id === noteId) {
        setCurrentNote(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete note');
      console.error('Error deleting note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const shareNote = async (noteId: string, data: { email: string; permission: 'read' | 'write' | 'admin' }): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await notesAPI.shareNote(noteId, data);
      // Refresh shared notes count for both users involved
      await refreshSharedNotesCount();
      // Also refresh notes list to update any shared status
      await fetchNotes();
    } catch (err: any) {
      setError(err.message || 'Failed to share note');
      console.error('Error sharing note:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const revokeAccess = async (noteId: string, userId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await notesAPI.revokeAccess(noteId, userId);
      // Refresh shared notes count after revoking access
      await refreshSharedNotesCount();
      // Also refresh notes list to update any shared status
      await fetchNotes();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke access');
      console.error('Error revoking access:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async (noteId: string): Promise<NoteVersion[]> => {
    try {
      setLoading(true);
      setError(null);
      const noteVersions = await notesAPI.getNoteVersions(noteId);
      setVersions(noteVersions);
      return noteVersions;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch versions');
      console.error('Error fetching versions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchVersion = async (noteId: string, versionNumber: number): Promise<NoteVersion> => {
    try {
      setLoading(true);
      setError(null);
      const version = await notesAPI.getNoteVersion(noteId, versionNumber);
      return version;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch version');
      console.error('Error fetching version:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentNoteContent = useCallback((content: string): void => {
    if (currentNote) {
      updateNoteContent(currentNote.id, content);
    }
  }, [currentNote, updateNoteContent]);

  const value = {
    notes,
    currentNote,
    versions,
    loading,
    error,
    sharedNotesCount,
    fetchNotes,
    fetchNote,
    createNote,
    updateNote,
    deleteNote,
    shareNote,
    revokeAccess,
    fetchVersions,
    fetchVersion,
    setCurrentNote,
    updateNoteContent,
    updateCurrentNoteContent,
    refreshSharedNotesCount
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
};