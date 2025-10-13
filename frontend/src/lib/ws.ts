import { handleWsMessage, useCallStore } from '../store/useCall';

let socket: WebSocket | null = null;
let reconnectTimeout: number | null = null;
let reconnectDelay = 1000;

function buildWsUrl(callId?: string) {
  const url = new URL(window.location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = callId ? `callId=${encodeURIComponent(callId)}` : '';
  return url.toString();
}

function scheduleReconnect(callId?: string) {
  if (reconnectTimeout) return;
  reconnectTimeout = window.setTimeout(() => {
    reconnectTimeout = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 10000);
    connect(callId);
  }, reconnectDelay);
}

function connect(callId?: string) {
  if (socket) {
    socket.close();
  }
  socket = new WebSocket(buildWsUrl(callId));
  socket.onopen = () => {
    if (reconnectTimeout) {
      window.clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    reconnectDelay = 1000;
  };
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWsMessage(data);
  };
  socket.onerror = () => {
    useCallStore.getState().pushError('WebSocket connection issue. Retrying…');
  };
  socket.onclose = () => {
    scheduleReconnect(useCallStore.getState().callId);
  };
}

export function initWs(callId?: string) {
  connect(callId);
}

export function updateWsCallId(callId?: string) {
  connect(callId);
}
