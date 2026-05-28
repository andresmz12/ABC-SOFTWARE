import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import type { Document } from '@/types';

interface UploadOptions {
  userId: string;
  docType: string;
  useImagePicker?: boolean;
}

interface UploadResult {
  document: Document | null;
  error: string | null;
}

export async function uploadDocument({ userId, docType, useImagePicker = false }: UploadOptions): Promise<UploadResult> {
  try {
    let uri: string;
    let fileName: string;
    let mimeType: string;

    if (useImagePicker) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        quality: 0.8,
      });
      if (result.canceled) return { document: null, error: null };
      const asset = result.assets[0];
      uri = asset.uri;
      fileName = asset.fileName ?? `${docType}_${Date.now()}.jpg`;
      mimeType = asset.mimeType ?? 'image/jpeg';
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return { document: null, error: null };
      const asset = result.assets[0];
      uri = asset.uri;
      fileName = asset.name;
      mimeType = asset.mimeType ?? 'application/pdf';
    }

    const response = await fetch(uri);
    const blob = await response.blob();

    const storagePath = `${userId}/${docType}/${Date.now()}_${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, blob, { contentType: mimeType, upsert: true });

    if (uploadError) return { document: null, error: uploadError.message };

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

    const { data, error: dbError } = await supabase
      .from('documents')
      .upsert(
        {
          user_id: userId,
          doc_type: docType,
          file_url: urlData.publicUrl,
          file_name: fileName,
          status: 'pending',
          uploaded_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,doc_type' },
      )
      .select()
      .single();

    if (dbError) return { document: null, error: dbError.message };

    return { document: data as Document, error: null };
  } catch (e: any) {
    return { document: null, error: e?.message ?? 'Upload failed' };
  }
}
