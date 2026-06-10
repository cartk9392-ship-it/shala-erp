const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getDocuments, 
  getDocumentById,
  addDocument, 
  updateDocument, 
  deleteDocument 
} = require('../controllers/dataController');

// All data routes require authentication
router.use(protect);

router.get('/:collection', getDocuments);
router.get('/:collection/:id', getDocumentById);
router.post('/:collection', addDocument);
router.put('/:collection/:id', updateDocument);
router.delete('/:collection/:id', deleteDocument);

module.exports = router;
