'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/**
 * Supabase 인증 상태를 authStore와 동기화하는 컴포넌트
 * 앱 전체에서 인증 상태를 일관되게 유지합니다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 초기 세션 확인 - 앱 시작 시 한 번 실행
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          useAuthStore.getState().setSession(session);
        } else {
          // 세션이 없으면 명시적으로 로그아웃 상태로 설정
          useAuthStore.getState().logout();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // 에러가 발생해도 로그아웃 상태로 설정
        useAuthStore.getState().logout();
      } finally {
        // 초기화 완료 표시
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // 인증 상태 변경 리스너 설정 - 로그인/로그아웃 시 자동 동기화
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 디버깅용 로그 (프로덕션에서는 제거 가능)
        if (process.env.NODE_ENV === 'development') {
          console.log('Auth state changed:', event, session?.user?.id);
        }

        if (session) {
          useAuthStore.getState().setSession(session);
        } else {
          useAuthStore.getState().logout();
        }
      }
    );

    // 클린업: 리스너 해제
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 초기화 전에는 로딩 표시 (선택적)
  // 깜빡임을 방지하려면 주석 해제
  // if (!isInitialized) {
  //   return null; // 또는 로딩 스피너
  // }

  return <>{children}</>;
}
