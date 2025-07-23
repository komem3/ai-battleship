import { useCallback, useRef, useState } from "react";

const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const onSignalingMessageRef = useRef(null);

  const connectToSignalingServer = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Already connected to signaling server");
      return;
    }

    console.log("Connecting to signaling server");
    const ws = new WebSocket(
      import.meta.env.DEV
        ? "ws://localhost:8080"
        : "wss://room-1022702941270.asia-northeast1.run.app",
    );

    ws.onopen = () => {
      console.log("Connected to signaling server");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received WebSocket message:", message);

        if (onSignalingMessageRef.current) {
          onSignalingMessageRef.current(message);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from signaling server");
      setConnected(false);
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    wsRef.current = ws;
  }, []);

  const sendToSignalingServer = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Sending to signaling server:", message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message:", message);
    }
  }, []);

  const setOnSignalingMessage = useCallback((callback) => {
    onSignalingMessageRef.current = callback;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setConnected(false);
    }
  }, []);

  return {
    connected,
    connectToSignalingServer,
    sendToSignalingServer,
    setOnSignalingMessage,
    disconnect,
  };
};

export default useWebSocket;
