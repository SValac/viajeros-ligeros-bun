import type { TablesInsert } from '~/types/database.types';
import type { TravelActivity } from '~/types/travel';

/**
 * Validates and maps a list of itinerary activities to DB insert format.
 * Throws if any activity has an invalid day, empty title/description, or out-of-range coordinates.
 * @param travelId - UUID of the travel these activities belong to
 * @param itinerary - List of activities to validate and map
 * @returns Array of insert-ready records for `travel_activities`
 * @throws {Error} if any activity fails validation
 */
export function validateAndMapItinerary(travelId: string, itinerary: TravelActivity[]): TablesInsert<'travel_activities'>[] {
  return itinerary.map((activity) => {
    const day = Number(activity.day);
    const title = activity.title?.trim();
    const description = activity.description?.trim();

    if (!Number.isInteger(day) || day <= 0 || !title || !description) {
      throw new Error('Actividad de itinerario inválida');
    }

    if (activity.mapLocation && !validateMapLocation(activity.mapLocation)) {
      throw new Error('Coordenadas de mapa inválidas');
    }

    return {
      travel_id: travelId,
      day,
      title,
      description,
      time: activity.time ?? null,
      location: activity.location ?? null,
      map_location: activity.mapLocation ?? null,
    };
  });
}

/**
 * Returns `true` if the given coordinates are within valid geographic bounds.
 * @param mapLocation - Object with `lat` and `lng` values to validate
 * @param mapLocation.lat - Latitude value; must be between -90 and 90
 * @param mapLocation.lng - Longitude value; must be between -180 and 180
 * @returns `true` if lat ∈ [-90, 90] and lng ∈ [-180, 180]
 */
export function validateMapLocation(mapLocation: { lat: number; lng: number }): boolean {
  const { lat, lng } = mapLocation;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
