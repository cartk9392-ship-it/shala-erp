const fs = require('fs');
const path = require('path');

// Files that need localStorage replaced with Firestore
const replacements = [
  // ExamMarks.jsx
  {
    file: 'client/src/pages/teacher/ExamMarks.jsx',
    addImport: "import { getDocumentsWhere, addDocument, getDocuments, COLLECTIONS } from '../../firebase/firestoreService';",
    replaces: [
      { from: "JSON.parse(localStorage.getItem('erp_students') || '[]')", to: "await getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', userData?.classAssigned)" },
      { from: "JSON.parse(localStorage.getItem('erp_marks') || '[]')", to: "await getDocuments(COLLECTIONS.MARKS)" },
      { from: "localStorage.setItem('erp_marks', JSON.stringify(", to: "// Firestore save handled separately\n    // " },
    ]
  },
  // ReportCards.jsx
  {
    file: 'client/src/pages/teacher/ReportCards.jsx',
    addImport: "import { getDocumentsWhere, getDocuments, COLLECTIONS } from '../../firebase/firestoreService';",
    replaces: [
      { from: "JSON.parse(localStorage.getItem('erp_students') || '[]')", to: "await getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', userData?.classAssigned)" },
      { from: "JSON.parse(localStorage.getItem('erp_marks') || '[]')", to: "await getDocuments(COLLECTIONS.MARKS)" },
    ]
  },
  // ManageParents.jsx
  {
    file: 'client/src/pages/teacher/ManageParents.jsx',
    addImport: "import { getDocumentsWhere, addDocument, deleteDocument, COLLECTIONS } from '../../firebase/firestoreService';",
    replaces: [
      { from: "JSON.parse(localStorage.getItem('erp_users') || '[]')", to: "await getDocuments(COLLECTIONS.USERS)" },
      { from: "JSON.parse(localStorage.getItem('erp_students') || '[]')", to: "await getDocumentsWhere(COLLECTIONS.STUDENTS, 'class', '==', userData?.classAssigned)" },
    ]
  },
];

console.log('Manual migration needed for remaining files. Script prepared.');
