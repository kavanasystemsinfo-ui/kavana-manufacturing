import { useEffect, useState } from 'react';
import { fetchOeeWorkstations } from '../api/analytics.js';

/**
 * OEE de planta hoy: media de los puestos que sí tienen partes en el día. Sin
 * datos devuelve null (se muestra un guion, nunca un número inventado).
 */
export function usePlantOee(): number | null {
  const [plantOee, setPlantOee] = useState<number | null>(null);

  useEffect(() => {
    const ahora = new Date();
    const inicioDelDia = new Date(ahora);
    inicioDelDia.setHours(0, 0, 0, 0);

    let cancelado = false;
    fetchOeeWorkstations(inicioDelDia.toISOString(), ahora.toISOString())
      .then((puestos) => {
        if (cancelado) return;
        const conDatos = puestos.filter((p) => !p.sin_datos);
        if (conDatos.length === 0) {
          setPlantOee(null);
          return;
        }
        setPlantOee(conDatos.reduce((suma, p) => suma + (Number(p.oee) || 0), 0) / conDatos.length);
      })
      .catch(() => {
        if (!cancelado) setPlantOee(null);
      });

    return () => { cancelado = true; };
  }, []);

  return plantOee;
}
