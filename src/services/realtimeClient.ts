import { API_BASE_URL, getApiAuthToken } from '@/src/services/apiClient';

export interface RealtimeMessage<T = unknown> {
  eventType: string;
  storeId: string;
  timestamp: string;
  data: T;
}

export type RealtimeEventHandler<T = unknown> = (data: T) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
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
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    const token = getApiAuthToken();
    const sseUrl = `${API_BASE_URL}/events?storeId=${encodeURIComponent(storeId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        console.info('[Realtime] Connected to RetailFlow SSE event stream');
      };

      this.eventSource.addEventListener('CONNECTED', (event: MessageEvent) => {
        console.debug('[Realtime] Subscription active:', event.data);
      });

      this.eventSource.addEventListener('INVENTORY_UPDATE', (event: MessageEvent) => {
        this.handleEvent('INVENTORY_UPDATE', event.data);
      });

      this.eventSource.addEventListener('NEW_SALE', (event: MessageEvent) => {
        this.handleEvent('NEW_SALE', event.data);
      });

      this.eventSource.addEventListener('LOW_STOCK_ALERT', (event: MessageEvent) => {
        this.handleEvent('LOW_STOCK_ALERT', event.data);
      });

      this.eventSource.addEventListener('PURCHASE_ORDER_UPDATE', (event: MessageEvent) => {
        this.handleEvent('PURCHASE_ORDER_UPDATE', event.data);
      });

      this.eventSource.onerror = () => {
        this.disconnect();
        this.scheduleReconnect(storeId);
      };
    } catch {
      // In offline mode or preview without active backend, client remains functional
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
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
