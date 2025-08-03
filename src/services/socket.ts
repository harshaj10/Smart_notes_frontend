import io from 'socket.io-client';
import { API_URL } from './api';
import { throttle } from 'lodash';

let socket: any = null;
let connectedRooms: Set<string> = new Set();
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

// Function to get the socket instance
export const getSocket = () => socket;

// Create a throttled version of the update function to prevent flooding
export const sendNoteUpdate = throttle((data: {
  noteId: string;
  content: string;
  userId: string;
  title?: string;
}) => {
  try {
    if (!socket?.connected) {
      console.warn('Socket not connected. Attempting to reconnect...');
      initSocket()
        .then(() => {
          if (socket?.connected) {
            if (!connectedRooms.has(data.noteId)) {
              joinNote(data.noteId);
              // Short delay to ensure join completes before sending the update
              setTimeout(() => {
                socket.emit('note:update', data);
              }, 100);
            } else {
              socket.emit('note:update', data);
            }
          }
        })
        .catch(err => console.error('Failed to connect socket for update:', err));
      return;
    }
    
    if (!connectedRooms.has(data.noteId)) {
      console.warn(`Not in room ${data.noteId}. Joining before update.`);
      joinNote(data.noteId);
      // Short delay to ensure join completes before sending the update
      setTimeout(() => {
        socket.emit('note:update', data);
      }, 100);
      return;
    }
    
    socket.emit('note:update', data);
  } catch (err) {
    console.error('Error in sendNoteUpdate:', err);
  }
}, 300, { leading: true, trailing: true });

// Initialize socket connection with better error handling and reconnect logic
export const initSocket = async () => {
  // Don't recreate if already connected
  if (socket?.connected) {
    console.log('Socket already connected');
    return socket;
  }
  
  // Check for too many reconnect attempts
  if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    connectionAttempts = 0;
    throw new Error('Failed to establish socket connection');
  }
  
  try {
    // Get auth token from localStorage
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Return null instead of throwing an error - allows app to work in unauthenticated mode
      console.log('No auth token found for socket connection - continuing in offline mode');
      return null;
    }
    
    return new Promise((resolve, reject) => {
      try {
        // Close any existing socket before creating a new one
        if (socket) {
          socket.disconnect();
          socket = null;
        }
        
        socket = io(API_URL, {
          auth: {
            token
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 10000 // Increase timeout
        });
        
        socket.on('connect', () => {
          console.log('Socket connected successfully');
          connectionAttempts = 0;
          
          // Rejoin all rooms after reconnection
          if (connectedRooms.size > 0) {
            connectedRooms.forEach(roomId => {
              socket.emit('note:join', { noteId: roomId });
            });
          }
          
          resolve(socket);
        });
        
        socket.on('connect_error', (err: Error) => {
          console.error('Socket connection error:', err);
          connectionAttempts++;
          
          // Try to reconnect with backoff
          setTimeout(() => {
            if (!socket?.connected) {
              initSocket().catch(e => console.error('Reconnect failed:', e));
            }
          }, RECONNECT_DELAY);
          
          reject(err);
        });
        
        socket.on('disconnect', (reason: string) => {
          console.warn('Socket disconnected:', reason);
          
          // If the disconnect wasn't intentional, try to reconnect
          if (reason === 'io server disconnect' || reason === 'transport close') {
            setTimeout(() => {
              if (!socket?.connected) {
                initSocket().catch(e => console.error('Reconnect failed:', e));
              }
            }, RECONNECT_DELAY);
          }
        });
      } catch (error) {
        console.error('Socket initialization inner error:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('Socket initialization outer error:', error);
    connectionAttempts++;
    return null; // Return null instead of throwing - allows app to work without socket
  }
};

// Join a note room with improved handling
export const joinNote = (noteId: string) => {
  try {
    if (!socket?.connected) {
      console.warn('Socket not connected. Attempting to reconnect before joining room...');
      initSocket()
        .then((s) => {
          if (s && socket?.connected) {
            socket.emit('note:join', { noteId });
            connectedRooms.add(noteId);
            console.log(`Joined note room: ${noteId}`);
          } else {
            console.log('Cannot join note room - no socket connection');
          }
        })
        .catch(err => console.error('Failed to connect socket for joining note:', err));
      return;
    }
    
    if (!connectedRooms.has(noteId)) {
      socket.emit('note:join', { noteId });
      connectedRooms.add(noteId);
      console.log(`Joined note room: ${noteId}`);
    }
  } catch (err) {
    console.error('Error in joinNote:', err);
  }
};

// Leave a note room with improved handling
export const leaveNote = (noteId: string) => {
  if (!socket?.connected) {
    connectedRooms.delete(noteId);
    return;
  }
  
  if (connectedRooms.has(noteId)) {
    socket.emit('note:leave', { noteId });
    connectedRooms.delete(noteId);
    console.log(`Left note room: ${noteId}`);
  }
};

// Listen for note updates
export const onNoteUpdate = (callback: (data: any) => void) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }
  
  // Remove any existing listeners to prevent duplicates
  socket.off('note:update');
  
  // Add new listener
  socket.on('note:update', callback);
  
  // Return unsubscribe function
  return () => {
    socket.off('note:update', callback);
  };
};

// Disconnect socket cleanly
export const disconnectSocket = () => {
  if (socket?.connected) {
    // Leave all rooms first
    connectedRooms.forEach(roomId => {
      socket.emit('note:leave', { noteId: roomId });
    });
    
    // Clear room tracking
    connectedRooms.clear();
    
    // Disconnect socket
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected');
  }
};