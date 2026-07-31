import { useState, useRef, useEffect } from 'react';
import { useThemeStore } from '../store/theme-store.js';

interface ContextVersion {
  hash: string;
  generatedAt: string;
  tenantId: string;
  orderCount: number;
  oeeRecordCount: number;
  qualityRecordCount: number;
  workblockCount: number;
}

interface AskResponse {
  success: boolean;
  answer: string;
  engine: string;
  contextVersion: ContextVersion;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  engine?: string;
  contextVersion?: string;
}

const suggestedQuestions = [
  '¿Cuántas órdenes están activas?',
  '¿Cuál es el OEE promedio de la planta?',
  '¿Hay incidencias de calidad recientes?',
  '¿Qué puesto tiene más producción?',
];

export function AiAdvisorChat() {
  const theme = useThemeStore((s) => s.theme);
  const isClassic = theme === 'classic';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const token = localStorage.getItem('kavana_dev_token') || 'mock-token';
      const res = await fetch('/api/ai-advisor/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question: q }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result: AskResponse = await res.json();

      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        engine: result.engine,
        contextVersion: result.contextVersion.hash.slice(0, 8),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Error al consultar el asistente',
      }]);
    } finally {
      setLoading(false);
    }
  }

  const inputBg = isClassic ? 'bg-white border-slate-300' : 'bg-kavana-dark border-kavana-steel/30';
  const textPrimary = isClassic ? 'text-slate-900' : 'text-white';
  const textSecondary = isClassic ? 'text-slate-500' : 'text-slate-400';
  const bubbleUser = isClassic ? 'bg-blue-600 text-white' : 'bg-kavana-orange text-white';
  const bubbleAssistant = isClassic ? 'bg-slate-100 text-slate-800' : 'bg-kavana-surface/60 text-slate-200';
  const containerBg = isClassic ? 'bg-white border-slate-200' : 'bg-kavana-surface/30 border-kavana-steel/20';

  return (
    <div className={`flex flex-col rounded-xl border ${containerBg}`} style={{ height: '520px' }}>
      <div className={`flex items-center gap-2 border-b px-5 py-3 ${isClassic ? 'border-slate-200 bg-slate-50' : 'border-kavana-steel/20 bg-kavana-dark/50'}`}>
        <span className="text-lg">🤖</span>
        <div>
          <p className={`text-sm font-bold ${textPrimary}`}>Asistente IA</p>
          <p className={`text-xs ${textSecondary}`}>Consulta datos de producción en lenguaje natural</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 px-5 py-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <p className={`text-sm ${textSecondary}`}>Pregunta sobre tus datos de producción:</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' ? bubbleUser : bubbleAssistant
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.role === 'assistant' && (msg.engine || msg.contextVersion) && (
                <div className={`mt-2 flex gap-3 text-[10px] ${isClassic ? 'text-slate-400' : 'text-slate-500'}`}>
                  {msg.engine && <span>Motor: {msg.engine}</span>}
                  {msg.contextVersion && <span>Contexto: {msg.contextVersion}</span>}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${bubbleAssistant}`}>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 animate-bounce rounded-full ${isClassic ? 'bg-slate-400' : 'bg-slate-500'}`} style={{ animationDelay: '0ms' }} />
                <div className={`h-2 w-2 animate-bounce rounded-full ${isClassic ? 'bg-slate-400' : 'bg-slate-500'}`} style={{ animationDelay: '150ms' }} />
                <div className={`h-2 w-2 animate-bounce rounded-full ${isClassic ? 'bg-slate-400' : 'bg-slate-500'}`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div className={`flex flex-wrap gap-2 pt-3 pb-1 sticky bottom-0 ${isClassic ? 'bg-white' : 'bg-transparent'}`}>
          {suggestedQuestions.map((sq) => (
            <button
              key={sq}
              onClick={() => handleSubmit(sq)}
              disabled={loading}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                isClassic
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                  : 'bg-kavana-dark/80 text-slate-400 hover:text-white border border-kavana-steel/30 hover:border-kavana-steel/60'
              }`}
            >
              {sq}
            </button>
          ))}
        </div>

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }} className={`flex items-center gap-2 border-t p-3 ${isClassic ? 'border-slate-200 bg-slate-50' : 'border-kavana-steel/20 bg-kavana-dark/50'}`}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          disabled={loading}
          className={`flex-1 rounded-xl border px-4 py-3 text-sm outline-none ${inputBg} ${textPrimary} placeholder:${textSecondary} disabled:opacity-50`}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={`min-w-[48px] min-h-[48px] rounded-xl font-bold transition disabled:opacity-40 ${
            isClassic
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-kavana-orange text-white hover:bg-kavana-orange-light'
          }`}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
