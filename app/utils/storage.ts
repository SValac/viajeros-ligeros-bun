import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '~/types/database.types';

/**
 * Uploads a file to a public bucket.
 * @param supabase - The client
 * @param bucket - Public bucket name
 * @param path - Object path inside the bucket
 * @param file - The file
 * @param options - Upload options
 * @param options.contentType - MIME type to store; Storage infers it from the file when omitted
 * @returns The file's public URL
 * @throws {StorageError} on upload failure
 */
export async function uploadPublicFile(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
  file: File,
  options?: { contentType?: string },
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options);
  if (error)
    throw error;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Removes one file from a bucket. Like a row delete, Storage skips a file RLS doesn't let
 * the user remove without an error; callers that must know compare what `remove` returns
 * (see `removeAllForTravel`).
 * @param supabase - The client
 * @param bucket - Bucket name
 * @param path - Object path inside the bucket
 * @throws {StorageError} on Supabase failure
 */
export async function removeStorageFile(supabase: SupabaseClient<Database>, bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  if (error)
    throw error;
}

/**
 * Extracts the object path (`{travelId}/banner/123.png`) from a bucket's public URL, so a
 * replaced or removed file can be deleted.
 * @param publicUrl - Public URL stored in the database
 * @param bucket - The bucket the URL should belong to
 * @returns The object path inside the bucket, or `null` if the URL is not from it
 */
export function storagePathFromPublicUrl(publicUrl: string | null | undefined, bucket: string): string | null {
  if (!publicUrl)
    return null;
  const marker = `/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length));
}

/**
 * Extension for a file's storage name, from its own name.
 * @param file - The picked file
 * @returns What follows the last dot, or `'bin'` when the name has none
 */
export function fileExtension(file: File): string {
  const dot = file.name.lastIndexOf('.');
  return dot > 0 ? file.name.slice(dot + 1) : 'bin';
}
