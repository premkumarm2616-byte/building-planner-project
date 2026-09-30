import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2, MailCheck } from 'lucide-react';
import { authApi } from '../api/client.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      // Backend unreachable -> still show the confirmation screen in demo mode.
      if (!err?.response) {
        setSent(true);
        return;
      }
      setError(err?.response?.data?.message || 'Could not send reset link. Try again.');
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
          {sent ? (
            <div className="text-center py-4">
              <MailCheck className="w-10 h-10 text-blueprint-700 mx-auto mb-3" />
              <h1 className="font-display text-lg font-semibold text-blueprint-950 mb-1">Check your inbox</h1>
              <p className="text-sm text-ink/60">
                If an account exists for <span className="font-medium text-ink">{email}</span>, a reset link is on its way.
              </p>
              <Link to="/login" className="inline-block mt-6 text-blueprint-700 font-semibold text-sm hover:text-amber-600">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold text-blueprint-950 mb-1">Reset your password</h1>
              <p className="text-sm text-ink/60 mb-6">Enter your email and we'll send you a reset link.</p>

              {error && (
                <div className="bg-rebar/10 border border-rebar/30 text-rebar text-sm rounded-lg px-3.5 py-2.5 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email" required className="input-field" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-sm text-center text-ink/60 mt-6">
                <Link to="/login" className="text-blueprint-700 font-semibold hover:text-amber-600">
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
