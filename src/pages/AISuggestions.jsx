import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Wind, Compass, Ruler, ArrowRight, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { projectApi } from '../api/client.js';

export default function AISuggestions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectApi
      .get(id)
      .then((res) => setData(res.data.aiSuggestions))
      .catch(() => setData(mockSuggestions))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-paper">
      <Navbar isAuthed />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full">
          <p className="font-mono text-xs tracking-widest text-blueprint-700 mb-2">STEP 2 OF 5</p>
          <h1 className="font-display text-2xl font-semibold text-blueprint-950 mb-1">AI Suggestions</h1>
          <p className="text-sm text-ink/60 mb-8">Room sizing and arrangement recommendations generated for your plot.</p>

          {loading ? (
            <div className="flex items-center gap-2 text-ink/50 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading recommendations…
            </div>
          ) : (
            <div className="space-y-8">
              {/* Room sizes */}
              <section className="card p-6">
                <h2 className="font-display font-semibold text-blueprint-950 mb-4 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-blueprint-700" /> Recommended Room Sizes
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {data.roomSizes.map((r) => (
                    <div key={r.name} className="flex items-center justify-between border border-blueprint-900/10 rounded-lg px-4 py-3">
                      <span className="text-sm font-medium text-ink">{r.name}</span>
                      <span className="dim-line px-2 font-mono text-sm text-blueprint-700">{r.size}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Arrangement + optimization */}
              <div className="grid md:grid-cols-2 gap-6">
                <section className="card p-6">
                  <h2 className="font-display font-semibold text-blueprint-950 mb-3">Room Arrangement</h2>
                  <p className="text-sm text-ink/70 leading-relaxed">{data.arrangement}</p>
                </section>
                <section className="card p-6">
                  <h2 className="font-display font-semibold text-blueprint-950 mb-3">Space Optimization</h2>
                  <ul className="space-y-2">
                    {data.optimizationTips.map((tip, i) => (
                      <li key={i} className="text-sm text-ink/70 flex gap-2">
                        <span className="text-amber-600 font-mono">{String(i + 1).padStart(2, '0')}</span> {tip}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Ventilation */}
              <section className="card p-6">
                <h2 className="font-display font-semibold text-blueprint-950 mb-3 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-blueprint-700" /> Ventilation Suggestions
                </h2>
                <p className="text-sm text-ink/70 leading-relaxed">{data.ventilation}</p>
              </section>

              {/* Vastu */}
              <section className="card p-6 border-amber-500/40 bg-amber-500/5">
                <h2 className="font-display font-semibold text-blueprint-950 mb-3 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-600" /> Vastu / Feng Shui Notes <span className="text-xs font-normal text-ink/50">(optional)</span>
                </h2>
                <ul className="space-y-1.5">
                  {data.vastuNotes.map((note, i) => (
                    <li key={i} className="text-sm text-ink/70">• {note}</li>
                  ))}
                </ul>
              </section>

              <button
                onClick={() => navigate(`/project/${id}/cost-estimation`)}
                className="btn-primary flex items-center gap-2"
              >
                Continue to Cost Estimation <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const mockSuggestions = {
  roomSizes: [
    { name: 'Living Room', size: '16 × 14 ft' },
    { name: 'Master Bedroom', size: '14 × 12 ft' },
    { name: 'Bedroom 2', size: '12 × 10 ft' },
    { name: 'Kitchen', size: '10 × 10 ft' },
    { name: 'Bathroom', size: '8 × 5 ft' },
    { name: 'Balcony', size: '10 × 4 ft' },
  ],
  arrangement: 'Living room placed at the entrance for guest access without crossing private zones. Bedrooms grouped on the quieter rear side, kitchen adjacent to the dining area with direct external ventilation.',
  optimizationTips: [
    'Combine dining and living into one open zone to save 60–80 sq ft.',
    'Use a under-staircase storage unit instead of a separate utility room.',
    'Sliding doors for the balcony save swing clearance of ~6 sq ft.',
  ],
  ventilation: 'Cross-ventilation achieved by placing windows on opposite walls in the living room and both bedrooms. Kitchen exhaust vented externally on the north wall to avoid heat buildup.',
  vastuNotes: [
    'Kitchen positioned in the South-East corner (Agni zone).',
    'Main entrance aligned to the North for favorable energy flow.',
    'Master bedroom placed in the South-West for stability.',
  ],
};
