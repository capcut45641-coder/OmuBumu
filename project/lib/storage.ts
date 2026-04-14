/**
 * Expo SDK 54+: Ana `expo-file-system` paketindeki readAsStringAsync çalışma anında
 * hata fırlatır; gerçek okuma için legacy API şarttır.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

export const TOURNAMENT_MEDIA_BUCKET = 'tournament-media';

export async function uploadImageFromUri(
  uri: string,
  storagePath: string
): Promise<string> {
  console.log('[storage] uploadImageFromUri start', {
    storagePath,
    uriSample: uri.slice(0, 48),
  });

  let arrayBuffer: ArrayBuffer;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    arrayBuffer = decode(base64);
    console.log('[storage] read local file as base64 OK, bytes:', arrayBuffer.byteLength);
  } catch (readErr) {
    console.error('[storage] Image read (base64) failed, trying fetch+blob:', readErr);
    try {
      const res = await fetch(uri);
      if (!res.ok) {
        throw new Error(`fetch status ${res.status}`);
      }
      const blob = await res.blob();
      arrayBuffer = await new Response(blob).arrayBuffer();
      console.log('[storage] fetch+blob OK, bytes:', arrayBuffer.byteLength);
    } catch (fetchErr) {
      console.error('[storage] fetch+blob also failed:', fetchErr);
      if (readErr instanceof Error) {
        console.error('[storage] original read error:', readErr.message);
      }
      throw readErr;
    }
  }

  const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase();
  const contentType =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : 'image/jpeg';

  const { error, data: uploadData } = await supabase.storage
    .from(TOURNAMENT_MEDIA_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error('[storage] Supabase Storage upload error:', {
      message: error.message,
      name: error.name,
      statusCode: 'statusCode' in error ? (error as { statusCode?: string }).statusCode : undefined,
    });
    throw error;
  }

  console.log('[storage] upload OK:', uploadData?.path ?? storagePath);

  const { data } = supabase.storage
    .from(TOURNAMENT_MEDIA_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}