import { Qibla } from "npm:adhan@4.4.3";

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export const parseQiblaCoordinate = (value: string): Coordinate | null => {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 2) return null;
  const [latRaw, lngRaw] = parts;
  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

export const getQiblaDirection = (coordinate: Coordinate): number => {
  return Qibla(coordinate);
};
