const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Notice = require('../models/Notice');
const Attendance = require('../models/Attendance');
const Homework = require('../models/Homework');
const Mark = require('../models/Mark');
const Fee = require('../models/Fee');
const StaffAttendance = require('../models/StaffAttendance');
const Settings = require('../models/Settings');
const FeeStructure = require('../models/FeeStructure');
const HomeworkStatus = require('../models/HomeworkStatus');
const ExamSchedule = require('../models/ExamSchedule');
const Syllabus = require('../models/Syllabus');

const models = {
  users: User,
  students: Student,
  classes: Class,
  notices: Notice,
  attendance: Attendance,
  homework: Homework,
  homework_status: HomeworkStatus,
  marks: Mark,
  fees: Fee,
  staff_attendance: StaffAttendance,
  settings: Settings,
  fee_structures: FeeStructure,
  exam_schedules: ExamSchedule,
  syllabus: Syllabus
};

const getModel = (collection) => models[collection];

// Helper: build query for _id that works with both ObjectId and custom string IDs
const buildIdQuery = (id) => {
  // Only treat as ObjectId if it's exactly 24 hex chars AND round-trips correctly
  if (
    typeof id === 'string' &&
    /^[a-f\d]{24}$/i.test(id) &&
    mongoose.Types.ObjectId.isValid(id) &&
    String(new mongoose.Types.ObjectId(id)) === id
  ) {
    return { _id: new mongoose.Types.ObjectId(id) };
  }
  // Custom string ID (e.g. 'school_profile', '10_Mathematics', '10_English')
  return { _id: id };
};

// Get all documents
const getDocuments = async (req, res) => {
  try {
    const { collection } = req.params;
    const Model = getModel(collection);
    if (!Model) return res.status(404).json({ message: `Collection '${collection}' not found` });

    // Strip cache-busting param (_t) before building MongoDB filter
    const { _t, ...queryParams } = req.query;
    const filter = { ...queryParams };

    const docs = await Model.find(filter).sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single document by ID
const getDocumentById = async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getModel(collection);
    if (!Model) return res.status(404).json({ message: `Collection '${collection}' not found` });

    const query = buildIdQuery(id);
    const doc = await Model.findOne(query);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a document
const addDocument = async (req, res) => {
  try {
    const { collection } = req.params;
    const Model = getModel(collection);
    if (!Model) return res.status(404).json({ message: `Collection '${collection}' not found` });

    const doc = await Model.create(req.body);
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a document (upsert: create if doesn't exist)
const updateDocument = async (req, res) => {
  try {
    const { collection, id } = req.params;
    console.log(`UPDATING: ${collection} / ${id}`, req.body);
    const Model = getModel(collection);
    if (!Model) return res.status(404).json({ message: `Collection '${collection}' not found` });

    const query = buildIdQuery(id);
    const updateData = { ...req.body, _id: id }; // Ensure _id is in the body for upserts



    const doc = await Model.findOneAndUpdate(query, updateData, { 
      new: true, 
      upsert: true, 
      runValidators: false,
      setDefaultsOnInsert: true 
    });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a document
const deleteDocument = async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getModel(collection);
    if (!Model) return res.status(404).json({ message: `Collection '${collection}' not found` });

    const query = buildIdQuery(id);

    // --- Cascading Delete Logic for Classes ---
    if (collection === 'classes') {
      const classToDelete = await Model.findOne(query);
      if (classToDelete) {
        const className = classToDelete.name;
        console.log(`CASCADING DELETE: Class ${className}`);

        // 1. Get all students in this class
        const students = await models.students.find({ class: className });
        const studentIds = students.map(s => s._id);

        // 2. Delete Parent accounts linked to this class
        await models.users.deleteMany({ role: 'parent', class: className });

        // 3. Delete Students
        await models.students.deleteMany({ class: className });

        // 4. Delete Marks for this class
        await models.marks.deleteMany({ class: className });

        // 5. Delete Student Fees for this class
        await models.fees.deleteMany({ 
          $or: [
            { class: className },
            { studentId: { $in: studentIds } }
          ]
        });

        // 6. Delete Attendance for this class
        await models.attendance.deleteMany({ class: className });

        // 7. Delete Homework for this class
        await models.homework.deleteMany({ class: className });
        await models.homework_status.deleteMany({ _id: { $regex: new RegExp(`^${className.replace(/\s+/g, '_')}_`) } });
        
        // 8. Delete Fee Structure for this class
        await models.fee_structures.deleteMany({ class: className });

        // 9. Unassign this class from any teachers
        await models.users.updateMany(
          { role: 'teacher', classAssigned: className },
          { $set: { classAssigned: '' } }
        );
      }
    }
    // --- Cascading Delete Logic for Students ---
    if (collection === 'students') {
      const studentToDelete = await Model.findOne(query);
      if (studentToDelete) {
        const studentId = studentToDelete._id.toString();
        const studentName = studentToDelete.name;
        console.log(`CASCADING DELETE: Student ${studentName} (ID: ${studentId})`);

        // 1. Delete linked Parent account
        //    Parent document stores studentId as string field (not childId)
        await models.users.deleteMany({
          role: 'parent',
          $or: [
            { studentId: studentId },                 // string match
            { studentId: studentToDelete._id },       // ObjectId match
            { childId: studentToDelete._id },         // legacy childId
            { childId: studentId },                   // legacy string
            { studentName: studentName }              // name fallback
          ]
        });

        // 2. Delete student's fee records
        await models.fees.deleteMany({ studentId: studentId });

        // 3. Remove student from attendance records
        await models.attendance.updateMany(
          { 'records.studentId': studentId },
          { $pull: { records: { studentId: studentId } } }
        );

        // 4. Delete homework status for this student
        await models.homework_status.deleteMany({ studentId: studentId });

        console.log(`CASCADING DELETE complete for student: ${studentName}`);
      }
    }
    // -------------------------------------------
    if (collection === 'users') {
      const userToDelete = await Model.findOne(query);
      if (userToDelete && userToDelete.role === 'teacher') {
        const className = userToDelete.classAssigned;
        const teacherIdStr = userToDelete._id.toString();
        
        console.log(`CASCADING DELETE: Teacher ${userToDelete.name} from Class ${className}`);

        if (className) {
          console.log(`- Deleting Students, Parents, Marks, Homework for Class: ${className}`);
          // 1. Get all students in this class
          const students = await models.students.find({ class: className });
          const studentIds = students.map(s => s._id);

          // 2. Delete Parent accounts linked to this class
          await models.users.deleteMany({ role: 'parent', class: className });

          // 3. Delete Students
          await models.students.deleteMany({ class: className });

          // 4. Delete Marks for this class
          await models.marks.deleteMany({ class: className });

          // 5. Delete Student Fees for this class
          // (Check for studentIds if class field is missing in some fee records)
          await models.fees.deleteMany({ 
            $or: [
              { class: className },
              { studentId: { $in: studentIds } }
            ]
          });

          // 6. Delete Attendance for this class
          await models.attendance.deleteMany({ 
            $or: [
              { class: className },
              { teacherId: teacherIdStr }
            ]
          });

          // 7. Delete Homework for this class
          await models.homework.deleteMany({ class: className });
          await models.homework_status.deleteMany({ _id: { $regex: new RegExp(`^${className.replace(/\s+/g, '_')}_`) } });

          // 8. Delete the Class itself
          await models.classes.deleteOne({ name: className });
          
          // 9. Delete Fee Structure for this class (if any)
          await models.fee_structures.deleteMany({ class: className });
        }

        // 10. Delete Staff Attendance records for this teacher
        // (Also delete 'undefined' records as a fallback if this was the only teacher)
        await models.staff_attendance.deleteMany({ 
          $or: [
            { teacherId: teacherIdStr },
            { teacherId: 'undefined' },
            { teacherName: userToDelete.name }
          ]
        });
      }
    }
    // -------------------------------------------

    const doc = await Model.findOneAndDelete(query);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json({ message: 'Document and all associated data deleted successfully' });
  } catch (error) {
    console.error('Cascading Delete Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDocuments,
  getDocumentById,
  addDocument,
  updateDocument,
  deleteDocument
};
