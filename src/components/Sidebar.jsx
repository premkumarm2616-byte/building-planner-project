import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Ruler,
  Sparkles,
  Wallet,
  Package,
  LayoutGrid,
  MessageSquareText,
  FileDown,
} from 'lucide-react';

const steps = [
  { label: 'Plot Details', icon: Ruler, path: (id) => `/project/${id}/plot-details` },
  { label: 'AI Suggestions', icon: Sparkles, path: (id) => `/project/${id}/ai-suggestions` },
  { label: 'Cost Estimation', icon: Wallet, path: (id) => `/project/${id}/cost-estimation` },
  { label: 'Material Estimation', icon: Package, path: (id) => `/project/${id}/materials` },
  { label: '2D Floor Plan', icon: LayoutGrid, path: (id) => `/project/${id}/floor-plan` },
  { label: 'AI Chatbot', icon: MessageSquareText, path: () => `/chatbot` },
  { label: 'PDF Report', icon: FileDown, path: (id) => `/project/${id}/report` },
];

export default function Sidebar() {
  const { id = 'new' } = useParams();

  return (
    <aside className="w-64 shrink-0 bg-blueprint-900 min-h-[calc(100vh-4rem)] text-blueprint-200 px-4 py-6 hidden lg:block">
      <NavLink
        to="/dashboard"
        className="flex items-center gap-2 text-sm text-blueprint-400 hover:text-white mb-6 font-medium"
      >
        <LayoutDashboard className="w-4 h-4" /> Back to Dashboard
      </NavLink>

      <p className="dim-line text-xs uppercase tracking-widest text-amber-500 font-mono mb-4 px-1">
        Project Workflow
      </p>

      <nav className="space-y-1">
        {steps.map(({ label, icon: Icon, path }, i) => (
          <NavLink
            key={label}
            to={path(id)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blueprint-700 text-white'
                  : 'hover:bg-blueprint-800 text-blueprint-200'
              }`
            }
          >
            <span className="font-mono text-xs text-blueprint-400 w-4">{i + 1}</span>
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
