'use client';

import { useState, useRef } from 'react';
import { Plus, Trash2, User, Image as ImageIcon, Upload, X } from 'lucide-react';
import { useCharacterWizardStore } from '@/stores/characterWizardStore';
import { uploadImage, validateImageFile } from '@/lib/uploadImage';
import { useQuery } from '@tanstack/react-query';
import { universeClient } from '@/lib/connectrpc/client';
import { useAuthStore } from '@/stores/authStore';

export function Step1BasicSettings() {
  const { formData, updateFormData } = useCharacterWizardStore();
  const { user } = useAuthStore();
  const [imageError, setImageError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch user's universes
  const { data: universesData } = useQuery({
    queryKey: ['my-universes', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await universeClient.listUniverses({
        creatorId: user.id,
        limit: 100,
        offset: 0,
      });
    },
    enabled: !!user?.id,
  });

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

  const universes = universesData?.universes || [];

  return (
    <div className="wizard-step space-y-6">
      <div>
        <h2 className="text-headline-medium mb-2">기본설정</h2>
        <p className="text-body-medium text-on-surface-variant">
          캐릭터의 기본 정보와 AI 프롬프트를 입력해주세요
        </p>
      </div>

      {/* Universe Selection */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          캐릭터가 등장할 작품 선택
        </label>
        <select
          value={formData.universeId || ''}
          onChange={(e) => {
            const value = e.target.value;
            updateFormData({
              universeId: value || undefined,
              noUniverse: !value,
            });
          }}
          disabled={formData.noUniverse}
          className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">작품 선택 (선택사항)</option>
          {universes.map((universe) => (
            <option key={universe.id} value={universe.id}>
              {universe.name}
            </option>
          ))}
        </select>

        {/* No Universe Checkbox */}
        <label className="flex items-start gap-3 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.noUniverse}
            onChange={(e) => {
              const checked = e.target.checked;
              updateFormData({
                noUniverse: checked,
                universeId: checked ? undefined : formData.universeId,
              });
            }}
            className="mt-1 w-4 h-4 text-primary focus:ring-primary rounded"
          />
          <div className="flex-1">
            <span className="text-sm text-on-surface">작품 없이 만들기</span>
            {formData.noUniverse && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg">
                캐릭터가 단독으로 공개되며, 작품 둘러보기에는 보이지 않아요. 나중에
                작품에 추가할 수는 없어요.
              </p>
            )}
          </div>
        </label>

        {universes.length === 0 && !formData.noUniverse && (
          <p className="text-xs text-on-surface-variant mt-2">
            작품이 없습니다.{' '}
            <a href="/mypage/my-universes" className="text-primary hover:underline">
              작품을 먼저 만들어보세요
            </a>
          </p>
        )}
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

      {/* UI Description */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          상세 페이지 설명 <span className="text-error">*</span>
        </label>
        <p className="text-xs text-on-surface-variant mb-2">
          사용자에게 보여질 캐릭터 설명 (2000자 제한)
        </p>
        <textarea
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="캐릭터의 기본 정보, 설정 등을 입력해주세요..."
          rows={6}
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

      {/* AI Prompt Description */}
      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          AI 프롬프트 설명
        </label>
        <p className="text-xs text-on-surface-variant mb-2">
          AI에게 전달할 상세한 캐릭터 정보 (역할, 외모, 성격, 말투 등 - 5000자 제한, 선택사항)
        </p>
        <textarea
          value={formData.aiPromptDescription}
          onChange={(e) => updateFormData({ aiPromptDescription: e.target.value })}
          placeholder="AI가 캐릭터를 더 잘 이해하고 연기할 수 있도록 상세한 정보를 입력해주세요. 비워두면 상세 페이지 설명이 사용됩니다..."
          rows={10}
          maxLength={5000}
          className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant/30 focus:border-primary focus:outline-none transition-colors resize-none"
        />
        <div className="text-xs text-on-surface-variant mt-1 text-right">
          {formData.aiPromptDescription.length}/5000
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
