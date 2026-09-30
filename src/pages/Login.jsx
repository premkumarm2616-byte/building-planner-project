import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { authApi } from '../api/client.js';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Normalize the email so casing / stray spaces can't cause a false mismatch.
    const payload = { email: form.email.trim().toLowerCase(), password: form.password };
    try {
      const { data } = await authApi.login(payload);
      localStorage.setItem('bp_token', data.token);
      localStorage.setItem('bp_user_name', data?.user?.name || payload.email.split('@')[0]);
      navigate('/dashboard');
    } catch (err) {
      // Backend responded with an error -> show it (e.g. wrong password).
      // No response at all -> the server is down; say so plainly instead of
      // silently faking a login (which used to hide the real problem).
      if (!err?.response) {
        setError('Can\u2019t reach the server on port 8000. Is the backend running? (cd server && npm start)');
      } else {
        setError(err?.response?.data?.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blueprint-950 bg-blueprint-grid bg-grid flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 text-white font-display font-semibold text-xl mb-8">
          <Building2 className="w-7 h-7 text-amber-500" /> BuildPlan<span className="text-amber-500">AI</span>
        </Link>

        <div className="card p-8">
          <h1 className="font-display text-xl font-semibold text-blueprint-950 mb-1">Welcome back</h1>
          <p className="text-sm text-ink/60 mb-6">Log in to continue planning your build.</p>

          {error && (
            <div className="bg-rebar/10 border border-rebar/30 text-rebar text-sm rounded-lg px-3.5 py-2.5 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email" name="email" required
                className="input-field" placeholder="you@example.com"
                value={form.email} onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password" name="password" required
                className="input-field" placeholder="••••••••"
                value={form.password} onChange={handleChange}
              />
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-blueprint-700 hover:text-amber-600 font-medium">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>

          <p className="text-sm text-center text-ink/60 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blueprint-700 font-semibold hover:text-amber-600">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
