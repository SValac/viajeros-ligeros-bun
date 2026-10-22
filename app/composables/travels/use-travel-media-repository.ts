import type { TravelMedia, TravelMediaType } from '~/types/travel-media';

import { TRAVEL_GALLERY_BUCKET } from '~/composables/travels/use-travel-domain';
import { deleteById } from '~/utils/delete-by-id';
import { mapTravelMediaRowToDomain } from '~/utils/mappers/travel-mappers';
import { fileExtension, removeStorageFile, uploadPublicFile } from '~/utils/storage';

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

    return data.map(mapTravelMediaRowToDomain);
  }

  async function upload(travelId: string, file: File, mediaType: TravelMediaType): Promise<TravelMedia> {
    const folder = mediaType === 'image' ? 'images' : 'videos';
    const storagePath = `${travelId}/${folder}/${crypto.randomUUID()}.${fileExtension(file)}`;
    const publicUrl = await uploadPublicFile(supabase, TRAVEL_GALLERY_BUCKET, storagePath, file);

    const { data, error: insertError } = await supabase
      .from('travel_media')
      .insert({
        travel_id: travelId,
        storage_path: storagePath,
        public_url: publicUrl,
        media_type: mediaType,
      })
      .select()
      .single();

    if (insertError)
      throw insertError;

    return mapTravelMediaRowToDomain(data);
  }

  async function remove(id: string, storagePath: string): Promise<void> {
    await removeStorageFile(supabase, TRAVEL_GALLERY_BUCKET, storagePath);
    await deleteById(supabase, 'travel_media', id);
  }

  function getThumbnailUrl(storagePath: string): string {
    const { data } = supabase.storage
      .from(TRAVEL_GALLERY_BUCKET)
      .getPublicUrl(storagePath, {
        transform: { width: 400, height: 300, resize: 'cover' },
      });
    return data.publicUrl;
  }

  async function uploadBanner(travelId: string, file: File): Promise<string> {
    const storagePath = `${travelId}/banner/${crypto.randomUUID()}.${fileExtension(file)}`;
    return uploadPublicFile(supabase, TRAVEL_GALLERY_BUCKET, storagePath, file);
  }

  /**
   * Removes a single file from the bucket without touching `travel_media` (e.g. a banner).
   * @param storagePath - Object path inside the bucket (`{travelId}/banner/123.png`)
   * @throws {StorageError} on Supabase failure
   */
  async function removeFile(storagePath: string): Promise<void> {
    await removeStorageFile(supabase, TRAVEL_GALLERY_BUCKET, storagePath);
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
        .from(TRAVEL_GALLERY_BUCKET)
        .listV2({ prefix: `${travelId}/`, cursor });

      if (listError)
        throw listError;

      const paths = data.objects.map(object => object.key ?? object.name);

      if (paths.length > 0) {
        const { data: removed, error: removeError } = await supabase.storage
          .from(TRAVEL_GALLERY_BUCKET)
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
