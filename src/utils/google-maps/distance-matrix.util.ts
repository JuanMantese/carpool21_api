import { Client, DistanceMatrixResponseData, TrafficModel, TravelMode } from '@googlemaps/google-maps-services-js';

export async function fetchDistanceMatrixData(
  client: Client,
  apiKey: string,
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
  departureTimeInSeconds: number,
  trafficModel: TrafficModel = TrafficModel.best_guess,
): Promise<DistanceMatrixResponseData> {
  const response = await client.distancematrix({
    params: {
      origins: [`${originLat},${originLng}`],
      destinations: [`${destinationLat},${destinationLng}`],
      mode: TravelMode.driving,
      key: apiKey,
      departure_time: departureTimeInSeconds,
      traffic_model: trafficModel,
    },
    timeout: 6000,
  });

  // Validar el status general de la API
  if (response.data.status !== 'OK') {
    throw new Error(`Google Maps API error: ${response.data.status}`);
  }

  return response.data;
}
