export function parsePointDestination(pointText: string): { destinationLat: number, destinationLng: number } {
  const matches = pointText.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (!matches) throw new Error('Invalid point format');
  return {
    destinationLat: parseFloat(matches[2]),
    destinationLng: parseFloat(matches[1]),
  };
}