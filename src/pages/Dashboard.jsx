import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, MessageSquareText, ArrowUpRight, Building2 } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { projectApi } from '../api/client.js';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const userName = localStorage.getItem('bp_user_name') || 'there';

  useEffect(() => {
    projectApi
      .list()
      .then(({ data }) => setProjects(data))
      .catch(() => setProjects(mockProjects)) // fallback sample data for demo/dev
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Navbar isAuthed />

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome card */}
        <div className="card bg-blueprint-900 text-white p-8 mb-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-blueprint-grid bg-grid opacity-20" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="font-mono text-amber-500 text-xs tracking-widest mb-2">DASHBOARD</p>
              <h1 className="font-display text-2xl font-semibold">Welcome back, {userName}</h1>
              <p className="text-blueprint-200 text-sm mt-1">
                You have {projects.length} project{projects.length !== 1 ? 's' : ''} in progress.
              </p>
            </div>
            <Link to="/project/new/plot-details" className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Create New Plan
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Previous projects */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg text-blueprint-950">Previous Projects</h2>
              <Link to="/project/new/plot-details" className="text-xs font-medium text-blueprint-700 hover:text-amber-600">
                + New
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-ink/50">Loading projects…</p>
            ) : projects.length === 0 ? (
              <div className="card p-10 text-center">
                <Building2 className="w-8 h-8 text-blueprint-900/30 mx-auto mb-3" />
                <p className="text-sm text-ink/60">No projects yet. Create your first plan to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/project/${p.id}/plot-details`}
                    className="card p-5 flex items-center justify-between hover:border-blueprint-600 transition-colors group"
                  >
                    <div>
                      <p className="font-semibold text-blueprint-950">{p.name}</p>
                      <p className="text-xs text-ink/50 mt-0.5 font-mono">
                        {p.plotLength}×{p.plotWidth} ft · {p.floors} floor{p.floors > 1 ? 's' : ''} · Updated {p.updatedAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(p.status)}`}>
                        {p.status}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-blueprint-900/30 group-hover:text-blueprint-700" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: recent reports + AI assistant */}
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="font-display font-semibold text-blueprint-950 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blueprint-700" /> Recent Reports
              </h3>
              {projects.filter((p) => p.status === 'Completed').length === 0 ? (
                <p className="text-xs text-ink/50">Completed plans will show their PDF reports here.</p>
              ) : (
                <ul className="space-y-2">
                  {projects.filter((p) => p.status === 'Completed').map((p) => (
                    <li key={p.id}>
                      <Link to={`/project/${p.id}/report`} className="text-sm text-blueprint-700 hover:text-amber-600 font-medium">
                        {p.name} — Report.pdf
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link to="/chatbot" className="card p-5 flex items-start gap-3 hover:border-blueprint-600 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-blueprint-900 flex items-center justify-center shrink-0">
                <MessageSquareText className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-blueprint-950 text-sm">AI Construction Assistant</p>
                <p className="text-xs text-ink/50 mt-0.5">Ask about materials, cost or timelines.</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function statusColor(status) {
  switch (status) {
    case 'Completed': return 'bg-blueprint-700/10 text-blueprint-700';
    case 'In Progress': return 'bg-amber-500/15 text-amber-600';
    default: return 'bg-ink/10 text-ink/60';
  }
}

const mockProjects = [
  { id: 'p1', name: 'Rajesh Residence — G+2', plotLength: 40, plotWidth: 30, floors: 2, status: 'Completed', updatedAt: '2 days ago' },
  { id: 'p2', name: 'Corner Plot Villa', plotLength: 60, plotWidth: 40, floors: 1, status: 'In Progress', updatedAt: 'Today' },
];
