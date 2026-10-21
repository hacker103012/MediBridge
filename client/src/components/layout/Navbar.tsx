import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../ui/NotificationBell';

interface Props {
  onMenuClick: () => void;
}

const roleTitles: Record<string, string> = {
  doctor:     'Doctor Portal',
  patient:    'Patient Portal',
  pharmacist: 'Pharmacist Portal',
  admin:      'Admin Portal',
};

export default function Navbar({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
      {/* Mobile menu button */}
      <button
        className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Title */}
      <span className="text-gray-700 font-semibold text-sm hidden sm:block">
        {user ? roleTitles[user.role] || 'MediBridge' : 'MediBridge'}
      </span>

      <div className="flex-1" />

      {/* Notifications */}
      <NotificationBell />

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        title="Logout"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
