import { useState } from 'react';
import { uploadMobilePhoto } from '../api/incidencias.js';
import { compressImage, needsCompression } from '../utils/imageCompress.js';

interface Props {
  sessionId: string;
}

type PageStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Página pública /mobile-upload/:sessionId — la abre el operario escaneando el
 * QR del modal de incidencias. Sube UNA foto como evidencia; el sessionId actúa
 * como credencial de un solo uso (caduca en 15 min, valida magic bytes y 10MB).
 * Las fotos modernas pesan más de 10MB: se comprimen en el móvil antes de
 * subir (imageCompress) para que la subida no dependa del tamaño de cámara.
 */
export function MobilePhotoUpload({ sessionId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState<PageStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [optimized, setOptimized] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    try {
      const finalFile = needsCompression(selected.size) ? await compressImage(selected) : selected;
      setOptimized(finalFile !== selected);
      setFile(finalFile);
      setPreview(URL.createObjectURL(finalFile));
      setStatus('idle');
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No se pudo procesar la imagen. Inténtalo de nuevo.');
      setStatus('error');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setErrorMessage('');
    try {
      await uploadMobilePhoto(sessionId, file);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Error al conectar con el servidor. Inténtalo de nuevo.');
    }
  };

  if (status === 'success') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-kavana-dark p-6 text-center text-slate-100">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-500/60 bg-emerald-500/10">
          <svg className="h-12 w-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">¡Foto Enviada!</h1>
        <p className="mt-3 max-w-xs text-sm text-slate-400">
          La imagen se ha procesado y ya aparece en el panel del puesto de trabajo.
        </p>
        {preview && (
          <img src={preview} alt="Foto enviada" className="mt-8 max-h-56 w-full max-w-xs rounded-xl border-2 border-kavana-steel/40 object-cover" />
        )}
        <button
          onClick={() => window.close()}
          className="mt-8 rounded-xl bg-kavana-orange px-6 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-kavana-orange-light"
        >
          Cerrar ventana
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-kavana-dark text-slate-100">
      <div className="p-6 pb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-kavana-orange">Kavana Manufacturing</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">Adjuntar Evidencia</h1>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Sesión: <span className="rounded bg-kavana-surface px-2 py-0.5 font-mono text-slate-300">{sessionId.slice(0, 8)}</span>
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        {status === 'error' && (
          <div className="w-full max-w-sm rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300">
            <p className="font-black uppercase tracking-wider">Error</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}

        {!preview ? (
          <label className="flex aspect-square w-full max-w-sm cursor-pointer flex-col items-center justify-center gap-6 rounded-2xl border-4 border-dashed border-kavana-steel/50 transition hover:border-kavana-orange/60 hover:bg-kavana-surface/40 active:scale-95">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-kavana-orange bg-kavana-surface shadow-inner">
              <svg className="h-11 w-11 text-kavana-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h2l2-3h6l2 3h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-black uppercase tracking-wide text-white">Tomar Foto</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Suelo de fábrica</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border-4 border-kavana-steel/40 shadow-2xl">
            <img src={preview} alt="Vista previa" className="aspect-square w-full object-cover" />
            {optimized && (
              <div className="absolute bottom-4 left-4 rounded-lg bg-black/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300 backdrop-blur">
                Foto optimizada
              </div>
            )}
            <button
              onClick={() => { setFile(null); setPreview(''); setOptimized(false); }}
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2.5 text-white backdrop-blur transition hover:bg-red-600"
              aria-label="Quitar foto"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {file && (
          <button
            onClick={handleUpload}
            disabled={status === 'uploading'}
            className="w-full max-w-sm rounded-xl bg-kavana-orange px-6 py-4 text-base font-black uppercase tracking-wider text-white transition hover:bg-kavana-orange-light disabled:cursor-wait disabled:opacity-60"
          >
            {status === 'uploading' ? (
              <span className="flex items-center justify-center gap-3">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Enviando…
              </span>
            ) : (
              'Enviar al PC'
            )}
          </button>
        )}
      </div>

      <div className="p-8 text-center">
        <p className="text-[10px] font-black tracking-[0.3em] text-slate-700 uppercase">Kavana Systems · Industrial MES</p>
      </div>
    </main>
  );
}
