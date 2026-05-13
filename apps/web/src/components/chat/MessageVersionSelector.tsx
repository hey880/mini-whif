'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Version {
  versionNumber: number;
  content: string;
  modelSlug: string | null;
  createdAt: string;
  isCurrent: boolean;
}

interface VersionData {
  currentVersion: number;
  versions: Version[];
}

interface MessageVersionSelectorProps {
  messageId: string;
  currentVersionNumber: number;
  currentContent: string;
  onVersionChange: (content: string, versionNumber: number) => void;
}

export function MessageVersionSelector({
  messageId,
  currentVersionNumber,
  currentContent,
  onVersionChange,
}: MessageVersionSelectorProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(currentVersionNumber);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (currentVersionNumber > 1) {
      fetchVersions();
    }
  }, [messageId, currentVersionNumber]);

  const fetchVersions = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/messages/${messageId}/versions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch versions');
      }

      const data: VersionData = await response.json();
      setVersions(data.versions);
    } catch (error: any) {
      console.error('Failed to fetch versions:', error);
      toast.error('버전 기록을 불러올 수 없습니다', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevVersion = () => {
    if (selectedVersion > 1) {
      const prevVersion = versions.find(v => v.versionNumber === selectedVersion - 1);
      if (prevVersion) {
        setSelectedVersion(prevVersion.versionNumber);
        onVersionChange(prevVersion.content, prevVersion.versionNumber);
      }
    }
  };

  const handleNextVersion = () => {
    if (selectedVersion < currentVersionNumber) {
      const nextVersion = versions.find(v => v.versionNumber === selectedVersion + 1);
      if (nextVersion) {
        setSelectedVersion(nextVersion.versionNumber);
        onVersionChange(nextVersion.content, nextVersion.versionNumber);
      }
    }
  };

  const handleResetToCurrent = () => {
    setSelectedVersion(currentVersionNumber);
    onVersionChange(currentContent, currentVersionNumber);
  };

  // Only show if there are multiple versions
  if (currentVersionNumber <= 1) {
    return null;
  }

  const isViewingCurrent = selectedVersion === currentVersionNumber;

  return (
    <div className="mt-2">
      {/* Compact Version Indicator */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors text-label-small"
        >
          <History className="w-3.5 h-3.5" />
          <span className={isViewingCurrent ? 'text-on-surface' : 'text-primary font-medium'}>
            {isViewingCurrent ? '최신 버전' : `버전 ${selectedVersion}`} ({currentVersionNumber}개 버전)
          </span>
        </button>
      )}

      {/* Expanded Version Controls */}
      {isExpanded && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-surface-container-high border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-on-surface-variant" />
              <span className="text-label-medium font-medium">
                버전 기록
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-label-small text-primary hover:underline"
            >
              접기
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrevVersion}
              disabled={selectedVersion === 1}
              className="p-2 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="이전 버전"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center">
              <p className="text-title-medium font-medium">
                버전 {selectedVersion} / {currentVersionNumber}
              </p>
              <p className="text-label-small text-on-surface-variant mt-0.5">
                {isViewingCurrent ? (
                  <span className="text-primary font-medium">● 최신 버전</span>
                ) : (
                  <span>이전 버전 보기 중</span>
                )}
              </p>
            </div>

            <button
              onClick={handleNextVersion}
              disabled={selectedVersion === currentVersionNumber}
              className="p-2 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="다음 버전"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Reset to current button */}
          {!isViewingCurrent && (
            <button
              onClick={handleResetToCurrent}
              className="w-full px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-label-medium font-medium"
            >
              최신 버전으로 돌아가기
            </button>
          )}

          {/* Version list */}
          <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
            {versions.map((version) => (
              <button
                key={version.versionNumber}
                onClick={() => {
                  setSelectedVersion(version.versionNumber);
                  onVersionChange(version.content, version.versionNumber);
                }}
                className={`w-full px-3 py-2 rounded-lg text-left transition-colors ${
                  version.versionNumber === selectedVersion
                    ? 'bg-primary/20 text-primary'
                    : 'hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-label-small font-medium">
                    버전 {version.versionNumber}
                    {version.isCurrent && ' (최신)'}
                  </span>
                  <span className="text-label-small text-on-surface-variant">
                    {new Date(version.createdAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {version.modelSlug && (
                  <span className="text-label-small text-on-surface-variant">
                    {version.modelSlug}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
