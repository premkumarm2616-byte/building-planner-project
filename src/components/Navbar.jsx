import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogOut } from 'lucide-react';

export default function Navbar({ isAuthed }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('bp_token');
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-40 bg-blueprint-950 border-b border-blueprint-700/40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white font-display font-semibold text-lg">
          <Building2 className="w-6 h-6 text-amber-500" strokeWidth={2} />
          BuildPlan<span className="text-amber-500">AI</span>
        </Link>

        {isAuthed ? (
          <div className="flex items-center gap-6 text-sm">
            <Link to="/dashboard" className="text-blueprint-200 hover:text-white transition-colors">Dashboard</Link>
            <Link to="/chatbot" className="text-blueprint-200 hover:text-white transition-colors">AI Assistant</Link>
            <Link to="/admin" className="text-blueprint-200 hover:text-white transition-colors">Admin</Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-blueprint-200 hover:text-rebar transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-blueprint-200 hover:text-white text-sm font-medium transition-colors">
              Login
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
