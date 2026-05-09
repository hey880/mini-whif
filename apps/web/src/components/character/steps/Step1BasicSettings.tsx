'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, User, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useCharacterWizardStore } from '@/stores/characterWizardStore';
import { uploadImage, validateImageFile } from '@/lib/uploadImage';

export function Step1BasicSettings() {
  const { formData, updateFormData } = useCharacterWizardStore();
  const [imageError, setImageError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    setUploadError(null);

    // 파일 유효성 검사
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || '유효하지 않은 파일입니다');
      return;
    }

    setIsUploading(true);
    setImageError(false);

    try {
      // 이미지 업로드
      const imageUrl = await uploadImage(file, 'character-images', 'profiles');
      updateFormData({ imageUrl });
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
    updateFormData({ imageUrl: '' });
    setImageError(false);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const addExampleDialogue = () => {
    updateFormData({
      exampleDialogues: [
        ...formData.exampleDialogues,
        {
          id: crypto.randomUUID(),
          situation: '',
          response: '',
        },
      ],
    });
  };

  const removeExampleDialogue = (id: string) => {
    updateFormData({
      exampleDialogues: formData.exampleDialogues.filter((d) => d.id !== id),
    });
  };

  const updateExampleDialogue = (
    id: string,
    field: 'situation' | 'response',
    value: string,
  ) => {
    updateFormData({
      exampleDialogues: formData.exampleDialogues.map((d) =>
        d.id === id ? { ...d, [field]: value } : d,
      ),
    });
  };

  return (
    <div className="wizard-step space-y-6">
      <div>
        <h2 className="text-headline-medium mb-2">기본설정</h2>
        <p className="text-body-medium text-on-surface-variant">
          캐릭터의 기본 정보와 AI 프롬프트를 입력해주세요
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          캐릭터 이름 <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="캐릭터 이름 입력"
          maxLength={100}
          className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
        />
        <div className="text-xs text-on-surface-variant mt-1 text-right">
          {formData.name.length}/100
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          성별
        </label>
        <div className="flex gap-3">
          {['male', 'female', 'other'].map((gender) => (
            <label key={gender} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value={gender}
                checked={formData.gender === gender}
                onChange={(e) => updateFormData({ gender: e.target.value })}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="text-sm">
                {gender === 'male' ? '남성' : gender === 'female' ? '여성' : '기타'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Profile Image */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          프로필 사진
        </label>
        <p className="text-xs text-on-surface-variant mb-3">
          JPG, PNG, WebP, GIF 형식, 최대 5MB
        </p>

        {formData.imageUrl ? (
          // 이미지 미리보기
          <div className="relative w-48 h-48 rounded-xl overflow-hidden group">
            {!imageError ? (
              <>
                <img
                  src={formData.imageUrl}
                  alt="프로필 미리보기"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={handleRemoveImage}
                    className="p-3 bg-error rounded-full hover:bg-error/90 transition-colors"
                    title="이미지 제거"
                  >
                    <X className="w-5 h-5 text-on-error" />
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container text-on-surface-variant">
                <ImageIcon className="w-12 h-12 mb-2" />
                <span className="text-xs">이미지 로드 실패</span>
                <button
                  onClick={handleRemoveImage}
                  className="mt-2 text-xs text-error hover:underline"
                >
                  제거
                </button>
              </div>
            )}
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
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm text-on-surface-variant">
                    이미지 업로드 중...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-on-surface-variant mb-3" />
                  <p className="text-sm font-medium text-on-surface mb-1">
                    클릭하여 이미지 선택
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    또는 이미지를 드래그 & 드롭하세요
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {uploadError && (
          <div className="mt-2 p-3 rounded-lg bg-error-container/30 text-error text-sm">
            {uploadError}
          </div>
        )}
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          소개 <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={formData.tagline}
          onChange={(e) => updateFormData({ tagline: e.target.value })}
          placeholder="캐릭터를 한 줄로 소개해주세요"
          maxLength={200}
          className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors"
        />
        <div className="text-xs text-on-surface-variant mt-1 text-right">
          {formData.tagline.length}/200
        </div>
      </div>

      {/* Description (AI Prompt) */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          AI 프롬프트 <span className="text-error">*</span>
        </label>
        <p className="text-xs text-on-surface-variant mb-2">
          AI에게 전달할 캐릭터의 역할, 외모, 성격, 말투 등을 자세히 작성해주세요
        </p>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="캐릭터의 역할, 외모, 성격, 말투 등을 상세히 입력해주세요..."
          rows={8}
          maxLength={2000}
          className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors resize-none"
        />
        <div className="flex justify-between items-center mt-1">
          <span
            className={`text-xs ${formData.description.length < 50 ? 'text-error' : 'text-on-surface-variant'}`}
          >
            최소 50자 이상
          </span>
          <span className="text-xs text-on-surface-variant">
            {formData.description.length}/2000
          </span>
        </div>
      </div>

      {/* Example Dialogues */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block text-sm font-medium text-on-surface">
              예시 말투
            </label>
            <p className="text-xs text-on-surface-variant mt-1">
              캐릭터의 대화 스타일을 AI에게 알려주세요 (선택사항)
            </p>
          </div>
          <button
            onClick={addExampleDialogue}
            className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            예시 추가
          </button>
        </div>

        <div className="space-y-4">
          {formData.exampleDialogues.map((dialogue, idx) => (
            <div key={dialogue.id} className="glass-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-on-surface">
                  예시 {idx + 1}
                </span>
                <button
                  onClick={() => removeExampleDialogue(dialogue.id)}
                  className="p-2 hover:bg-error-container rounded-lg transition-colors"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4 text-error" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">
                    상황
                  </label>
                  <textarea
                    value={dialogue.situation}
                    onChange={(e) =>
                      updateExampleDialogue(
                        dialogue.id,
                        'situation',
                        e.target.value,
                      )
                    }
                    placeholder="{{user}}가 캐릭터에게 인사를 건넸다"
                    rows={2}
                    maxLength={200}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors resize-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-on-surface-variant mb-1">
                    답변
                  </label>
                  <textarea
                    value={dialogue.response}
                    onChange={(e) =>
                      updateExampleDialogue(
                        dialogue.id,
                        'response',
                        e.target.value,
                      )
                    }
                    placeholder="안녕! 만나서 반가워~ 오늘 기분이 어때?"
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          {formData.exampleDialogues.length === 0 && (
            <div className="text-center py-8 text-on-surface-variant">
              <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                예시 말투를 추가하여 캐릭터의 대화 스타일을 설정하세요
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
