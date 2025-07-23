import { useState, useRef, useCallback, useEffect } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

const useWebRTC = () => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  
  // WebRTC関連のrefs
  const peerConnectionsRef = useRef(new Map()); // peerId -> RTCPeerConnection
  const dataChannelsRef = useRef(new Map()); // peerId -> RTCDataChannel
  const onGameMessageRef = useRef(null);
  
  // シグナリング用WebSocket（部屋の作成・参加とWebRTC情報交換のみ）
  const signalingWSRef = useRef(null);
  const onSignalingMessageRef = useRef(null);

  // シグナリングサーバーへの接続
  const connectToSignalingServer = useCallback(() => {
    if (signalingWSRef.current && signalingWSRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
      console.log('Connected to signaling server');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received signaling message:', message);
        
        if (onSignalingMessageRef.current) {
          onSignalingMessageRef.current(message);
        }
      } catch (error) {
        console.error('Error parsing signaling message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('Disconnected from signaling server');
      signalingWSRef.current = null;
    };
    
    ws.onerror = (error) => {
      console.error('Signaling WebSocket error:', error);
    };

    signalingWSRef.current = ws;
  }, []);

  // シグナリングサーバーにメッセージ送信
  const sendToSignalingServer = useCallback((message) => {
    if (signalingWSRef.current && signalingWSRef.current.readyState === WebSocket.OPEN) {
      signalingWSRef.current.send(JSON.stringify(message));
    }
  }, []);

  // シグナリングメッセージのハンドラー設定
  const setOnSignalingMessage = useCallback((callback) => {
    onSignalingMessageRef.current = callback;
  }, []);

  // ゲームメッセージのハンドラー設定
  const setOnGameMessage = useCallback((callback) => {
    onGameMessageRef.current = callback;
  }, []);

  // 新しいピア接続を作成
  const createPeerConnection = useCallback((peerId) => {
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendToSignalingServer({
          type: 'webrtc_ice_candidate',
          candidate: event.candidate,
          targetPeer: peerId,
          roomCode: roomCode
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state: ${peerConnection.connectionState}`);
      updateConnectionState();
    };

    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      setupDataChannel(dataChannel, peerId);
    };

    peerConnectionsRef.current.set(peerId, peerConnection);
    return peerConnection;
  }, [roomCode, sendToSignalingServer]);

  // データチャネルの設定
  const setupDataChannel = useCallback((dataChannel, peerId) => {
    dataChannel.onopen = () => {
      console.log(`Data channel with ${peerId} opened`);
      setConnectedPeers(prev => [...prev.filter(p => p !== peerId), peerId]);
      updateConnectionState();
    };

    dataChannel.onclose = () => {
      console.log(`Data channel with ${peerId} closed`);
      setConnectedPeers(prev => prev.filter(p => p !== peerId));
      updateConnectionState();
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`Received game message from ${peerId}:`, message);
        
        if (onGameMessageRef.current) {
          onGameMessageRef.current(message, peerId);
        }
      } catch (error) {
        console.error('Error parsing game message:', error);
      }
    };

    dataChannelsRef.current.set(peerId, dataChannel);
  }, []);

  // 接続状態の更新
  const updateConnectionState = useCallback(() => {
    const connections = Array.from(peerConnectionsRef.current.values());
    const openChannels = Array.from(dataChannelsRef.current.values())
      .filter(channel => channel.readyState === 'open');

    if (openChannels.length === 0) {
      setConnectionState('disconnected');
    } else if (openChannels.length === connections.length) {
      setConnectionState('connected');
    } else {
      setConnectionState('connecting');
    }
  }, []);

  // 他のピアにオファーを送信（ホストが新しいピアに対して実行）
  const sendOfferToPeer = useCallback(async (peerId) => {
    try {
      const peerConnection = createPeerConnection(peerId);
      
      // データチャネルを作成（ホスト側）
      const dataChannel = peerConnection.createDataChannel('game', {
        ordered: true
      });
      setupDataChannel(dataChannel, peerId);

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      sendToSignalingServer({
        type: 'webrtc_offer',
        offer: offer,
        targetPeer: peerId,
        roomCode: roomCode
      });
    } catch (error) {
      console.error('Error sending offer to peer:', error);
    }
  }, [createPeerConnection, setupDataChannel, sendToSignalingServer, roomCode]);

  // オファーを受信して応答（新しく参加したピアが実行）
  const handleOffer = useCallback(async (offer, fromPeer) => {
    try {
      const peerConnection = createPeerConnection(fromPeer);
      await peerConnection.setRemoteDescription(offer);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      sendToSignalingServer({
        type: 'webrtc_answer',
        answer: answer,
        targetPeer: fromPeer,
        roomCode: roomCode
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, sendToSignalingServer, roomCode]);

  // アンサーを受信（ホストが実行）
  const handleAnswer = useCallback(async (answer, fromPeer) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(fromPeer);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  // ICE候補を処理
  const handleIceCandidate = useCallback(async (candidate, fromPeer) => {
    try {
      const peerConnection = peerConnectionsRef.current.get(fromPeer);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  // 全てのピアにゲームメッセージを送信
  const broadcastGameMessage = useCallback((message) => {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    dataChannelsRef.current.forEach((dataChannel, peerId) => {
      if (dataChannel.readyState === 'open') {
        try {
          dataChannel.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`Error sending message to peer ${peerId}:`, error);
        }
      }
    });

    console.log(`Broadcast message sent to ${sentCount} peers:`, message);
    return sentCount;
  }, []);

  // 特定のピアにゲームメッセージを送信
  const sendGameMessageToPeer = useCallback((message, peerId) => {
    const dataChannel = dataChannelsRef.current.get(peerId);
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error(`Error sending message to peer ${peerId}:`, error);
        return false;
      }
    }
    return false;
  }, []);

  // 新しいピアが参加した時の処理
  const handlePeerJoined = useCallback((peerId) => {
    if (isHost) {
      // ホストは新しいピアにオファーを送信
      sendOfferToPeer(peerId);
    }
  }, [isHost, sendOfferToPeer]);

  // ピアが退出した時の処理
  const handlePeerLeft = useCallback((peerId) => {
    const peerConnection = peerConnectionsRef.current.get(peerId);
    const dataChannel = dataChannelsRef.current.get(peerId);

    if (peerConnection) {
      peerConnection.close();
      peerConnectionsRef.current.delete(peerId);
    }

    if (dataChannel) {
      dataChannel.close();
      dataChannelsRef.current.delete(peerId);
    }

    setConnectedPeers(prev => prev.filter(p => p !== peerId));
    updateConnectionState();
  }, [updateConnectionState]);

  // WebRTCクリーンアップ
  const cleanup = useCallback(() => {
    // 全てのピア接続を閉じる
    peerConnectionsRef.current.forEach((peerConnection, peerId) => {
      peerConnection.close();
    });
    peerConnectionsRef.current.clear();

    // 全てのデータチャネルを閉じる
    dataChannelsRef.current.forEach((dataChannel, peerId) => {
      dataChannel.close();
    });
    dataChannelsRef.current.clear();

    // シグナリング接続を閉じる
    if (signalingWSRef.current) {
      signalingWSRef.current.close();
      signalingWSRef.current = null;
    }

    setConnectedPeers([]);
    setConnectionState('disconnected');
    setIsHost(false);
    setRoomCode('');
  }, []);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    // 接続状態
    connectionState,
    connectedPeers,
    isHost,
    roomCode,
    setIsHost,
    setRoomCode,

    // シグナリング機能
    connectToSignalingServer,
    sendToSignalingServer,
    setOnSignalingMessage,

    // WebRTC機能
    setOnGameMessage,
    broadcastGameMessage,
    sendGameMessageToPeer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handlePeerJoined,
    handlePeerLeft,

    // その他
    cleanup
  };
};

export default useWebRTC;