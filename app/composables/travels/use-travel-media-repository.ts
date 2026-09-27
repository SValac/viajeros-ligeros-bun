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

  async function uploadBanner(travelId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'bin';
    const storagePath = `${travelId}/banner/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('travel-gallery')
      .upload(storagePath, file);

    if (uploadError)
      throw uploadError;

    const { data } = supabase.storage
      .from('travel-gallery')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  /**
   * Removes a single file from the bucket without touching `travel_media` (e.g. a banner).
   * @param storagePath - Object path inside the bucket (`{travelId}/banner/123.png`)
   * @throws {StorageError} on Supabase failure
   */
  async function removeFile(storagePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from('travel-gallery')
      .remove([storagePath]);

    if (error)
      throw error;
  }

  /**
   * Deletes every Storage object under a travel's folder (`{travelId}/`): gallery media,
   * the current banner and any replaced banners no row points to anymore.
   * Must run while the travel row still exists — the bucket's RLS policies resolve access
   * through the parent travel, so once it's deleted its files can no longer be removed.
   * @param travelId - UUID of the travel whose folder is emptied
   * @throws {StorageError} on Supabase failure
   * @throws {Error} if RLS silently skipped some of the files
   */
  async function removeAllForTravel(travelId: string): Promise<void> {
    let cursor: string | undefined;

    do {
      // Flat listing (no delimiter) returns files from every subfolder with their full path.
      const { data, error: listError } = await supabase.storage
        .from('travel-gallery')
        .listV2({ prefix: `${travelId}/`, cursor });

      if (listError)
        throw listError;

      const paths = data.objects.map(object => object.key ?? object.name);

      if (paths.length > 0) {
        const { data: removed, error: removeError } = await supabase.storage
          .from('travel-gallery')
          .remove(paths);

        if (removeError)
          throw removeError;

        // Storage returns no error for files RLS doesn't let us delete, it just leaves them out.
        if (removed.length !== paths.length)
          throw new Error('No se pudieron eliminar todos los archivos del viaje');
      }

      cursor = data.hasNext ? data.nextCursor : undefined;
    } while (cursor);
  }

  return { fetchByTravel, upload, remove, getThumbnailUrl, uploadBanner, removeFile, removeAllForTravel };
}
