import { useState } from 'react';

interface HelpSection {
  title: string;
  content: string;
}

interface HelpModalProps {
  title: string;
  sections: HelpSection[];
  theme?: 'modern' | 'classic';
}

export function HelpButton({ onClick, theme = 'modern' }: { onClick: () => void; theme?: 'modern' | 'classic' }) {
  if (theme === 'classic') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded-md px-2 py-1 hover:bg-blue-50 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Ayuda
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-kavana-orange hover:text-orange-300 border border-kavana-orange/40 rounded-lg px-2.5 py-1.5 hover:bg-kavana-orange/20 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Ayuda
    </button>
  );
}

export function HelpModal({ title, sections, theme = 'modern' }: HelpModalProps) {
  const [open, setOpen] = useState(false);

  if (theme === 'classic') {
    return (
      <>
        <HelpButton onClick={() => setOpen(true)} theme="classic" />
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-5 py-4 overflow-y-auto max-h-[70vh] space-y-4">
                {sections.map((section, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">{section.title}</h4>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.content}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 text-right">
                <button onClick={() => setOpen(false)} className="text-sm font-medium text-blue-600 hover:text-blue-800 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <HelpButton onClick={() => setOpen(true)} />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto max-h-[70vh] space-y-4">
              {sections.map((section, i) => (
                <div key={i}>
                  <h4 className="text-sm font-semibold text-kavana-orange mb-1">{section.title}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{section.content}</p>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-gray-700 bg-gray-800/50 text-right">
              <button onClick={() => setOpen(false)} className="text-sm font-medium text-kavana-orange hover:text-orange-300 px-4 py-1.5 rounded-lg hover:bg-kavana-orange/20 transition-colors">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
