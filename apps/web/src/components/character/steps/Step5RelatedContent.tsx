'use client';

import { useState, useRef } from 'react';
import { Plus, Folder, X, Upload } from 'lucide-react';
import { useCharacterWizardStore } from '@/stores/characterWizardStore';
import { RelatedContentCard } from '../components/RelatedContentCard';
import type { RelatedContent } from '@/stores/characterWizardStore';
import { uploadImage, validateImageFile } from '@/lib/uploadImage';
import { v4 as uuidv4 } from 'uuid';

export function Step5RelatedContent() {
  const { formData, updateFormData } = useCharacterWizardStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<RelatedContent | null>(
    null,
  );
  const [formType, setFormType] = useState<'image' | 'video' | 'link'>('image');
  const [formUrl, setFormUrl] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    setUploadError(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || '유효하지 않은 파일입니다');
      return;
    }

    setIsUploading(true);

    try {
      const imageUrl = await uploadImage(file, 'character-images', 'related');
      setFormUrl(imageUrl);
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadError(
        error instanceof Error ? error.message : '이미지 업로드에 실패했습니다',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    setFormUrl('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openModal = (content?: RelatedContent) => {
    if (content) {
      setEditingContent(content);
      setFormType(content.type);
      setFormUrl(content.url);
      setFormTitle(content.title || '');
      setFormDescription(content.description || '');
    } else {
      setEditingContent(null);
      setFormType('image');
      setFormUrl('');
      setFormTitle('');
      setFormDescription('');
    }
    setUploadError(null);
    setIsUploading(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContent(null);
  };

  const handleSave = () => {
    if (!formUrl.trim()) {
      return;
    }

    const content: RelatedContent = {
      id: editingContent?.id || uuidv4(),
      type: formType,
      url: formUrl,
      title: formTitle.trim() || undefined,
      description: formDescription.trim() || undefined,
    };

    if (editingContent) {
      updateFormData({
        relatedContent: formData.relatedContent.map((c) =>
          c.id === editingContent.id ? content : c,
        ),
      });
    } else {
      updateFormData({
        relatedContent: [...formData.relatedContent, content],
      });
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    updateFormData({
      relatedContent: formData.relatedContent.filter((c) => c.id !== id),
    });
  };

  return (
    <div className="wizard-step space-y-6">
      <div>
        <h2 className="text-headline-medium mb-2">관련 콘텐츠</h2>
        <p className="text-body-medium text-on-surface-variant">
          캐릭터 상세 페이지에 표시할 이미지, 영상, 링크를 추가하세요
        </p>
        <div className="mt-3 p-3 rounded-lg bg-tertiary-container/30 text-sm text-on-surface-variant">
          <p>
            💡 캐릭터와 관련된 추가 자료를 제공하여 사용자가 캐릭터를 더 잘
            이해할 수 있도록 도와줍니다 (선택사항)
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          콘텐츠 추가
        </button>
      </div>

      <div className="space-y-3">
        {formData.relatedContent.map((content) => (
          <RelatedContentCard
            key={content.id}
            content={content}
            onEdit={() => openModal(content)}
            onDelete={() => handleDelete(content.id)}
          />
        ))}

        {formData.relatedContent.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            <Folder className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-1">아직 관련 콘텐츠가 없습니다</p>
            <p className="text-xs">
              선택사항입니다. 필요하지 않다면 건너뛰어도 됩니다
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-md">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-headline-small">
                  {editingContent ? '콘텐츠 수정' : '콘텐츠 추가'}
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-surface-container rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  콘텐츠 유형 <span className="text-error">*</span>
                </label>
                <div className="flex gap-3">
                  {(['image', 'video', 'link'] as const).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="content-type"
                        value={type}
                        checked={formType === type}
                        onChange={(e) => {
                          const newType = e.target.value as 'image' | 'video' | 'link';
                          setFormType(newType);
                          // 타입 변경 시 URL 초기화
                          setFormUrl('');
                          setUploadError(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">
                        {type === 'image'
                          ? '이미지'
                          : type === 'video'
                            ? '영상'
                            : '링크'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  {formType === 'image' ? '이미지' : 'URL'}{' '}
                  <span className="text-error">*</span>
                </label>

                {formType === 'image' ? (
                  <>
                    <p className="text-xs text-on-surface-variant mb-3">
                      JPG, PNG, WebP, GIF 형식, 최대 5MB
                    </p>

                    {formUrl ? (
                      // 이미지 미리보기
                      <div className="relative w-full h-48 rounded-xl overflow-hidden group">
                        <img
                          src={formUrl}
                          alt="미리보기"
                          className="w-full h-full object-contain bg-surface-container"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              'none';
                          }}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={handleRemoveImage}
                            type="button"
                            className="p-2 bg-error rounded-full hover:bg-error/90 transition-colors"
                            title="이미지 제거"
                          >
                            <X className="w-4 h-4 text-on-error" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 파일 업로드 영역
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                          relative border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer
                          ${
                            dragActive
                              ? 'border-primary bg-primary-container/20'
                              : 'border-outline-variant hover:border-primary/50 hover:bg-surface-container/50'
                          }
                          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                        `}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />

                        <div className="flex flex-col items-center justify-center text-center">
                          {isUploading ? (
                            <>
                              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                              <p className="text-sm text-on-surface-variant">
                                업로드 중...
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-on-surface-variant mb-2" />
                              <p className="text-sm font-medium text-on-surface mb-1">
                                클릭하여 이미지 선택
                              </p>
                              <p className="text-xs text-on-surface-variant">
                                또는 드래그 & 드롭
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {uploadError && (
                      <div className="mt-2 p-2 rounded-lg bg-error-container/30 text-error text-xs">
                        {uploadError}
                      </div>
                    )}
                  </>
                ) : (
                  // 비디오/링크는 URL 입력
                  <input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://example.com/..."
                    className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  제목 (선택사항)
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="콘텐츠 제목"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  설명 (선택사항)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="콘텐츠에 대한 설명"
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formUrl.trim()}
                  className={`
                    flex-1 px-6 py-3 rounded-xl font-medium transition-colors
                    ${
                      formUrl.trim()
                        ? 'glow-button'
                        : 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                    }
                  `}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
