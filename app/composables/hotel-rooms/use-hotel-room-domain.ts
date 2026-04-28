/**
 * Validates that a new total rooms count would not drop below currently configured capacity.
 * @param newTotal - Proposed new total to validate
 * @param usedRooms - Sum of `roomCount` across all room types already configured
 * @returns Null if valid; Spanish error message if the new total would leave
 *          configured room types without enough capacity
 */
export function validateTotalRoomsUpdate(newTotal: number, usedRooms: number): string | null {
  if (newTotal < usedRooms) {
    return `El total no puede ser menor a las habitaciones ya configuradas (${usedRooms})`;
  }
  return null;
}
