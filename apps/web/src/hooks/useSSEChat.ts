import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase';

interface SSEEvent {
  event_id: number;
  content: string;
  is_final_event: boolean;
  model?: string;
  error?: boolean;        // ✅ 추가
  errorMessage?: string;  // ✅ 추가
}

export function useSSEChat() {
  const { setStreaming, appendStreamChunk, resetStream, setOptimisticUserMessage } = useChatStore();
  const queryClient = useQueryClient();

  const sendMessage = async (roomId: string, message: string, hint?: string) => {
    // Optimistic UI: Show user message immediately
    if (message) {
      setOptimisticUserMessage({
        id: 'optimistic-' + Date.now(),
        content: message,
        timestamp: new Date().toISOString(),
      });
    }

    setStreaming(true);
    resetStream();

    // Get auth token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    try {
      const body: { content?: string; hint?: string } = {};
      if (message) body.content = message;
      if (hint) body.hint = hint;

      const response = await fetch(`${apiUrl}/chat-rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        setStreaming(false);

        // Check Content-Type to handle different error responses
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send message');
        } else {
          // Handle SSE error stream
          const text = await response.text();
          throw new Error(text || `Server error: ${response.status}`);
        }
      }

      // Read SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = ''; // Buffer for incomplete lines
      let receivedFinalEvent = false;  // ✅ 플래그 추가
      let hasReceivedAnyContent = false;

      // ✅ 스트림 타임아웃 설정 (2분)
      const STREAM_TIMEOUT = 120000;
      const streamTimeoutId = setTimeout(() => {
        console.error('Stream timeout after 2 minutes');
        reader.cancel();
      }, STREAM_TIMEOUT);

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('Stream ended', { receivedFinalEvent, hasReceivedAnyContent });

            // ✅ 스트림이 끝났는데 final event를 받지 못한 경우
            if (!receivedFinalEvent) {
              console.warn('Stream ended without final event - forcing cleanup');
              setStreaming(false);
              setOptimisticUserMessage(null);

              // 메시지 목록 강제 갱신
              setTimeout(async () => {
                await Promise.all([
                  queryClient.invalidateQueries({
                    queryKey: ['messages', roomId],
                    refetchType: 'active',
                  }),
                  queryClient.invalidateQueries({
                    queryKey: ['chatRooms'],
                    refetchType: 'active',
                  }),
                  queryClient.invalidateQueries({
                    queryKey: ['wallet'],
                    refetchType: 'active',
                  }),
                ]);
              }, 500);
            }
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          lineBuffer += chunk;

          // Split by newlines but keep incomplete line in buffer
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || ''; // Keep last incomplete line

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: SSEEvent = JSON.parse(line.slice(6));

                // 콘텐츠 업데이트
                if (data.content) {
                  appendStreamChunk(data.content);
                  hasReceivedAnyContent = true;
                }

                // ✅ 에러 이벤트 처리
                if ('error' in data && data.error) {
                  console.error('Received error event from server:', data);
                }

                if (data.is_final_event) {
                  receivedFinalEvent = true;  // ✅ 플래그 설정
                  setStreaming(false);
                  // Clear optimistic message after real messages loaded
                  setOptimisticUserMessage(null);

                  // 백엔드의 DB 업데이트(Gem 차감 등) 완료를 위해 짧은 지연 후 쿼리 무효화
                  // SSE 이벤트 중계와 DB 업데이트가 비동기적으로 처리되므로 타이밍 이슈 방지
                  setTimeout(async () => {
                    await Promise.all([
                      queryClient.invalidateQueries({
                        queryKey: ['messages', roomId],
                        refetchType: 'active', // 활성 쿼리 즉시 refetch
                      }),
                      queryClient.invalidateQueries({
                        queryKey: ['chatRooms'],
                        refetchType: 'active',
                      }),
                      queryClient.invalidateQueries({
                        queryKey: ['wallet'],
                        refetchType: 'active', // 활성 쿼리 즉시 refetch
                      }),
                    ]);
                  }, 500); // 500ms 지연 (300ms → 500ms)
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } finally {
        // ✅ 항상 실행되는 정리 로직
        clearTimeout(streamTimeoutId);

        // 상태 정리 보장
        if (!receivedFinalEvent) {
          setStreaming(false);
          setOptimisticUserMessage(null);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // 상태 정리
      setStreaming(false);
      setOptimisticUserMessage(null);

      // ✅ 에러 발생해도 메시지가 저장되었을 수 있으므로 갱신
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['messages', roomId],
          refetchType: 'active',
        });
      }, 1000);

      throw error;
    }
  };

  return { sendMessage };
}
