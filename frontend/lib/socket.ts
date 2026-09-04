/**
 * frontend/lib/socket.ts
 * Native WebSocket client that connects to the backend /ws/<project_id> endpoint.
 * Uses 30-second polling fallback if WebSocket fails to connect.
 */

import { BASE_URL, getTokens } from "@/lib/apiClient";

type EventHandler = (data: unknown) => void;
type EventMap = Record<string, EventHandler[]>;

class FieldPulseSocket {
  private ws: WebSocket | null = null;
  private projectId: string | null = null;
  private listeners: EventMap = {};
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private usingPolling = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  connect(projectId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.projectId === projectId) return;
    this.disconnect();
    this.projectId = projectId;

    const { access } = getTokens();
    const wsBase = BASE_URL.replace(/^http/, "ws");
    const url = `${wsBase}/ws/${projectId}${access ? `?token=${access}` : ""}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("[WS] Connected to project room:", projectId);
        this.usingPolling = false;
        if (this.pollingInterval) {
          clearInterval(this.pollingInterval);
          this.pollingInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const { event: evtName, data } = JSON.parse(event.data);
          this._emit(evtName, data);
        } catch {
          console.warn("[WS] Could not parse message:", event.data);
        }
      };

      this.ws.onclose = () => {
        console.log("[WS] Disconnected — starting 30s polling fallback");
        this._startPollingFallback();
      };

      this.ws.onerror = () => {
        console.warn("[WS] Connection error — falling back to polling");
        this._startPollingFallback();
      };
    } catch {
      this._startPollingFallback();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.projectId = null;
    this.usingPolling = false;
  }

  on(event: string, handler: EventHandler): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners[event] = (this.listeners[event] ?? []).filter((h) => h !== handler);
  }

  private _emit(event: string, data: unknown): void {
    (this.listeners[event] ?? []).forEach((h) => h(data));
  }

  private _startPollingFallback(): void {
    if (this.usingPolling || !this.projectId) return;
    this.usingPolling = true;
    // Emit a synthetic "poll" event every 30 seconds so
    // components can re-fetch data using TanStack Query invalidation
    this.pollingInterval = setInterval(() => {
      this._emit("poll", { projectId: this.projectId });
    }, 30_000);
  }

  get isPolling(): boolean {
    return this.usingPolling;
  }
}

// Singleton
export const socket = new FieldPulseSocket();
