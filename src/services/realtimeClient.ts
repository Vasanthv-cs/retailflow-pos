import { API_BASE_URL, getApiAuthToken } from '@/src/services/apiClient';

export interface RealtimeMessage<T = unknown> {
  eventType: string;
  storeId: string;
  timestamp: string;
  data: T;
}

export type RealtimeEventHandler<T = unknown> = (data: T) => void;

class RealtimeClient {
  private abortController: AbortController | null = null;
  private listeners: Map<string, Set<RealtimeEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    // Inter-tab synchronization channel so multiple browser tabs see real-time updates
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('retailflow_realtime');
        this.broadcastChannel.onmessage = (event) => {
          const { eventType, data } = event.data || {};
          if (eventType) {
            this.notifyListeners(eventType, data);
          }
        };
      } catch {
        // Fallback gracefully if BroadcastChannel is blocked
      }
    }
  }

  public connect(storeId = 'store-1') {
    if (typeof window === 'undefined') return;
    if (this.abortController) {
      return;
    }

    const token = getApiAuthToken();
    const sseUrl = `${API_BASE_URL}/events?storeId=${encodeURIComponent(storeId)}`;
    const controller = new AbortController();
    this.abortController = controller;

    fetch(sseUrl, {
      credentials: 'include',
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error(`SSE HTTP ${response.status}`);
        }
        this.reconnectAttempts = 0;
        console.info('[Realtime] Connected to RetailFlow SSE event stream');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = 'message';
        let currentData = '';

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line === '') {
              if (currentData) {
                if (currentEvent === 'CONNECTED') {
                  console.debug('[Realtime] Subscription active:', currentData);
                } else {
                  this.handleEvent(currentEvent, currentData);
                }
              }
              currentEvent = 'message';
              currentData = '';
            } else if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              currentData += (currentData ? '\n' : '') + line.slice(5).trim();
            }
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          this.disconnect();
          this.scheduleReconnect(storeId);
        }
      });
  }

  public disconnect() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public on<T = unknown>(eventType: string, handler: RealtimeEventHandler<T>) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler as RealtimeEventHandler);

    return () => {
      this.listeners.get(eventType)?.delete(handler as RealtimeEventHandler);
    };
  }

  /**
   * Broadcast an event across all open browser sessions and tabs
   */
  public broadcastLocally<T = unknown>(eventType: string, data: T) {
    this.notifyListeners(eventType, data);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ eventType, data });
    }
  }

  private handleEvent(eventType: string, rawData: string) {
    try {
      const parsed = JSON.parse(rawData);
      const payload = parsed.data !== undefined ? parsed.data : parsed;
      this.notifyListeners(eventType, payload);

      // Forward to other tabs in the same browser
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ eventType, data: payload });
      }
    } catch {
      this.notifyListeners(eventType, rawData);
    }
  }

  private notifyListeners(eventType: string, data: unknown) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (e) {
          console.error(`[Realtime] Handler error for ${eventType}:`, e);
        }
      });
    }
  }

  private scheduleReconnect(storeId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectTimer = setTimeout(() => {
        this.connect(storeId);
      }, delay);
    }
  }
}

export const realtimeClient = new RealtimeClient();
