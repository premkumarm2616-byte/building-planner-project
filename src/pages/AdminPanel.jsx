import { useEffect, useState } from 'react';
import { Users, FolderKanban, DollarSign, BarChart3, Trash2, Save } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { adminApi } from '../api/client.js';

const tabs = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'prices', label: 'Material Prices', icon: DollarSign },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState(mockUsers);
  const [projects, setProjects] = useState(mockProjects);
  const [prices, setPrices] = useState(mockPrices);
  const [analytics] = useState(mockAnalytics);

  useEffect(() => {
    adminApi.users().then(({ data }) => setUsers(data)).catch(() => {});
    adminApi.projects().then(({ data }) => setProjects(data)).catch(() => {});
    adminApi.materialPrices().then(({ data }) => setPrices(data)).catch(() => {});
  }, []);

  const deleteUser = async (id) => {
    setUsers((u) => u.filter((x) => x.id !== id));
    adminApi.deleteUser(id).catch(() => {});
  };

  const updatePrice = (id, value) => {
    setPrices((p) => p.map((x) => (x.id === id ? { ...x, price: value } : x)));
  };

  const savePrice = (id) => {
    const item = prices.find((x) => x.id === id);
    adminApi.updateMaterialPrice(id, { price: item.price }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-paper">
      <Navbar isAuthed />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-blueprint-950 mb-1">Admin Panel</h1>
        <p className="text-sm text-ink/60 mb-8">Manage users, projects, material pricing and platform analytics.</p>

        <div className="flex gap-1 border-b border-blueprint-900/10 mb-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-amber-500 text-blueprint-950' : 'border-transparent text-ink/50 hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blueprint-900 text-white text-left">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Projects</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blueprint-900/10">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-blueprint-900/5">
                    <td className="px-5 py-3.5 font-medium text-ink">{u.name}</td>
                    <td className="px-5 py-3.5 text-ink/60">{u.email}</td>
                    <td className="px-5 py-3.5 text-ink/60 font-mono text-xs">{u.joined}</td>
                    <td className="px-5 py-3.5 text-ink/60">{u.projects}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => deleteUser(u.id)} className="text-rebar hover:text-rebar/70 inline-flex items-center gap-1 text-xs font-medium">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'projects' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blueprint-900 text-white text-left">
                  <th className="px-5 py-3 font-medium">Project</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Plot Size</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blueprint-900/10">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-blueprint-900/5">
                    <td className="px-5 py-3.5 font-medium text-ink">{p.name}</td>
                    <td className="px-5 py-3.5 text-ink/60">{p.owner}</td>
                    <td className="px-5 py-3.5 text-ink/60 font-mono text-xs">{p.plotSize}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blueprint-700/10 text-blueprint-700">{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'prices' && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blueprint-900 text-white text-left">
                  <th className="px-5 py-3 font-medium">Material</th>
                  <th className="px-5 py-3 font-medium">Unit</th>
                  <th className="px-5 py-3 font-medium">Price (₹)</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blueprint-900/10">
                {prices.map((m) => (
                  <tr key={m.id} className="hover:bg-blueprint-900/5">
                    <td className="px-5 py-3.5 font-medium text-ink">{m.name}</td>
                    <td className="px-5 py-3.5 text-ink/60">{m.unit}</td>
                    <td className="px-5 py-3.5">
                      <input
                        type="number"
                        value={m.price}
                        onChange={(e) => updatePrice(m.id, Number(e.target.value))}
                        className="input-field w-28 py-1.5"
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => savePrice(m.id)} className="text-blueprint-700 hover:text-amber-600 inline-flex items-center gap-1 text-xs font-medium">
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="grid sm:grid-cols-3 gap-6">
            {analytics.map((a) => (
              <div key={a.label} className="card p-6">
                <p className="text-xs uppercase tracking-wide text-ink/50 font-semibold mb-2">{a.label}</p>
                <p className="font-display text-3xl font-semibold text-blueprint-950">{a.value}</p>
                <p className="text-xs text-blueprint-700 mt-1">{a.change}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const mockUsers = [
  { id: 1, name: 'Premkumar S', email: 'prem@example.com', joined: '2026-06-01', projects: 2 },
  { id: 2, name: 'Anita Rao', email: 'anita@example.com', joined: '2026-06-15', projects: 1 },
  { id: 3, name: 'Suresh Kumar', email: 'suresh@example.com', joined: '2026-07-02', projects: 3 },
];

const mockProjects = [
  { id: 1, name: 'Rajesh Residence — G+2', owner: 'Premkumar S', plotSize: '40×30 ft', status: 'Completed' },
  { id: 2, name: 'Corner Plot Villa', owner: 'Anita Rao', plotSize: '60×40 ft', status: 'In Progress' },
];

const mockPrices = [
  { id: 1, name: 'Cement (per bag)', unit: '50kg', price: 420 },
  { id: 2, name: 'Steel (per tonne)', unit: 'tonne', price: 62000 },
  { id: 3, name: 'Bricks (per 1000)', unit: '1000 nos', price: 6500 },
  { id: 4, name: 'Sand (per cu ft)', unit: 'cu ft', price: 55 },
];

const mockAnalytics = [
  { label: 'Total Users', value: '128', change: '+12 this month' },
  { label: 'Total Projects', value: '214', change: '+34 this month' },
  { label: 'Avg. Est. Cost', value: '₹28.4L', change: 'across all projects' },
];
