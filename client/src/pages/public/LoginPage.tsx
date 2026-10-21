import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Heart } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const roleHome: Record<string,string> = {
    doctor: '/doctor', patient: '/patient', pharmacist: '/pharmacist/find', admin: '/admin'
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email.trim(), password);
      // AuthContext stores user in state; re-read from localStorage decoded role won't work
      // We let ProtectedRoute redirect but we need the role — read from response
      // Actually the user is set in context, navigate based on role
      const stored = JSON.parse(atob(localStorage.getItem('mb_access_token')?.split('.')[1] || 'e30='));
      navigate(roleHome[stored.role] || '/login', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const fillDemo = (email: string) => {
    setEmail(email);
    setPassword('Demo@1234');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-600 rounded-2xl mb-3">
            <Heart className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MediBridge</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time Medication Verification Platform</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal-600 font-medium hover:underline">Register</Link>
          </p>
        </div>

        {/* Demo credentials quick-fill */}
        <div className="mt-6 card">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Demo accounts (click to fill)</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '👨‍⚕️ Doctor', email: 'dr.sharma@medibridge.demo' },
              { label: '🏥 Patient', email: 'ravi.patient@medibridge.demo' },
              { label: '💊 Pharmacist', email: 'pharmacist@medibridge.demo' },
              { label: '🛡️ Admin', email: 'admin@medibridge.demo' },
            ].map(d => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d.email)}
                className="text-left text-xs px-3 py-2 bg-gray-50 hover:bg-teal-50 border border-gray-200 hover:border-teal-200 rounded-lg transition-colors"
              >
                <span className="font-medium text-gray-700">{d.label}</span>
                <br />
                <span className="text-gray-400 font-mono text-[10px]">{d.email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-300 mt-2 text-center">Password: Demo@1234</p>
        </div>
      </div>
    </div>
  );
}
