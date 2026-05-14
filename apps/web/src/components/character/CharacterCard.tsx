'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';

interface CharacterCardProps {
  id: string;
  name: string;
  tagline?: string;
  imageUrl?: string;
  totalChatCount: number;
  keywords: string[];
  isNsfw: boolean;
  rank?: number;
  creatorDisplayName?: string;
}

export function CharacterCard({
  id,
  name,
  tagline,
  imageUrl,
  totalChatCount,
  keywords,
  isNsfw,
  rank,
  creatorDisplayName,
}: CharacterCardProps) {
  const isPremium = rank === 1;

  return (
    <Link
      href={`/characters/${id}`}
      className={`character-card ${isPremium ? 'persona-pulse' : ''}`}
    >
      <div className="aspect-[3/4] relative overflow-hidden rounded-t-2xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant">
              person
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-32 gradient-overlay-bottom" />

        {/* NSFW badge */}
        {isNsfw && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 rounded-full bg-error/80 text-on-error text-label-small font-medium">
              NSFW
            </span>
          </div>
        )}

        {/* Rank badge */}
        {rank && rank <= 3 && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-1 rounded-full bg-primary/80 text-on-primary text-label-small font-medium">
              #{rank}
            </span>
          </div>
        )}

        {/* Character info overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-title-large font-headline text-on-surface mb-1 truncate">
            {name}
          </h3>
          {tagline && (
            <p className="text-body-small text-on-surface-variant line-clamp-2">
              {tagline}
            </p>
          )}
        </div>
      </div>

      {/* Card footer */}
      <div className="p-4">
        {/* Keywords */}
        <div className="flex flex-wrap gap-1 mb-3">
          {keywords?.slice(0, 3).map((keyword) => (
            <span
              key={keyword}
              className="px-2 py-0.5 rounded-full bg-surface-container-high text-label-small text-on-surface-variant"
            >
              {keyword}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-body-small text-on-surface-variant">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-base">chat</span>
            <span>{formatNumber(totalChatCount)}</span>
          </div>
          {creatorDisplayName && (
            <span className="text-label-small truncate max-w-[120px]">
              by {creatorDisplayName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
