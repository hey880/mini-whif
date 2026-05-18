'use client';

import { useState, useRef } from 'react';
import { Plus, Image as ImageIcon, X, Upload } from 'lucide-react';
import { useCharacterWizardStore } from '@/stores/characterWizardStore';
import { SituationalImageCard } from '../components/SituationalImageCard';
import type { SituationalImage } from '@/stores/characterWizardStore';
import { uploadImage, validateImageFile } from '@/lib/uploadImage';

export function Step4SituationalImages() {
  const { formData, updateFormData } = useCharacterWizardStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<SituationalImage | null>(
    null,
  );
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [triggerInput, setTriggerInput] = useState('');
  const [formTriggers, setFormTriggers] = useState<string[]>([]);
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
      const imageUrl = await uploadImage(file, 'character-images', 'situational');
      setFormImageUrl(imageUrl);
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
    setFormImageUrl('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openModal = (image?: SituationalImage) => {
    if (image) {
      setEditingImage(image);
      setFormImageUrl(image.imageUrl);
      setFormDescription(image.description || '');
      setFormTriggers(image.triggers);
    } else {
      setEditingImage(null);
      setFormImageUrl('');
      setFormDescription('');
      setFormTriggers([]);
    }
    setTriggerInput('');
    setUploadError(null);
    setIsUploading(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingImage(null);
  };

  const handleSave = () => {
    if (!formImageUrl.trim() || formTriggers.length === 0) {
      return;
    }

    const image: SituationalImage = {
      id: editingImage?.id || crypto.randomUUID(),
      imageUrl: formImageUrl,
      triggers: formTriggers,
      description: formDescription.trim() || undefined,
    };

    if (editingImage) {
      updateFormData({
        situationalImages: formData.situationalImages.map((img) =>
          img.id === editingImage.id ? image : img,
        ),
      });
    } else {
      updateFormData({
        situationalImages: [...formData.situationalImages, image],
      });
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    updateFormData({
      situationalImages: formData.situationalImages.filter(
        (img) => img.id !== id,
      ),
    });
  };

  const addTrigger = () => {
    const trigger = triggerInput.trim();
    if (trigger && !formTriggers.includes(trigger)) {
      setFormTriggers([...formTriggers, trigger]);
      setTriggerInput('');
    }
  };

  const removeTrigger = (trigger: string) => {
    setFormTriggers(formTriggers.filter((t) => t !== trigger));
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTrigger();
    }
  };

  return (
    <div className="wizard-step space-y-6">
      <div>
        <h2 className="text-headline-medium mb-2">상황별 이미지</h2>
        <p className="text-body-medium text-on-surface-variant">
          특정 키워드가 입력되면 표시할 이미지를 설정하세요
        </p>
        <div className="mt-3 p-3 rounded-lg bg-tertiary-container/30 text-sm text-on-surface-variant">
          <p>
            💡 대화 중 특정 상황이 발생하면 설정한 이미지를 캐릭터와 함께
            표시할 수 있습니다 (선택사항)
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => openModal()}
          className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary/20 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          이미지 추가
        </button>
      </div>

      <div className="space-y-3">
        {formData.situationalImages.map((image) => (
          <SituationalImageCard
            key={image.id}
            image={image}
            onEdit={() => openModal(image)}
            onDelete={() => handleDelete(image.id)}
          />
        ))}

        {formData.situationalImages.length === 0 && (
          <div className="text-center py-12 text-on-surface-variant">
            <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-1">아직 상황별 이미지가 없습니다</p>
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
                  {editingImage ? '이미지 수정' : '이미지 추가'}
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
                  이미지 <span className="text-error">*</span>
                </label>
                <p className="text-xs text-on-surface-variant mb-3">
                  JPG, PNG, WebP, GIF 형식, 최대 5MB
                </p>

                {formImageUrl ? (
                  // 이미지 미리보기
                  <div className="relative w-full h-48 rounded-xl overflow-hidden group">
                    <img
                      src={formImageUrl}
                      alt="미리보기"
                      className="w-full h-full object-contain bg-surface-container"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
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
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  설명 (선택사항)
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="이미지에 대한 설명"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  트리거 키워드 <span className="text-error">*</span>
                </label>
                <p className="text-xs text-on-surface-variant mb-2">
                  ⚠️ 짧은 단어나 명사를 입력하세요 (문장이 아닌 키워드)
                  <br />
                  예: &quot;돈&quot;, &quot;지갑&quot;, &quot;웃음&quot;, &quot;눈물&quot; - AI 응답에 이 단어가 포함되면 이미지 표시
                </p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={triggerInput}
                    onChange={(e) => setTriggerInput(e.target.value)}
                    onKeyDown={handleTriggerKeyDown}
                    placeholder="예: 돈, 지갑, 현금 (한 단어씩 입력)"
                    className="flex-1 px-4 py-2 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    onClick={addTrigger}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                  >
                    추가
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formTriggers.map((trigger) => (
                    <span
                      key={trigger}
                      className="px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-sm flex items-center gap-2"
                    >
                      {trigger}
                      <button
                        onClick={() => removeTrigger(trigger)}
                        className="hover:bg-secondary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
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
                  disabled={!formImageUrl.trim() || formTriggers.length === 0}
                  className={`
                    flex-1 px-6 py-3 rounded-xl font-medium transition-colors
                    ${
                      formImageUrl.trim() && formTriggers.length > 0
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
