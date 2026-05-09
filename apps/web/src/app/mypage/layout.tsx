'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TopNav } from '@/components/layout/TopNav';

interface Tab {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const tabs: Tab[] = [
  { href: '/mypage', label: 'Profile', icon: 'account_circle', exact: true },
  { href: '/mypage/characters', label: '내 캐릭터', icon: 'palette' },
  { href: '/mypage/personas', label: '내 페르소나', icon: 'face' },
];

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isActive = (tab: Tab) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname.startsWith(tab.href);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* Tab Navigation */}
      <div className="sticky top-16 z-40 glass-panel border-b border-outline-variant/30">
        <div className="max-w-5xl mx-auto px-container-padding">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const active = isActive(tab);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all whitespace-nowrap ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span
                    className={`material-symbols-${active ? 'filled' : 'outlined'}`}
                  >
                    {tab.icon}
                  </span>
                  <span className="text-label-large font-medium">
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-container-padding py-8">
        {children}
      </main>
    </div>
  );
}
