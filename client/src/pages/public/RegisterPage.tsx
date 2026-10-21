import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Heart } from 'lucide-react';

type Role = 'doctor' | 'patient' | 'pharmacist';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [role,      setRole]      = useState<Role>('patient');
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [language,  setLanguage]  = useState('en');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  const roleHome: Record<string,string> = {
    doctor: '/doctor', patient: '/patient', pharmacist: '/pharmacist/find'
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await register({ email: email.trim(), password, role, full_name: fullName.trim(), phone: phone || undefined, language });
      navigate(roleHome[role], { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-600 rounded-2xl mb-3">
            <Heart className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MediBridge</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Register</h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-3 gap-2">
                {(['doctor','patient','pharmacist'] as Role[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      role === r
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-teal-300'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Full Name *</label>
              <input className="input" required value={fullName}
                onChange={e => setFullName(e.target.value)} placeholder="Dr. Jane Smith" />
            </div>

            <div>
              <label className="label">Email address *</label>
              <input className="input" type="email" required value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>

            <div>
              <label className="label">Phone number</label>
              <input className="input" type="tel" value={phone}
                onChange={e => setPhone(e.target.value)} placeholder="9876543210" />
            </div>

            <div>
              <label className="label">Preferred Language</label>
              <select className="input" value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
            </div>

            <div>
              <label className="label">Password *</label>
              <input className="input" type="password" required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
