import { useQueryClient } from '@tanstack/react-query';
import { flushSync } from 'react-dom';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase';

interface SSEEvent {
  event_id: number;
  content: string;
  is_final_event: boolean;
  model?: string;
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;

        // Split by newlines but keep incomplete line in buffer
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || ''; // Keep last incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: SSEEvent = JSON.parse(line.slice(6));

              // DEBUG: Log when SSE event arrives
              const startTime = performance.now();

              // ✅ CRITICAL: Force immediate synchronous rendering
              // This bypasses React 19 batching completely
              flushSync(() => {
                appendStreamChunk(data.content);
              });

              const renderTime = performance.now() - startTime;

              if (data.is_final_event) {
                // Final update
                flushSync(() => {
                  appendStreamChunk(data.content);
                });

                // Invalidate queries first to trigger refetch
                const refetchPromises = [
                  queryClient.invalidateQueries({
                    queryKey: ['messages', roomId],
                  }),
                  queryClient.invalidateQueries({
                    queryKey: ['chatRooms'],
                  }),
                  queryClient.invalidateQueries({
                    queryKey: ['wallet'],
                  }),
                ];

                // Wait for refetch to complete before hiding streaming UI
                Promise.all(refetchPromises).then(() => {
                  // Small delay to ensure DOM has updated
                  setTimeout(() => {
                    setStreaming(false);
                    // Clear optimistic message after real messages loaded
                    setOptimisticUserMessage(null);
                  }, 100);
                });
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      setStreaming(false);
      setOptimisticUserMessage(null); // Clear on error
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return { sendMessage };
}
