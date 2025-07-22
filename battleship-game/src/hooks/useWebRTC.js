import { useState, useEffect, useCallback, useRef } from 'react';
import SimplePeer from 'simple-peer';

const useWebRTC = (playerId, isHost) => {
  const [peers, setPeers] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const peersRef = useRef(new Map());

  const connectToSignalingServer = useCallback((wsUrl = 'ws://localhost:8080') => {
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('Connected to signaling server');
    };
    
    wsRef.current.onclose = () => {
      console.log('Disconnected from signaling server');
      setIsConnected(false);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      console.log('WebRTC handling signaling message:', message);
      
      // Handle WebRTC specific messages
      switch (message.type) {
        case 'webrtc_offer':
          if (message.to === playerId) {
            handleOffer(message.from, message.data);
          }
          break;
        case 'webrtc_answer':
          if (message.to === playerId) {
            handleAnswer(message.from, message.data);
          }
          break;
        case 'webrtc_ice_candidate':
          if (message.to === playerId) {
            handleIceCandidate(message.from, message.data);
          }
          break;
        case 'player_joined':
          if (isHost && message.player && message.player.id !== playerId) {
            initiateConnection(message.player.id);
          }
          break;
      }
      
      // Forward all messages to App component
      if (onSignalingMessageRef.current) {
        onSignalingMessageRef.current(message);
      }
    };
  }, [playerId, isHost]);


  const createPeer = useCallback((targetPlayerId, initiator = false) => {
    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false
    });

    peer.on('signal', (data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: initiator ? 'webrtc_offer' : 'webrtc_answer',
          from: playerId,
          to: targetPlayerId,
          data: data
        }));
      }
    });

    peer.on('connect', () => {
      console.log(`Connected to peer: ${targetPlayerId}`);
      console.log(`Total connected peers: ${Array.from(peersRef.current.values()).filter(p => p.connected).length}`);
      setIsConnected(true);
    });

    peer.on('data', (data) => {
      try {
        if (!data || data.length === 0) {
          console.warn('Received empty data from peer:', targetPlayerId);
          return;
        }
        const dataString = data.toString();
        if (!dataString || dataString.trim() === '') {
          console.warn('Received empty string from peer:', targetPlayerId);
          return;
        }
        console.log('Raw data received from peer:', targetPlayerId, dataString);
        const message = JSON.parse(dataString);
        if (!message || typeof message !== 'object') {
          console.warn('Parsed message is not a valid object:', message);
          return;
        }
        handlePeerMessage(targetPlayerId, message);
      } catch (error) {
        console.error('Error parsing peer message from', targetPlayerId, ':', error, 'Data:', data);
      }
    });

    peer.on('error', (error) => {
      console.error(`Peer error with ${targetPlayerId}:`, error);
    });

    peer.on('close', () => {
      console.log(`Peer connection closed: ${targetPlayerId}`);
      peersRef.current.delete(targetPlayerId);
      setPeers(new Map(peersRef.current));
    });

    peersRef.current.set(targetPlayerId, peer);
    setPeers(new Map(peersRef.current));

    return peer;
  }, [playerId]);

  const initiateConnection = useCallback((targetPlayerId) => {
    if (!peersRef.current.has(targetPlayerId)) {
      createPeer(targetPlayerId, true);
    }
  }, [createPeer]);

  const handleOffer = useCallback((fromPlayerId, offer) => {
    if (!peersRef.current.has(fromPlayerId)) {
      const peer = createPeer(fromPlayerId, false);
      peer.signal(offer);
    }
  }, [createPeer]);

  const handleAnswer = useCallback((fromPlayerId, answer) => {
    const peer = peersRef.current.get(fromPlayerId);
    if (peer) {
      peer.signal(answer);
    }
  }, []);

  const handleIceCandidate = useCallback((fromPlayerId, candidate) => {
    const peer = peersRef.current.get(fromPlayerId);
    if (peer) {
      peer.signal(candidate);
    }
  }, []);

  const [onPeerMessage, setOnPeerMessage] = useState(null);
  const onSignalingMessageRef = useRef(null);
  
  const setOnSignalingMessage = useCallback((callback) => {
    onSignalingMessageRef.current = callback;
  }, []);

  const handlePeerMessage = useCallback((fromPlayerId, message) => {
    console.log(`Received message from ${fromPlayerId}:`, message);
    if (onPeerMessage && message) {
      onPeerMessage(fromPlayerId, message);
    }
  }, [onPeerMessage]);

  const sendToAllPeers = useCallback((message) => {
    if (!message || typeof message !== 'object') {
      console.error('Attempted to send invalid message:', message);
      return;
    }
    
    console.log(`Sending message to ${peersRef.current.size} peers:`, message);
    let sentCount = 0;
    const messageString = JSON.stringify(message);
    
    peersRef.current.forEach((peer, peerId) => {
      if (peer.connected) {
        try {
          console.log(`Sending to peer ${peerId}:`, message);
          peer.send(messageString);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to peer ${peerId}:`, error);
        }
      } else {
        console.log(`Peer ${peerId} is not connected, skipping`);
      }
    });
    console.log(`Message sent to ${sentCount} peers out of ${peersRef.current.size}`);
  }, []);

  const sendToPeer = useCallback((targetPlayerId, message) => {
    const peer = peersRef.current.get(targetPlayerId);
    if (peer && peer.connected) {
      peer.send(JSON.stringify(message));
    }
  }, []);

  const sendToSignalingServer = useCallback((message) => {
    console.log('Attempting to send message:', message);
    console.log('WebSocket state:', wsRef.current?.readyState);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending message to signaling server:', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not ready, state:', wsRef.current?.readyState);
    }
  }, []);

  const disconnect = useCallback(() => {
    peersRef.current.forEach((peer) => {
      peer.destroy();
    });
    peersRef.current.clear();
    setPeers(new Map());
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    peers,
    isConnected,
    connectToSignalingServer,
    sendToAllPeers,
    sendToPeer,
    sendToSignalingServer,
    disconnect,
    setOnPeerMessage,
    setOnSignalingMessage,
    wsRef
  };
};

export default useWebRTC;