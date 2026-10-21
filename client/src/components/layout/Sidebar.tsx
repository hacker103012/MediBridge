import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, MessageSquare, User,
  Search, CheckSquare, Package, ShieldCheck, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function getDoctorNav(): NavItem[] {
  return [
    { to: '/doctor',                 label: 'Dashboard',        icon: <LayoutDashboard size={18} /> },
    { to: '/doctor/prescriptions',   label: 'Prescriptions',    icon: <FileText size={18} /> },
    { to: '/doctor/patients',        label: 'My Patients',      icon: <Users size={18} /> },
    { to: '/doctor/clarifications',  label: 'Clarifications',   icon: <MessageSquare size={18} /> },
    { to: '/doctor/profile',         label: 'My Profile',       icon: <User size={18} /> },
  ];
}
function getPatientNav(): NavItem[] {
  return [
    { to: '/patient',                label: 'Dashboard',        icon: <LayoutDashboard size={18} /> },
    { to: '/patient/prescriptions',  label: 'Prescriptions',    icon: <FileText size={18} /> },
    { to: '/patient/schedule',       label: 'Medication Schedule', icon: <CheckSquare size={18} /> },
    { to: '/patient/profile',        label: 'My Profile',       icon: <User size={18} /> },
  ];
}
function getPharmacistNav(): NavItem[] {
  return [
    { to: '/pharmacist/find',          label: 'Find Prescription', icon: <Search size={18} /> },
    { to: '/pharmacist/clarifications',label: 'Clarifications',    icon: <MessageSquare size={18} /> },
    { to: '/pharmacist/profile',       label: 'My Profile',        icon: <User size={18} /> },
  ];
}
function getAdminNav(): NavItem[] {
  return [
    { to: '/admin',                  label: 'Dashboard',        icon: <LayoutDashboard size={18} /> },
    { to: '/admin/users',            label: 'Users',            icon: <ShieldCheck size={18} /> },
    { to: '/admin/prescriptions',    label: 'All Prescriptions',icon: <Package size={18} /> },
  ];
}

function getNav(role: string): NavItem[] {
  switch (role) {
    case 'doctor':     return getDoctorNav();
    case 'patient':    return getPatientNav();
    case 'pharmacist': return getPharmacistNav();
    case 'admin':      return getAdminNav();
    default:           return [];
  }
}

const roleColors: Record<string, string> = {
  doctor:     'bg-teal-600',
  patient:    'bg-blue-600',
  pharmacist: 'bg-purple-600',
  admin:      'bg-red-600',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  const { user } = useAuth();
  const location  = useLocation();

  if (!user) return null;

  const navItems  = getNav(user.role);
  const roleColor = roleColors[user.role] || 'bg-teal-600';

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('px-5 py-4 flex items-center gap-2', roleColor)}>
        <span className="text-white font-bold text-lg tracking-tight">MediBridge</span>
        <span className="ml-auto text-white/70 text-xs capitalize border border-white/30 rounded px-1.5 py-0.5">
          {user.role}
        </span>
        <button
          className="lg:hidden ml-2 text-white/80 hover:text-white"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.to ||
            (item.to !== '/doctor' && item.to !== '/patient' && item.to !== '/admin' &&
             location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <span className={isActive ? 'text-teal-600' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 px-4 py-3">
        <p className="text-sm font-medium text-gray-800 truncate">{user.full_name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-white border-r border-gray-100 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
