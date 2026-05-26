'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shuffle, ChevronDown, X } from 'lucide-react';
import { generateRandomPersona } from '@/lib/utils/personaTemplates';
import { personaClient, characterClient } from '@/lib/connectrpc/client';

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
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: async () => {
      const response = await personaClient.listPersonas({});
      console.log('listPersonas response:', response);
      console.log('response.personas:', response.personas);
      console.log('Is personas an array?', Array.isArray(response.personas));
      return response.personas;
    },
    enabled: isOpen,
  });

  // Fetch universe characters if universeId exists
  const { data: universeCharacters } = useQuery({
    queryKey: ['universe-characters-for-persona', universeId],
    queryFn: async () => {
      if (!universeId) return [];
      const response = await characterClient.listCharacters({
        universeId,
        limit: 50,
        offset: 0,
      });
      return response.characters.filter((char) => char.id !== characterId);
    },
    enabled: isOpen && !!universeId && mode === 'create',
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
      const defaultPersona = Array.isArray(personas)
        ? personas.find((p) => p.isDefault)
        : undefined;
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
      setSelectedCharacterName('');
    }, 200);
  };

  const handleRandomGenerate = () => {
    const gender = personaGender as 'male' | 'female' | 'other' || 'other';
    const randomPersona = generateRandomPersona(gender);
    setPersonaSettings(randomPersona);
  };

  const handleCharacterSelect = (characterId: string) => {
    if (!characterId || characterId === '') {
      // Reset to manual input
      setSourceCharacterId('');
      setSelectedCharacterName('');
      setPersonaName('');
      setPersonaSettings('');
      setPersonaGender('');
    } else {
      // Select character
      const character = universeCharacters?.find((c) => c.id === characterId);
      if (character) {
        setSourceCharacterId(character.id);
        setSelectedCharacterName(character.name);
        setPersonaName(character.name);
        if (character.description) {
          setPersonaSettings(character.description);
        }
      }
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

  const isCharacterBased = !!sourceCharacterId;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-200 overflow-y-auto ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div
        className={`glass-card p-6 max-w-2xl w-full my-8 transition-all duration-200 max-h-[90vh] overflow-y-auto ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-title-large mb-2">페르소나 선택</h3>
        <p className="text-body-medium text-on-surface-variant mb-6">
          <strong>{characterName}</strong>와 대화할 때 사용할 페르소나를 선택하거나
          새로 만드세요
        </p>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-surface-container rounded-xl">
          <button
            onClick={() => setMode('select')}
            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
              mode === 'select'
                ? 'bg-primary text-on-primary shadow-lg'
                : 'text-on-surface hover:bg-surface-container-high'
            }`}
          >
            기존 페르소나 선택
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 px-4 py-2 rounded-lg transition-all ${
              mode === 'create'
                ? 'bg-primary text-on-primary shadow-lg'
                : 'text-on-surface hover:bg-surface-container-high'
            }`}
          >
            새로 만들기
          </button>
        </div>

        {/* Select Mode */}
        {mode === 'select' && (
          <div className="space-y-4">
            <div className="relative">
              <select
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId(e.target.value)}
                className="w-full px-4 py-3 pr-10 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="">페르소나를 선택하세요...</option>
                {Array.isArray(personas) && personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} {persona.isDefault && '(기본)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-on-surface-variant" />
            </div>

            {selectedPersonaId && (
              <div className="p-4 bg-surface-container rounded-xl">
                <div className="text-body-small text-on-surface-variant">
                  선택된 페르소나:{' '}
                  <span className="text-on-surface font-medium">
                    {Array.isArray(personas) &&
                      personas.find((p) => p.id === selectedPersonaId)?.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Mode */}
        {mode === 'create' && (
          <div className="space-y-4">
            {/* Universe Character Selection */}
            {universeId && universeCharacters && universeCharacters.length > 0 && (
              <div>
                <label className="block text-label-large mb-3">
                  같은 세계관의 캐릭터 선택 (선택사항)
                </label>
                <p className="text-body-small text-on-surface-variant mb-3">
                  캐릭터를 선택하면 해당 캐릭터의 설정이 자동으로 적용됩니다
                </p>

                {/* Manual Input Option */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer mb-3 ${
                    !sourceCharacterId
                      ? 'border-primary bg-primary-container/20'
                      : 'border-outline-variant bg-surface-container hover:bg-surface-container-high'
                  }`}
                >
                  <input
                    type="radio"
                    name="characterSource"
                    checked={!sourceCharacterId}
                    onChange={() => handleCharacterSelect('')}
                    className="w-5 h-5 text-primary"
                  />
                  <div className="flex-1">
                    <div className="text-title-small font-medium">직접 입력하기</div>
                    <div className="text-body-small text-on-surface-variant">
                      나만의 페르소나를 자유롭게 만듭니다
                    </div>
                  </div>
                </label>

                {/* Character Options */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {universeCharacters.map((char) => (
                    <label
                      key={char.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        sourceCharacterId === char.id
                          ? 'border-primary bg-primary-container/20'
                          : 'border-outline-variant bg-surface-container hover:bg-surface-container-high'
                      }`}
                    >
                      <input
                        type="radio"
                        name="characterSource"
                        checked={sourceCharacterId === char.id}
                        onChange={() => handleCharacterSelect(char.id)}
                        className="w-5 h-5 text-primary flex-shrink-0"
                      />

                      {/* Character Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container-highest flex-shrink-0">
                        {char.imageUrl ? (
                          <img
                            src={char.imageUrl}
                            alt={char.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-on-surface-variant">
                              person
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Character Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-title-small font-medium mb-1">{char.name}</div>
                        {char.tagline && (
                          <div className="text-body-small text-on-surface-variant line-clamp-2">
                            {char.tagline}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {isCharacterBased && (
                  <div className="mt-3 p-3 bg-primary-container/30 rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">
                      info
                    </span>
                    <p className="text-body-small text-on-surface flex-1">
                      <strong>{selectedCharacterName}</strong> 캐릭터 기반 페르소나가
                      적용되었습니다. 설정을 수정할 수 없습니다.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Name Input */}
            <div>
              <label className="block text-label-large mb-2">이름</label>
              <input
                type="text"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="페르소나 이름"
                disabled={isCharacterBased}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Gender Selection */}
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
                    onClick={() => !isCharacterBased && setPersonaGender(option.value)}
                    disabled={isCharacterBased}
                    className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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

            {/* Settings Textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-label-large">설정</label>
                {!isCharacterBased && (
                  <button
                    onClick={handleRandomGenerate}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary transition-colors text-label-medium"
                  >
                    <Shuffle className="w-4 h-4" />
                    랜덤 생성
                  </button>
                )}
              </div>
              <textarea
                value={personaSettings}
                onChange={(e) => setPersonaSettings(e.target.value)}
                placeholder="나이: 20대 초반&#10;키: 165cm&#10;직업: 학생&#10;..."
                rows={8}
                disabled={isCharacterBased}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant focus:border-primary focus:outline-none transition-colors resize-none font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {isCharacterBased && (
                <p className="text-body-small text-on-surface-variant mt-2">
                  캐릭터 기반 페르소나는 설정을 수정할 수 없습니다
                </p>
              )}
            </div>
          </div>
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
