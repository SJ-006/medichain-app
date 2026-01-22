import React from 'react';
import { StoreProvider, useStore } from './context/Store';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { LabDashboard } from './pages/LabDashboard';
import { UserRole } from './types';

const AppContent: React.FC = () => {
  const { currentUser } = useStore();

  if (!currentUser) {
    return (
      <Layout>
        <Login />
      </Layout>
    );
  }

  return (
    <Layout>
      {currentUser.role === UserRole.PATIENT && <PatientDashboard />}
      {currentUser.role === UserRole.DOCTOR && <DoctorDashboard />}
      {currentUser.role === UserRole.LAB_TECHNICIAN && <LabDashboard />}
    </Layout>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}