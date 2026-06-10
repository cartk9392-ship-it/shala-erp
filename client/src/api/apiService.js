import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const mockSession = localStorage.getItem('mockSession');
  if (mockSession) {
    const { token } = JSON.parse(mockSession);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ===================== GENERIC CRUD =====================

const mapDoc = (doc) => {
  if (!doc) return doc;
  const mapped = { ...doc, id: doc._id };
  // Shim for Firebase timestamp compatibility (.seconds)
  if (doc.createdAt) {
    const date = new Date(doc.createdAt);
    mapped.createdAt = { seconds: Math.floor(date.getTime() / 1000), toDate: () => date };
  }
  if (doc.updatedAt) {
    const date = new Date(doc.updatedAt);
    mapped.updatedAt = { seconds: Math.floor(date.getTime() / 1000), toDate: () => date };
  }
  return mapped;
};

export const getDocuments = async (collectionName) => {
  const response = await api.get(`/data/${collectionName}`, {
    params: { _t: Date.now() }  // cache-bust: har request fresh
  });
  return response.data.map(mapDoc);
};

export const getDocumentsWhere = async (collectionName, field, operator, value) => {
  const response = await api.get(`/data/${collectionName}`, {
    params: { [field]: value, _t: Date.now() }  // cache-bust
  });
  return response.data.map(mapDoc);
};

export const addDocument = async (collectionName, data) => {
  const response = await api.post(`/data/${collectionName}`, data);
  return mapDoc(response.data);
};

export const updateDocument = async (collectionName, docId, data) => {
  const response = await api.put(`/data/${collectionName}/${docId}`, data);
  return mapDoc(response.data);
};

export const setDocument = async (collectionName, docId, data) => {
  const response = await api.put(`/data/${collectionName}/${docId}`, data);
  return mapDoc(response.data);
};

export const deleteDocument = async (collectionName, docId) => {
  await api.delete(`/data/${collectionName}/${docId}`);
};

export const getDocument = async (collectionName, docId) => {
  const response = await api.get(`/data/${collectionName}/${docId}`);
  return mapDoc(response.data);
};

// ===================== REAL-TIME LISTENERS (POLLING SIMULATION) =====================

export const subscribeToCollection = (collectionName, callback) => {
  const fetch = () => getDocuments(collectionName).then(callback).catch(err => console.error(err));
  fetch(); // Initial fetch
  const interval = setInterval(fetch, 3000); // Poll every 3 seconds
  return () => clearInterval(interval);
};

export const subscribeToCollectionWhere = (collectionName, field, operator, value, callback) => {
  const fetch = () => getDocumentsWhere(collectionName, field, operator, value).then(callback).catch(err => console.error(err));
  fetch();
  const interval = setInterval(fetch, 3000);
  return () => clearInterval(interval);
};

// ===================== AUTH =====================

export const loginUser = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const COLLECTIONS = {
  USERS: 'users',
  STUDENTS: 'students',
  CLASSES: 'classes',
  NOTICES: 'notices',
  ATTENDANCE: 'attendance',
  HOMEWORK: 'homework',
  MARKS: 'marks',
  FEES: 'fees',
  SETTINGS: 'settings',
  STAFF_ATTENDANCE: 'staff_attendance',
  FEE_STRUCTURES: 'fee_structures',
  EXAM_SCHEDULES: 'exam_schedules',
  SYLLABUS: 'syllabus'
};
