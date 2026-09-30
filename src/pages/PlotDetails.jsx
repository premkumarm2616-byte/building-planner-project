import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Sparkles, Loader2, Minus, Plus } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { aiApi, projectApi } from '../api/client.js';

const initialForm = {
  plotLength: '',
  plotWidth: '',
  plotShape: 'Rectangular',
  floors: 1,
  facing: 'North',
  budget: '',
  bedrooms: 2,
  bathrooms: 2,
  kitchen: 1,
  parking: true,
  garden: false,
  balcony: true,
};

export default function PlotDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const stepper = (key, min = 0, max = 10) => (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => update(key, Math.max(min, form[key] - 1))}
        className="w-9 h-9 rounded-lg border border-blueprint-900/20 flex items-center justify-center hover:bg-blueprint-900/5">
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-8 text-center font-mono font-semibold">{form[key]}</span>
      <button type="button" onClick={() => update(key, Math.min(max, form[key] + 1))}
        className="w-9 h-9 rounded-lg border border-blueprint-900/20 flex items-center justify-center hover:bg-blueprint-900/5">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.plotLength || !form.plotWidth || !form.budget) {
      setError('Please fill in plot dimensions and budget.');
      return;
    }
    setLoading(true);
    try {
      const projectId = id === 'new' ? (await projectApi.create(form)).data.id : id;
      await aiApi.generatePlan({ projectId, ...form });
      navigate(`/project/${projectId}/ai-suggestions`);
    } catch (err) {
      setError('Could not generate the plan right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Navbar isAuthed />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 max-w-3xl mx-auto px-6 py-10 w-full">
          <p className="font-mono text-xs tracking-widest text-blueprint-700 mb-2">STEP 1 OF 5</p>
          <h1 className="font-display text-2xl font-semibold text-blueprint-950 mb-1">Plot Details</h1>
          <p className="text-sm text-ink/60 mb-8">Tell us about your plot and requirements — the AI uses this to generate your plan.</p>

          {error && (
            <div className="bg-rebar/10 border border-rebar/30 text-rebar text-sm rounded-lg px-3.5 py-2.5 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Dimensions */}
            <section className="card p-6">
              <h2 className="font-display font-semibold text-blueprint-950 mb-4">Plot Dimensions</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Plot Length (ft)</label>
                  <input type="number" min="1" required className="input-field"
                    value={form.plotLength} onChange={(e) => update('plotLength', e.target.value)} />
                </div>
                <div>
                  <label className="label">Plot Width (ft)</label>
                  <input type="number" min="1" required className="input-field"
                    value={form.plotWidth} onChange={(e) => update('plotWidth', e.target.value)} />
                </div>
                <div>
                  <label className="label">Plot Shape</label>
                  <select className="input-field" value={form.plotShape} onChange={(e) => update('plotShape', e.target.value)}>
                    <option>Rectangular</option>
                    <option>Square</option>
                    <option>L-Shaped</option>
                    <option>Corner Plot</option>
                    <option>Irregular</option>
                  </select>
                </div>
              </div>

              {form.plotLength && form.plotWidth && (
                <p className="dim-line inline-block mt-4 px-2 font-mono text-xs text-blueprint-700 bg-blueprint-700/5 rounded">
                  Plot area: {(form.plotLength * form.plotWidth).toLocaleString()} sq ft
                </p>
              )}
            </section>

            {/* Structure */}
            <section className="card p-6">
              <h2 className="font-display font-semibold text-blueprint-950 mb-4">Structure</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Number of Floors</label>
                  <select className="input-field" value={form.floors} onChange={(e) => update('floors', Number(e.target.value))}>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Floor' : 'Floors'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Facing Direction</label>
                  <select className="input-field" value={form.facing} onChange={(e) => update('facing', e.target.value)}>
                    {['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Budget (₹)</label>
                  <input type="number" min="0" required className="input-field" placeholder="e.g. 3500000"
                    value={form.budget} onChange={(e) => update('budget', e.target.value)} />
                </div>
              </div>
            </section>

            {/* Rooms */}
            <section className="card p-6">
              <h2 className="font-display font-semibold text-blueprint-950 mb-4">Rooms & Requirements</h2>
              <div className="grid sm:grid-cols-2 gap-y-5 gap-x-8">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Bedrooms</span>
                  {stepper('bedrooms', 1, 8)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Bathrooms</span>
                  {stepper('bathrooms', 1, 8)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Kitchen</span>
                  {stepper('kitchen', 1, 3)}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-blueprint-900/10">
                {['parking', 'garden', 'balcony'].map((key) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox" checked={form[key]}
                      onChange={(e) => update(key, e.target.checked)}
                      className="w-4 h-4 rounded accent-blueprint-700"
                    />
                    <span className="text-sm font-medium text-ink capitalize">{key}</span>
                  </label>
                ))}
              </div>
            </section>

            <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 px-8">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Generating your plan…' : 'Generate AI Plan'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
