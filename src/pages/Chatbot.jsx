import { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import { aiApi } from '../api/client.js';

const suggestedPrompts = [
  'Which cement grade is best for a G+2 building?',
  'Give me 3 cost-saving tips for construction.',
  'What foundation type suits black cotton soil?',
  'How do I check material quality on site?',
  'What is a realistic construction timeline for 1500 sq ft?',
];

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi, I'm your AI construction assistant. Ask me about materials, costs, foundations, or timelines." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const question = text ?? input;
    if (!question.trim()) return;
    setInput('');
    const nextMessages = [...messages, { role: 'user', text: question }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      const { data } = await aiApi.chat(question, nextMessages);
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: mockReply(question) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Navbar isAuthed />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 flex flex-col">
        <h1 className="font-display text-2xl font-semibold text-blueprint-950 mb-1">AI Construction Chatbot</h1>
        <p className="text-sm text-ink/60 mb-6">Ask about cement, cost-saving tips, foundations, material quality or timelines.</p>

        <div className="card flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 max-h-[52vh]">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-blueprint-900 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-amber-500" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blueprint-700 text-white'
                      : 'bg-blueprint-900/5 text-ink'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-blueprint-700/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blueprint-700" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-blueprint-900 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-amber-500" />
                </div>
                <div className="bg-blueprint-900/5 rounded-xl px-4 py-2.5 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ink/40" />
                  <span className="text-xs text-ink/40">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length === 1 && (
            <div className="px-5 pb-3 flex flex-wrap gap-2">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-xs border border-blueprint-900/15 text-ink/70 hover:border-blueprint-600 hover:text-blueprint-700 rounded-full px-3 py-1.5 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="border-t border-blueprint-900/10 p-3 flex items-center gap-2"
          >
            <input
              className="input-field flex-1"
              placeholder="Ask a construction question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-primary px-4 py-2.5 flex items-center justify-center" disabled={loading}>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function mockReply(question) {
  const q = question.toLowerCase();
  if (q.includes('cement')) return 'For most residential structures, OPC 43 Grade or PPC cement works well — PPC is better for plastering and mass concrete, OPC 43 for structural RCC work.';
  if (q.includes('cost')) return 'Top cost-saving tips: (1) buy cement and steel in bulk directly from dealers, (2) finalize your floor plan before starting to avoid rework, (3) use fly-ash bricks over red clay bricks where locally available.';
  if (q.includes('foundation')) return 'For black cotton or expansive soil, a raft or pile foundation is recommended over an isolated footing, since it resists differential settlement better.';
  if (q.includes('quality')) return 'Check cement for lumps and manufacture date (use within 3 months), steel for uniform ribbing and IS certification mark, and bricks for a clear metallic sound when struck together.';
  if (q.includes('timeline') || q.includes('time')) return 'A typical 1,500 sq ft G+1 home takes about 8–10 months: 1 month for foundation, 3–4 months for structure, and 4–5 months for finishing work.';
  return "I'd normally pull this from the AI backend — once connected, I can give a detailed, project-specific answer here.";
}
