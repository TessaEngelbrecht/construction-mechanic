import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import MechanicForm from './components/MechanicForm';
import AdminDashboard from './components/AdminDashboard';
import ManageDropdowns from './components/ManageDropdowns';
import './App.css';

function ProtectedRoute({ children }) {
  const user = JSON.parse(localStorage.getItem('currentUser'));
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/mechanic"
          element={
            <ProtectedRoute>
              <MechanicForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/manage-dropdowns" element={<ManageDropdowns />} />
      </Routes>
    </div>
  );
}

export default App;
