import { supabase } from './supabase';

/**
 * Supabase Storage에 이미지를 업로드하고 공개 URL을 반환합니다
 */
export async function uploadImage(
  file: File,
  bucket: string = 'character-images',
  folder?: string,
): Promise<string> {
  // 파일 크기 체크 (5MB 제한)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error('이미지 파일은 5MB 이하여야 합니다');
  }

  // 파일 타입 체크
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('JPG, PNG, WebP, GIF 형식의 이미지만 업로드 가능합니다');
  }

  // 고유한 파일명 생성
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  // Supabase Storage에 업로드
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Image upload error:', error);
    throw new Error('이미지 업로드에 실패했습니다: ' + error.message);
  }

  // 공개 URL 가져오기
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Supabase Storage에서 이미지를 삭제합니다
 */
export async function deleteImage(
  imageUrl: string,
  bucket: string = 'character-images',
): Promise<void> {
  try {
    // URL에서 파일 경로 추출
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/storage/v1/object/public/${bucket}/`);

    if (pathParts.length < 2) {
      console.warn('Invalid image URL format:', imageUrl);
      return;
    }

    const filePath = pathParts[1];

    // Supabase Storage에서 삭제
    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error('Image delete error:', error);
      // 삭제 실패는 무시 (파일이 이미 없을 수 있음)
    }
  } catch (error) {
    console.error('Error parsing image URL:', error);
    // URL 파싱 실패는 무시
  }
}

/**
 * 이미지 파일이 유효한지 검사합니다
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // 파일 크기 체크
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: '이미지 파일은 5MB 이하여야 합니다',
    };
  }

  // 파일 타입 체크
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'JPG, PNG, WebP, GIF 형식의 이미지만 업로드 가능합니다',
    };
  }

  return { valid: true };
}
