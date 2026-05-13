'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shuffle, Plus, ChevronDown } from 'lucide-react';
import { generateRandomPersona } from '@/lib/utils/personaTemplates';
import { CharacterCardGrid } from '../character/CharacterCardGrid';
import { personaClient } from '@/lib/connectrpc/client';

interface PersonaSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId: string;
  characterName: string;
  universeId?: string;
  onComplete: (personaId: string) => void;
}

export function PersonaSelectionModal({
  isOpen,
  onClose,
  characterId,
  characterName,
  universeId,
  onComplete,
}: PersonaSelectionModalProps) {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [personaName, setPersonaName] = useState('');
  const [personaGender, setPersonaGender] = useState<string>('');
  const [personaSettings, setPersonaSettings] = useState('');
  const [sourceCharacterId, setSourceCharacterId] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const response = await personaClient.listPersonas({});
      return response.personas;
    },
    enabled: isOpen,
  });

  const createPersonaMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      persona: string;
      gender?: string;
      sourceCharacterId?: string;
    }) => {
      const response = await personaClient.createPersona({
        name: data.name,
        persona: data.persona,
        isDefault: false,
        gender: data.gender,
        sourceCharacterId: data.sourceCharacterId,
      });
      return response.persona;
    },
  });

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Set default persona if exists
      const defaultPersona = personas?.find((p) => p.isDefault);
      if (defaultPersona) {
        setSelectedPersonaId(defaultPersona.id);
      }
    }
  }, [isOpen, personas]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      setMode('select');
      setSelectedPersonaId('');
      setPersonaName('');
      setPersonaGender('');
      setPersonaSettings('');
      setSourceCharacterId('');
    }, 200);
  };

  const handleRandomGenerate = () => {
    const gender = personaGender as 'male' | 'female' | 'other' || 'other';
    const randomPersona = generateRandomPersona(gender);
    setPersonaSettings(randomPersona);
  };

  const handleCharacterSelect = async (character: any) => {
    setSourceCharacterId(character.id);
    setPersonaName(character.name);
    if (character.description) {
      setPersonaSettings(character.description);
    }
  };

  const handleStart = async () => {
    if (mode === 'select' && selectedPersonaId) {
      onComplete(selectedPersonaId);
      handleClose();
    } else if (mode === 'create') {
      if (!personaName.trim() || !personaSettings.trim()) {
        alert('이름과 설정을 모두 입력해주세요');
        return;
      }

      const persona = await createPersonaMutation.mutateAsync({
        name: personaName,
        persona: personaSettings,
        gender: personaGender || undefined,
        sourceCharacterId: sourceCharacterId || undefined,
      });

      if (persona) {
        onComplete(persona.id);
      }
      handleClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-200 overflow-y-auto ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`glass-card p-6 max-w-2xl w-full my-8 transition-all duration-200 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-title-large mb-2">페르소나 선택</h3>
        <p className="text-body-medium text-on-surface-variant mb-6">
          <strong>{characterName}</strong>와 대화할 때 사용할 페르소나를 선택하거나
          새로 만드세요
        </p>

        {/* Section 1: Select Existing Persona */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-title-medium">기존 페르소나</h4>
            <button
              onClick={() => setMode('create')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors text-label-large"
            >
              <Plus className="w-4 h-4" />
              새로 만들기
            </button>
          </div>

          {mode === 'select' && (
            <div className="relative">
              <select
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                className="w-full px-4 py-3 pr-10 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="">페르소나 선택...</option>
                {personas?.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} {persona.isDefault && '(기본)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-on-surface-variant" />
            </div>
          )}
        </div>

        {/* Section 2: Create New Persona */}
        {mode === 'create' && (
          <>
            {/* Same Universe Characters */}
            {universeId && (
              <div className="mb-6">
                <h4 className="text-title-medium mb-3">같은 세계관의 캐릭터</h4>
                <p className="text-body-small text-on-surface-variant mb-3">
                  캐릭터를 클릭하면 해당 캐릭터 기반 페르소나가 자동으로 채워집니다
                </p>
                <CharacterCardGrid
                  universeId={universeId}
                  onCharacterSelect={handleCharacterSelect}
                  excludeCharacterId={characterId}
                />
              </div>
            )}

            {/* Persona Editor */}
            <div className="space-y-4">
              <div>
                <label className="block text-label-large mb-2">이름</label>
                <input
                  type="text"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  placeholder="페르소나 이름"
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-label-large mb-2">성별</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'male', label: '남성' },
                    { value: 'female', label: '여성' },
                    { value: 'other', label: '기타' },
                    { value: '', label: '미지정' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPersonaGender(option.value)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        personaGender === option.value
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container hover:bg-surface-container-high'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-label-large">설정</label>
                  <button
                    onClick={handleRandomGenerate}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary transition-colors text-label-medium"
                  >
                    <Shuffle className="w-4 h-4" />
                    랜덤 생성
                  </button>
                </div>
                <textarea
                  value={personaSettings}
                  onChange={(e) => setPersonaSettings(e.target.value)}
                  placeholder="나이: 20대 초반&#10;키: 165cm&#10;직업: 학생&#10;..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-colors resize-none font-mono text-sm"
                />
              </div>

              <button
                onClick={() => {
                  setMode('select');
                  setPersonaName('');
                  setPersonaGender('');
                  setPersonaSettings('');
                  setSourceCharacterId('');
                }}
                className="w-full px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-label-large"
              >
                취소
              </button>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
          >
            닫기
          </button>
          <button
            onClick={handleStart}
            disabled={
              (mode === 'select' && !selectedPersonaId) ||
              (mode === 'create' && (!personaName.trim() || !personaSettings.trim()))
            }
            className="flex-1 px-6 py-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            채팅 시작
          </button>
        </div>
      </div>
    </div>
  );
}
