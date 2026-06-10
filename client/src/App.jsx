import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Layout & Common
import Layout from './components/Layout';
import Login from './pages/Login';
import Placeholder from './components/Placeholder';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import ManageTeachers from './pages/admin/ManageTeachers';
import ManageClasses from './pages/admin/ManageClasses';
import AllStudents from './pages/admin/AllStudents';
import ManageNotices from './pages/admin/ManageNotices';
import Settings from './pages/admin/Settings';
import StaffAttendance from './pages/admin/StaffAttendance';
import ManageFees from './pages/admin/ManageFees';

// Teacher Pages
import TeacherDashboard from './pages/TeacherDashboard';
import ManageStudents from './pages/teacher/ManageStudents';
import Attendance from './pages/teacher/Attendance';
import Homework from './pages/teacher/Homework';
import ExamMarks from './pages/teacher/ExamMarks';
import ReportCards from './pages/teacher/ReportCards';
import ManageParents from './pages/teacher/ManageParents';
import ExamSchedule from './pages/teacher/ExamSchedule';
import SyllabusTracker from './pages/teacher/SyllabusTracker';
import PerformanceGraph from './pages/teacher/PerformanceGraph';

// Parent Pages
import ParentDashboard from './pages/ParentDashboard';
import ViewAttendance from './pages/parent/ViewAttendance';
import ViewHomework from './pages/parent/ViewHomework';
import ViewFees from './pages/parent/ViewFees';
import ViewResults from './pages/parent/ViewResults';
import ChildProfile from './pages/parent/ChildProfile';
import ViewExamSchedule from './pages/parent/ViewExamSchedule';
import ViewSyllabus from './pages/parent/ViewSyllabus';
import ViewPerformance from './pages/parent/ViewPerformance';

// Shared Pages
import NoticeBoard from './pages/shared/NoticeBoard';

// A component to redirect root to the correct dashboard
const RootRedirect = () => {
  const { currentUser, userData, loading } = useAuth();
  
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userData?.role === 'admin') return <Navigate to="/admin" replace />;
  if (userData?.role === 'teacher') return <Navigate to="/teacher" replace />;
  if (userData?.role === 'parent') return <Navigate to="/parent" replace />;
  
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<RootRedirect />} />

          <Route element={<Layout />}>
            {/* Admin Routes */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Routes>
                    <Route path="/" element={<AdminDashboard />} />
                    <Route path="teachers" element={<ManageTeachers />} />
                    <Route path="classes" element={<ManageClasses />} />
                    <Route path="students" element={<AllStudents />} />
                    <Route path="notices" element={<ManageNotices />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="staff-attendance" element={<StaffAttendance />} />
                    <Route path="fees" element={<ManageFees />} />
                    <Route path="*" element={<Placeholder />} />
                  </Routes>
                </ProtectedRoute>
              } 
            />

            {/* Teacher Routes */}
            <Route 
              path="/teacher/*" 
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <Routes>
                    <Route path="/" element={<TeacherDashboard />} />
                    <Route path="students" element={<ManageStudents />} />
                    <Route path="attendance" element={<Attendance />} />
                    <Route path="homework" element={<Homework />} />
                    <Route path="marks" element={<ExamMarks />} />
                    <Route path="exam-schedule" element={<ExamSchedule />} />
                    <Route path="syllabus" element={<SyllabusTracker />} />
                    <Route path="performance" element={<PerformanceGraph />} />
                    <Route path="report-cards" element={<ReportCards />} />
                    <Route path="parents" element={<ManageParents />} />
                    <Route path="notices" element={<NoticeBoard />} />
                    <Route path="*" element={<Placeholder />} />
                  </Routes>
                </ProtectedRoute>
              } 
            />

            {/* Parent Routes */}
            <Route 
              path="/parent/*" 
              element={
                <ProtectedRoute allowedRoles={['parent']}>
                  <Routes>
                    <Route path="/" element={<ParentDashboard />} />
                    <Route path="attendance" element={<ViewAttendance />} />
                    <Route path="homework" element={<ViewHomework />} />
                    <Route path="fees" element={<ViewFees />} />
                    <Route path="results" element={<ViewResults />} />
                    <Route path="exam-schedule" element={<ViewExamSchedule />} />
                    <Route path="syllabus" element={<ViewSyllabus />} />
                    <Route path="performance" element={<ViewPerformance />} />
                    <Route path="profile" element={<ChildProfile />} />
                    <Route path="notices" element={<NoticeBoard />} />
                    <Route path="*" element={<Placeholder />} />
                  </Routes>
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
