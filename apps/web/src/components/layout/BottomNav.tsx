'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/', label: '홈', icon: 'home' },
  { href: '/chats', label: '채팅', icon: 'chat_bubble' },
  { href: '/mypage', label: '마이페이지', icon: 'account_circle' },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // 하단 바를 숨길 페이지들
  const shouldHideBottomNav = () => {
    // 채팅방 페이지
    if (pathname.startsWith('/chat/')) return true;
    // 캐릭터 상세 페이지
    if (pathname.match(/^\/characters\/[^/]+$/)) return true;
    // 로그인/회원가입 페이지
    if (pathname === '/login' || pathname === '/signup') return true;

    return false;
  };

  // 숨겨야 할 페이지에서는 렌더링하지 않음
  if (shouldHideBottomNav()) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-outline-variant/30 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-7xl mx-auto px-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all min-w-[72px] ${
                active
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span
                className={`material-symbols-${active ? 'filled' : 'outlined'} text-2xl ${
                  active ? 'drop-shadow-[0_0_8px_rgba(147,51,234,0.5)]' : ''
                }`}
              >
                {item.icon}
              </span>
              <span className="text-label-small font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
