import type { Tables } from '~/types/database.types';
import type { TravelMedia, TravelMediaType } from '~/types/travel-media';

function mapRowToDomain(row: Tables<'travel_media'>): TravelMedia {
  return {
    id: row.id,
    travelId: row.travel_id,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    mediaType: row.media_type as TravelMediaType,
    caption: row.caption,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

export function useTravelMediaRepository() {
  const supabase = useSupabase();

  async function fetchByTravel(travelId: string): Promise<TravelMedia[]> {
    const { data, error } = await supabase
      .from('travel_media')
      .select('*')
      .eq('travel_id', travelId)
      .order('display_order', { ascending: true });

    if (error)
      throw error;

    return data.map(mapRowToDomain);
  }

  async function upload(travelId: string, file: File, mediaType: TravelMediaType): Promise<TravelMedia> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const folder = mediaType === 'image' ? 'images' : 'videos';
    const storagePath = `${travelId}/${folder}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('travel-gallery')
      .upload(storagePath, file);

    if (uploadError)
      throw uploadError;

    const { data: urlData } = supabase.storage
      .from('travel-gallery')
      .getPublicUrl(storagePath);

    const { data, error: insertError } = await supabase
      .from('travel_media')
      .insert({
        travel_id: travelId,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        media_type: mediaType,
      })
      .select()
      .single();

    if (insertError)
      throw insertError;

    return mapRowToDomain(data);
  }

  async function remove(id: string, storagePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from('travel-gallery')
      .remove([storagePath]);

    if (storageError)
      throw storageError;

    const { error: dbError } = await supabase
      .from('travel_media')
      .delete()
      .eq('id', id);

    if (dbError)
      throw dbError;
  }

  function getThumbnailUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from('travel-gallery')
      .getPublicUrl(storagePath, {
        transform: { width: 400, height: 300, resize: 'cover' },
      });
    return data.publicUrl;
  }

  return { fetchByTravel, upload, remove, getThumbnailUrl };
}
