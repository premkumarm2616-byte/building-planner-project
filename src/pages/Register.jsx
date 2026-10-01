import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { authApi } from '../api/client.js';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.register({
        name: form.name.trim(),
        // Store the email normalized so login always matches, whatever the casing.
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      localStorage.setItem('bp_token', data.token);
      localStorage.setItem('bp_user_name', form.name.trim());
      navigate('/dashboard');
    } catch (err) {
      // Backend responded -> show its error. No response -> server is down;
      // say so plainly instead of faking an offline session.
      if (!err?.response) {
        setError('Can\u2019t reach the server on port 8000. Is the backend running? (cd server && npm start)');
      } else {
        setError(err?.response?.data?.message || 'Could not create your account. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blueprint-950 bg-blueprint-grid bg-grid flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 text-white font-display font-semibold text-xl mb-8">
          <Building2 className="w-7 h-7 text-amber-500" /> BuildPlan<span className="text-amber-500">AI</span>
        </Link>

        <div className="card p-8">
          <h1 className="font-display text-xl font-semibold text-blueprint-950 mb-1">Create your account</h1>
          <p className="text-sm text-ink/60 mb-6">Start planning your build in minutes.</p>

          {error && (
            <div className="bg-rebar/10 border border-rebar/30 text-rebar text-sm rounded-lg px-3.5 py-2.5 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input type="text" name="name" required className="input-field" placeholder="Enter Your Full Name"
                value={form.name} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" name="email" required className="input-field" placeholder="you@example.com"
                value={form.email} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" name="password" required className="input-field" placeholder="Min. 8 characters"
                value={form.password} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" name="confirmPassword" required className="input-field" placeholder="Re-enter password"
                value={form.confirmPassword} onChange={handleChange} />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Register'}
            </button>
          </form>

          <p className="text-sm text-center text-ink/60 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blueprint-700 font-semibold hover:text-amber-600">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
