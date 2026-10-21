import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public pages
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Doctor pages
import DoctorDashboard from './pages/doctor/DashboardPage';
import DoctorNewPrescription from './pages/doctor/NewPrescriptionPage';
import DoctorPrescriptionDetail from './pages/doctor/PrescriptionDetailPage';
import DoctorPrescriptions from './pages/doctor/PrescriptionsPage';
import DoctorPatients from './pages/doctor/PatientsPage';
import DoctorClarifications from './pages/doctor/ClarificationsPage';
import DoctorProfile from './pages/doctor/ProfilePage';

// Patient pages
import PatientDashboard from './pages/patient/DashboardPage';
import PatientPrescriptions from './pages/patient/PrescriptionsPage';
import PatientPrescriptionDetail from './pages/patient/PrescriptionDetailPage';
import PatientSchedule from './pages/patient/SchedulePage';
import PatientProfile from './pages/patient/ProfilePage';

// Pharmacist pages
import PharmacistFind from './pages/pharmacist/FindPrescriptionPage';
import PharmacistVerify from './pages/pharmacist/VerifyPage';
import PharmacistClarifications from './pages/pharmacist/ClarificationsPage';
import PharmacistProfile from './pages/pharmacist/ProfilePage';

// Admin pages
import AdminDashboard from './pages/admin/DashboardPage';
import AdminUsers from './pages/admin/UsersPage';
import AdminPrescriptions from './pages/admin/PrescriptionsPage';

// Shared Printable Sheets
import PatientInstructionSheet from './pages/shared/PatientInstructionSheet';

import AppShell from './components/layout/AppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Doctor */}
            <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
              <Route element={<AppShell />}>
                <Route path="/doctor" element={<DoctorDashboard />} />
                <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
                <Route path="/doctor/prescriptions/new" element={<DoctorNewPrescription />} />
                <Route path="/doctor/prescriptions/:id" element={<DoctorPrescriptionDetail />} />
                <Route path="/doctor/prescriptions/:id/print" element={<PatientInstructionSheet />} />
                <Route path="/doctor/patients" element={<DoctorPatients />} />
                <Route path="/doctor/clarifications" element={<DoctorClarifications />} />
                <Route path="/doctor/profile" element={<DoctorProfile />} />
              </Route>
            </Route>

            {/* Patient */}
            <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
              <Route element={<AppShell />}>
                <Route path="/patient" element={<PatientDashboard />} />
                <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
                <Route path="/patient/prescriptions/:id" element={<PatientPrescriptionDetail />} />
                <Route path="/patient/prescriptions/:id/print" element={<PatientInstructionSheet />} />
                <Route path="/patient/schedule" element={<PatientSchedule />} />
                <Route path="/patient/profile" element={<PatientProfile />} />
              </Route>
            </Route>

            {/* Pharmacist */}
            <Route element={<ProtectedRoute allowedRoles={['pharmacist']} />}>
              <Route element={<AppShell />}>
                <Route path="/pharmacist/find" element={<PharmacistFind />} />
                <Route path="/pharmacist/verify/:id" element={<PharmacistVerify />} />
                <Route path="/pharmacist/prescriptions/:id/print" element={<PatientInstructionSheet />} />
                <Route path="/pharmacist/clarifications" element={<PharmacistClarifications />} />
                <Route path="/pharmacist/profile" element={<PharmacistProfile />} />
              </Route>
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<AppShell />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/prescriptions" element={<AdminPrescriptions />} />
              </Route>
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
