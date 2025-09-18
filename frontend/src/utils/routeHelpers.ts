// Utility functions for route management and navigation
import { buildWebSocketUrl, getRouteByPath } from '../config/routes';

// WebSocket connection manager
export class WebSocketManager {
  private connections: Map<string, WebSocket> = new Map();
  
  connect(key: string, url: string, onMessage: (data: any) => void, onError?: (error: Event) => void): WebSocket {
    // Close existing connection if any
    this.disconnect(key);
    
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log(`WebSocket connected: ${key}`);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        if (onError) onError(event);
      }
    };
    
    ws.onerror = (error) => {
      console.error(`WebSocket error for ${key}:`, error);
      if (onError) onError(error);
    };
    
    ws.onclose = () => {
      console.log(`WebSocket disconnected: ${key}`);
      this.connections.delete(key);
    };
    
    this.connections.set(key, ws);
    return ws;
  }
  
  disconnect(key: string): void {
    const ws = this.connections.get(key);
    if (ws) {
      ws.close();
      this.connections.delete(key);
    }
  }
  
  disconnectAll(): void {
    this.connections.forEach((ws) => {
      ws.close();
    });
    this.connections.clear();
  }
  
  isConnected(key: string): boolean {
    const ws = this.connections.get(key);
    return ws ? ws.readyState === WebSocket.OPEN : false;
  }
}

// Global WebSocket manager instance
export const wsManager = new WebSocketManager();

// Hook for WebSocket connections with route configuration
export function useRouteWebSocket(path: string, params: Record<string, string>) {
  const route = getRouteByPath(path);
  
  if (!route?.websocketEndpoint) {
    return null;
  }
  
  const wsUrl = buildWebSocketUrl(route, params);
  const connectionKey = `${path}-${JSON.stringify(params)}`;
  
  return {
    url: wsUrl,
    key: connectionKey,
    connect: (onMessage: (data: any) => void, onError?: (error: Event) => void) => {
      return wsManager.connect(connectionKey, wsUrl, onMessage, onError);
    },
    disconnect: () => wsManager.disconnect(connectionKey),
    isConnected: () => wsManager.isConnected(connectionKey)
  };
}

// URL parameter utilities
export function getUrlParams(searchParams: URLSearchParams): Record<string, string> {
  return Object.fromEntries(searchParams.entries());
}

export function setUrlParams(params: Record<string, string>): string {
  const searchParams = new URLSearchParams(params);
  return searchParams.toString();
}

export function mergeUrlParams(current: URLSearchParams, updates: Record<string, string>): string {
  const merged = new URLSearchParams(current);
  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      merged.set(key, value);
    } else {
      merged.delete(key);
    }
  });
  return merged.toString();
}

// Route validation utilities
export function validateRequiredParams(path: string, params: Record<string, string>): {
  isValid: boolean;
  missing: string[];
} {
  const route = getRouteByPath(path);
  if (!route?.requiresParams) {
    return { isValid: true, missing: [] };
  }
  
  const missing = route.requiresParams.filter(param => !params[param] || params[param].trim() === '');
  return {
    isValid: missing.length === 0,
    missing
  };
}

// Date utilities for routes
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDateRange(days: number = 7): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}

// Error handling utilities
export function handleRouteError(error: Error, path: string): void {
  console.error(`Route error for ${path}:`, error);
  
  // You can extend this to send errors to monitoring service
  // or show user-friendly error messages
}

// Performance utilities
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
