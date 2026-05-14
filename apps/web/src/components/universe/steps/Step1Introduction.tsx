'use client';

import { useUniverseWizardStore } from '@/stores/universeWizardStore';
import { uploadImage } from '@/lib/uploadImage';
import { useState } from 'react';

export function Step1Introduction() {
  const { formData, updateFormData, getStepErrors } = useUniverseWizardStore();
  const [uploading, setUploading] = useState(false);
  const errors = getStepErrors(1);

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const imageUrl = await uploadImage(file, 'universe-images', 'covers');
      updateFormData({ imageUrl });
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('이미지 업로드에 실패했습니다');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-title-large font-bold text-on-surface mb-2">작품 소개</h3>
        <p className="text-body-medium text-on-surface-variant">
          작품의 기본 정보를 입력해주세요
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-label-large font-medium text-on-surface mb-2">
          작품 이름 <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="작품 이름을 입력하세요"
          maxLength={100}
          className="w-full input-glow"
        />
        <p className="text-label-small text-on-surface-variant mt-1">
          {formData.name.length} / 100자
        </p>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-label-large font-medium text-on-surface mb-2">
          작품 표지
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="relative border-2 border-dashed border-outline rounded-2xl p-8 text-center hover:border-primary transition-colors cursor-pointer"
        >
          {formData.imageUrl ? (
            <div className="relative">
              <img
                src={formData.imageUrl}
                alt="Universe cover"
                className="w-full h-64 object-cover rounded-xl"
              />
              <button
                onClick={() => updateFormData({ imageUrl: '' })}
                className="absolute top-2 right-2 p-2 bg-error text-on-error rounded-full hover:bg-error/80 transition-colors"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ) : (
            <>
              <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">
                cloud_upload
              </span>
              <p className="text-body-large text-on-surface mb-2">
                {uploading ? '업로드 중...' : '이미지를 드래그하거나 클릭하여 업로드'}
              </p>
              <p className="text-body-small text-on-surface-variant">
                권장 비율: 16:9, 최대 5MB
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                disabled={uploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-label-large font-medium text-on-surface mb-2">
          작품 소개 <span className="text-error">*</span>
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="작품의 세계관과 주요 내용을 소개해주세요 (유저 공개용)"
          rows={6}
          maxLength={2000}
          className="w-full input-glow resize-none"
        />
        <p className="text-label-small text-on-surface-variant mt-1">
          {formData.description.length} / 2000자 (최소 50자)
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-4 bg-error-container rounded-xl">
          <ul className="list-disc list-inside text-label-medium text-on-error-container">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
