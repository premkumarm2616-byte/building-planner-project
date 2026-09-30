import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2, Package } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { estimationApi } from '../api/client.js';

export default function MaterialEstimation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [materials, setMaterials] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    estimationApi
      .materials(id)
      .then(({ data }) => setMaterials(data))
      .catch(() => setMaterials(mockMaterials))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-paper">
      <Navbar isAuthed />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full">
          <p className="font-mono text-xs tracking-widest text-blueprint-700 mb-2">STEP 4 OF 5</p>
          <h1 className="font-display text-2xl font-semibold text-blueprint-950 mb-1">Material Estimation</h1>
          <p className="text-sm text-ink/60 mb-8">Estimated material quantities required for construction.</p>

          {loading ? (
            <div className="flex items-center gap-2 text-ink/50 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Calculating quantities…
            </div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blueprint-900 text-white text-left">
                      <th className="px-5 py-3 font-medium">Material</th>
                      <th className="px-5 py-3 font-medium text-right">Estimated Quantity</th>
                      <th className="px-5 py-3 font-medium text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blueprint-900/10">
                    {materials.map((m) => (
                      <tr key={m.name} className="hover:bg-blueprint-900/5">
                        <td className="px-5 py-3.5 flex items-center gap-2.5 font-medium text-ink">
                          <Package className="w-4 h-4 text-blueprint-700" /> {m.name}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-blueprint-950">{m.quantity.toLocaleString('en-IN')}</td>
                        <td className="px-5 py-3.5 text-right text-ink/60">{m.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink/50 mt-3">
                Quantities are calculated from plot area, floor count and structural type. Actual site wastage typically adds 3–5%.
              </p>

              <button
                onClick={() => navigate(`/project/${id}/floor-plan`)}
                className="btn-primary flex items-center gap-2 mt-8"
              >
                Continue to 2D Floor Plan <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const mockMaterials = [
  { name: 'Cement Bags', quantity: 420, unit: 'bags (50kg)' },
  { name: 'Bricks', quantity: 28500, unit: 'nos' },
  { name: 'Steel (TMT)', quantity: 3.2, unit: 'tonnes' },
  { name: 'Sand', quantity: 950, unit: 'cu ft' },
  { name: 'Aggregate', quantity: 780, unit: 'cu ft' },
  { name: 'Tiles', quantity: 1650, unit: 'sq ft' },
  { name: 'Paint', quantity: 65, unit: 'litres' },
];
