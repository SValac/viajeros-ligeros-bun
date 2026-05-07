export type TravelMediaType = 'image' | 'video';

export type TravelMedia = {
  id: string;
  travelId: string;
  storagePath: string;
  publicUrl: string;
  mediaType: TravelMediaType;
  caption: string | null;
  displayOrder: number;
  createdAt: string;
};
