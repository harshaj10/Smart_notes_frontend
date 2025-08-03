import axios from 'axios';
import { getIdToken } from '../firebase/config';

export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to each request
apiInstance.interceptors.request.use(
  async (config) => {
    const token = await getIdToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  register: async (userData: { displayName: string; photoURL?: string }) => {
    const response = await apiInstance.post('/auth/register', userData);
    return response.data;
  },
  getProfile: async () => {
    const response = await apiInstance.get('/auth/profile');
    return response.data;
  },
  updateProfile: async (userData: { displayName: string; photoURL?: string }) => {
    const response = await apiInstance.put('/auth/profile', userData);
    return response.data;
  },
  verifyToken: async (token: string) => {
    const response = await apiInstance.get('/auth/verify-token', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

// Notes API
export const notesAPI = {
  getAllNotes: async () => {
    const response = await apiInstance.get('/notes');
    return response.data;
  },
  getNote: async (noteId: string) => {
    const response = await apiInstance.get(`/notes/${noteId}`);
    return response.data;
  },
  createNote: async (noteData: { title: string; content?: string }) => {
    const response = await apiInstance.post('/notes', noteData);
    return response.data;
  },
  updateNote: async (noteId: string, noteData: { title?: string; content?: string }) => {
    const response = await apiInstance.put(`/notes/${noteId}`, noteData);
    return response.data;
  },
  deleteNote: async (noteId: string) => {
    const response = await apiInstance.delete(`/notes/${noteId}`);
    return response.data;
  },
  permanentlyDeleteNote: async (noteId: string) => {
    const response = await apiInstance.delete(`/notes/${noteId}/permanent`);
    return response.data;
  },
  shareNote: async (noteId: string, data: { email: string; permission: 'read' | 'write' | 'admin' }) => {
    const response = await apiInstance.post(`/notes/${noteId}/share`, data);
    return response.data;
  },
  revokeAccess: async (noteId: string, userId: string) => {
    const response = await apiInstance.delete(`/notes/${noteId}/share/${userId}`);
    return response.data;
  },
  getNoteVersions: async (noteId: string) => {
    const response = await apiInstance.get(`/notes/${noteId}/versions`);
    return response.data;
  },
  getNoteVersion: async (noteId: string, versionNumber: number) => {
    const response = await apiInstance.get(`/notes/${noteId}/versions/${versionNumber}`);
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getUserById: async (userId: string) => {
    const response = await apiInstance.get(`/users/${userId}`);
    return response.data;
  },
  searchUsers: async (query: string) => {
    const response = await apiInstance.get(`/users?query=${query}`);
    return response.data;
  },
  getCollaborators: async (noteId: string) => {
    const response = await apiInstance.get(`/users/notes/${noteId}/collaborators`);
    return response.data;
  },
};

// Named export for the API instance
export const api = apiInstance;

// Export the API instance as default
export default api;