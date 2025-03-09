// Método auxiliar para convertir el texto de la ubicación en un objeto Point
export function parsePointPickup(pointText: string): { pickupLat: number, pickupLng: number } {
  const matches = pointText.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (!matches) throw new Error('Invalid point format');
  return {
    pickupLat: parseFloat(matches[2]),
    pickupLng: parseFloat(matches[1]),
  };
}