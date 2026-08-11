import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createUploadSession, getUploadSession } from '../../api/incidencias.js';
import type { UploadSession } from '../../api/incidencias.js';
import { createIncidencia } from '../../api/admin-entities.js';

interface Props {
  isOpen: boolean;
  onClose: (created?: boolean) => void;
  operatorId: string | null;
  workstationId: string | null;
  orderId: string | null;
}

type ModalStatus = 'creating' | 'waiting' | 'photo' | 'expired' | 'error' | 'submitting';

const POLL_MS = 2000;

/**
 * Modal de reporte de incidencia con evidencia fotográfica (flujo QR + móvil).
 * Recreación del patrón del MES original con mejores prácticas: la sesión se
 * crea en el backend (no en el cliente), el QR apunta a /mobile-upload/:id y
 * el panel hace polling del estado; la foto llega como data URL (una sola vez).
 */
export function IncidenciaModal({ isOpen, onClose, operatorId, workstationId, orderId }: Props) {
  const [session, setSession] = useState<UploadSession | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ModalStatus>('creating');
  const [errorMsg, setErrorMsg] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('produccion');
  const [severity, setSeverity] = useState('media');
  const [description, setDescription] = useState('');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setSession(null);
    setPhotoDataUrl(null);
    setTitle('');
    setType('produccion');
    setSeverity('media');
    setDescription('');
    setErrorMsg('');
    setStatus('creating');

    void (async () => {
      try {
        const created = await createUploadSession();
        if (cancelled) return;
        setSession(created);
        setStatus('waiting');

        pollingRef.current = setInterval(() => {
          void (async () => {
            try {
              const current = await getUploadSession(created.session_id);
              if (cancelled) return;
              if (current.has_photo && current.photo_data_url) {
                setPhotoDataUrl(current.photo_data_url);
                setStatus('photo');
                stopPolling();
              } else if (current.status === 'expired') {
                setStatus('expired');
                stopPolling();
              }
            } catch {
              // Errores transitorios de red: el siguiente tick reintenta.
            }
          })();
        }, POLL_MS);
      } catch {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg('No se pudo crear la sesión de subida. Inténtalo de nuevo.');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [isOpen, stopPolling]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg('Escribe un título para la incidencia.');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      await createIncidencia({
        reported_by: operatorId ?? '00000000-0000-0000-0000-000000000000',
        workstation_id: workstationId ?? undefined,
        order_id: orderId ?? undefined,
        type,
        severity,
        title: title.trim(),
        description: description.trim() || undefined,
        photo_session_id: session?.session_id ?? undefined,
      });
      onClose(true);
    } catch (e) {
      setStatus(photoDataUrl ? 'photo' : 'waiting');
      setErrorMsg(e instanceof Error ? e.message : 'Error al reportar la incidencia.');
    }
  };

  if (!isOpen) return null;

  const qrUrl = session
    ? `${window.location.origin}/mobile-upload/${session.session_id}`
    : '';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border-2 border-kavana-orange/50 bg-kavana-panel p-6 text-slate-100 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-kavana-orange/30 pb-4">
          <h2 className="text-xl font-black uppercase tracking-wider text-white">Reportar Incidencia</h2>
          <button
            onClick={() => onClose()}
            className="rounded-lg px-3 py-1.5 text-slate-400 transition hover:bg-kavana-surface hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        {status === 'creating' && (
          <div className="flex flex-col items-center gap-4 py-10 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-kavana-orange border-t-transparent" />
            <p className="text-sm font-bold uppercase tracking-wider">Creando sesión…</p>
          </div>
        )}

        {(status === 'waiting' || status === 'photo' || status === 'expired') && (
          <div className="mb-5 rounded-xl border-2 border-dashed border-kavana-steel/40 bg-kavana-dark/60 p-5 text-center">
            {status === 'photo' && photoDataUrl ? (
              <div className="relative">
                <img
                  src={photoDataUrl}
                  alt="Evidencia"
                  className="mx-auto max-h-56 w-full rounded-lg object-cover"
                />
                <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-black uppercase text-white">
                  Foto recibida
                </span>
                <button
                  onClick={() => {
                    setPhotoDataUrl(null);
                    setStatus('waiting');
                  }}
                  className="absolute bottom-2 right-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500"
                >
                  Quitar foto
                </button>
              </div>
            ) : (
              <>
                <div className="mx-auto mb-4 w-fit rounded-xl bg-white p-3">
                  <QRCodeSVG value={qrUrl} size={150} />
                </div>
                <p className="text-sm font-bold uppercase tracking-wider text-white">Escanea con tu móvil</p>
                <p className="mt-1 text-xs text-slate-400">
                  Abre la cámara del móvil, escanea el QR y sube la foto de la incidencia.
                </p>
                {status === 'expired' && (
                  <p className="mt-3 text-xs font-bold text-amber-400">
                    La sesión caducó. Cierra y vuelve a abrir el modal para generar un QR nuevo.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-kavana-steel">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descripción breve del problema"
              maxLength={255}
              className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:border-kavana-orange focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-kavana-steel">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-3 py-3 text-sm font-medium text-white focus:border-kavana-orange focus:outline-none"
              >
                <option value="produccion">Producción</option>
                <option value="calidad">Calidad</option>
                <option value="seguridad">Seguridad</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-kavana-steel">Severidad</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-xl border border-kavana-steel/30 bg-kavana-surface px-3 py-3 text-sm font-medium text-white focus:border-kavana-orange focus:outline-none"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-kavana-steel">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detalles adicionales (opcional)"
              className="w-full resize-none rounded-xl border border-kavana-steel/30 bg-kavana-surface px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:border-kavana-orange focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => onClose()}
              className="flex-1 rounded-xl border border-kavana-steel/40 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-kavana-surface"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={status === 'submitting' || status === 'creating' || !title.trim()}
              className="flex-1 rounded-xl bg-kavana-orange px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-kavana-orange-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'submitting' ? 'Enviando…' : 'Reportar Incidencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
