import { Link } from 'react-router-dom';
import {
  Ruler, Sparkles, Wallet, Package, LayoutGrid, MessageSquareText, ArrowRight,
} from 'lucide-react';
import Navbar from '../components/Navbar.jsx';

const features = [
  { icon: Ruler, title: 'Plot Intelligence', desc: 'Enter plot size, shape and facing direction — get a build-ready layout in return.' },
  { icon: Sparkles, title: 'AI Room Planning', desc: 'AI-recommended room sizes, arrangement and ventilation, with optional Vastu alignment.' },
  { icon: Wallet, title: 'Cost Estimation', desc: 'Line-item costs for foundation, cement, steel, bricks, labour, electrical and plumbing.' },
  { icon: Package, title: 'Material Quantities', desc: 'Cement bags, bricks, steel, sand, aggregate, tiles and paint — quantified automatically.' },
  { icon: LayoutGrid, title: '2D Floor Plan', desc: 'A generated layout of every room, staircase and parking space on your plot.' },
  { icon: MessageSquareText, title: 'Construction Chatbot', desc: 'Ask about cement grades, cost-saving tips, foundation advice and timelines, any time.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar isAuthed={false} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-blueprint-950 text-white">
        <div className="absolute inset-0 bg-blueprint-grid bg-grid opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blueprint-950/60 to-blueprint-950" />
        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28">
          <p className="font-mono text-amber-500 text-sm tracking-widest mb-4">
            PLOT → PLAN → ESTIMATE → BUILD
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-semibold leading-tight max-w-3xl">
            Turn a bare plot into a costed, AI‑generated construction plan.
          </h1>
          <p className="text-blueprint-200 text-lg mt-6 max-w-2xl">
            Enter your plot dimensions and requirements. BuildPlanAI generates room
            layouts, a 2D floor plan, material quantities and a full cost estimate —
            then packages it into a report you can hand to your contractor.
          </p>
          <div className="flex flex-wrap gap-4 mt-10">
            <Link to="/register" className="btn-primary flex items-center gap-2">
              Create Your Plan <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="border border-blueprint-400 text-blueprint-200 hover:text-white hover:border-white px-5 py-2.5 rounded-lg font-medium transition-colors">
              I already have an account
            </Link>
          </div>

          {/* Dimension-line strip echoing an architectural drawing */}
          <div className="mt-16 flex items-center gap-3 text-blueprint-400 font-mono text-xs">
            <span className="dim-line px-2">40 ft plot width</span>
            <span className="flex-1 border-t border-dashed border-blueprint-700" />
            <span className="dim-line px-2">60 ft plot length</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-blueprint-950 mb-2">
          Everything from first sketch to final estimate
        </h2>
        <p className="text-ink/60 mb-12">Eleven tools, one workflow — no separate spreadsheets or drafting software.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="w-10 h-10 rounded-lg bg-blueprint-900 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-display font-semibold text-blueprint-950 mb-1.5">{title}</h3>
              <p className="text-sm text-ink/60 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blueprint-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl font-semibold">Ready to plan your build?</h3>
            <p className="text-blueprint-200 mt-1">It takes about five minutes to generate your first plan.</p>
          </div>
          <Link to="/register" className="btn-primary whitespace-nowrap">Get Started Free</Link>
        </div>
      </section>

      <footer className="bg-blueprint-950 text-blueprint-400 text-xs text-center py-6">
        © {new Date().getFullYear()} BuildPlanAI. All estimates are indicative and subject to site conditions.
      </footer>
    </div>
  );
}
