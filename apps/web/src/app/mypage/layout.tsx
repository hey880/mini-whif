'use client';

import { TopNav } from '@/components/layout/TopNav';

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* Content */}
      <main className="max-w-5xl mx-auto px-container-padding py-8 pb-32 lg:pb-24">
        {children}
      </main>
    </div>
  );
}
