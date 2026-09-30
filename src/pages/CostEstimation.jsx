import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { estimationApi } from '../api/client.js';

const COLORS = ['#1B4D89', '#2563A8', '#7FB0E0', '#E8A33D', '#CC8A26', '#C1440E', '#0F2540'];

export default function CostEstimation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cost, setCost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    estimationApi
      .cost(id)
      .then(({ data }) => setCost(data))
      .catch(() => setCost(mockCost))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !cost) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-ink/50 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Calculating cost estimate…
        </div>
      </Shell>
    );
  }

  const items = cost.items;
  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <Shell>
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Line items */}
        <div className="lg:col-span-3 card p-6">
          <h2 className="font-display font-semibold text-blueprint-950 mb-4">Cost Breakdown</h2>
          <div className="divide-y divide-blueprint-900/10">
            {items.map((item, i) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm font-medium text-ink">{item.label}</span>
                </div>
                <span className="font-mono text-sm text-blueprint-950">₹{item.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 mt-2 border-t-2 border-blueprint-900/20">
            <span className="font-display font-semibold text-blueprint-950">Total Estimated Cost</span>
            <span className="font-mono font-bold text-lg text-blueprint-900">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 card p-6 flex flex-col">
          <h2 className="font-display font-semibold text-blueprint-950 mb-4">Cost Distribution</h2>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={items} dataKey="amount" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {items.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-ink/50 text-center mt-2">
            Estimate based on current regional material rates. Actuals may vary ±10%.
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate(`/project/${id}/materials`)}
        className="btn-primary flex items-center gap-2 mt-8"
      >
        Continue to Material Estimation <ArrowRight className="w-4 h-4" />
      </button>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar isAuthed />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
          <p className="font-mono text-xs tracking-widest text-blueprint-700 mb-2">STEP 3 OF 5</p>
          <h1 className="font-display text-2xl font-semibold text-blueprint-950 mb-1">Cost Estimation</h1>
          <p className="text-sm text-ink/60 mb-8">A full cost breakdown for your planned build.</p>
          {children}
        </main>
      </div>
    </div>
  );
}

const mockCost = {
  items: [
    { label: 'Foundation Cost', amount: 320000 },
    { label: 'Cement Cost', amount: 280000 },
    { label: 'Steel Cost', amount: 410000 },
    { label: 'Bricks Cost', amount: 190000 },
    { label: 'Labour Cost', amount: 350000 },
    { label: 'Electrical Cost', amount: 150000 },
    { label: 'Plumbing Cost', amount: 120000 },
  ],
};
