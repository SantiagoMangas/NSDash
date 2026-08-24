/** Velocidad sostenida en km/h desde distancia (m) y tiempo (s). */
export function calculateVelKmh(distancia_m: number, tiempo_s: number): number | null {
  if (!Number.isFinite(distancia_m) || distancia_m <= 0) {
    return null;
  }
  if (!Number.isFinite(tiempo_s) || tiempo_s <= 0) {
    return null;
  }

  const velKmh = (distancia_m / tiempo_s) * 3.6;
  if (!Number.isFinite(velKmh) || velKmh <= 0) {
    return null;
  }

  return velKmh;
}
