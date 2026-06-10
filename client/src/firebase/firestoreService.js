import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

// ===================== REAL-TIME LISTENERS =====================

export const subscribeToCollection = (collectionName, callback) => {
  return onSnapshot(collection(db, collectionName), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

export const subscribeToCollectionWhere = (collectionName, field, operator, value, callback) => {
  const q = query(collection(db, collectionName), where(field, operator, value));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  });
};

// ===================== GENERIC CRUD =====================

// Add a document to a collection (auto-generated ID)
export const addDocument = async (collectionName, data) => {
  const docRef = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

// Add a document with a specific ID
export const setDocument = async (collectionName, docId, data) => {
  await setDoc(doc(db, collectionName, docId), {
    ...data,
    createdAt: serverTimestamp()
  });
  return { id: docId, ...data };
};

// Get all documents from a collection
export const getDocuments = async (collectionName) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get documents with a filter
export const getDocumentsWhere = async (collectionName, field, operator, value) => {
  const q = query(collection(db, collectionName), where(field, operator, value));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Get a single document by ID
export const getDocument = async (collectionName, docId) => {
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

// Update a document (Upsert: creates if not exists, merges if exists)
export const updateDocument = async (collectionName, docId, data) => {
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return { id: docId, ...data };
};

// Delete a document
export const deleteDocument = async (collectionName, docId) => {
  console.log('Service: deleteDocument called for', collectionName, docId);
  const ref = doc(db, collectionName, docId);
  console.log('Service: doc ref created');
  await deleteDoc(ref);
  console.log('Service: deleteDoc promise resolved');
};

// ===================== COLLECTION NAMES =====================
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
  FEE_STRUCTURES: 'fee_structures'
};
