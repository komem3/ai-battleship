import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });

const rooms = new Map();
const clients = new Map();

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const broadcastToRoom = (roomCode, message, excludeClient = null) => {
  const room = rooms.get(roomCode);
  if (room) {
    room.clients.forEach(client => {
      if (client !== excludeClient && client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });
  }
};

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'create_room':
          const roomCode = generateRoomCode();
          const playerId = message.playerId;
          const playerName = message.playerName;
          const maxTurns = message.maxTurns;
          
          rooms.set(roomCode, {
            code: roomCode,
            host: playerId,
            clients: new Set([ws]),
            players: [{
              id: playerId,
              name: playerName,
              isHost: true
            }],
            maxTurns: maxTurns,
            createdAt: new Date()
          });
          
          clients.set(ws, { roomCode, playerId, playerName });
          
          ws.send(JSON.stringify({
            type: 'room_created',
            roomCode: roomCode,
            playerId: playerId,
            players: rooms.get(roomCode).players
          }));
          break;
          
        case 'join_room':
          const targetRoomCode = message.roomCode;
          const joinPlayerId = message.playerId;
          const joinPlayerName = message.playerName;
          
          const targetRoom = rooms.get(targetRoomCode);
          if (!targetRoom) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'ルームが見つかりません'
            }));
            break;
          }
          
          if (targetRoom.players.length >= 5) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'ルームが満員です'
            }));
            break;
          }
          
          targetRoom.clients.add(ws);
          targetRoom.players.push({
            id: joinPlayerId,
            name: joinPlayerName,
            isHost: false
          });
          
          clients.set(ws, { roomCode: targetRoomCode, playerId: joinPlayerId, playerName: joinPlayerName });
          
          ws.send(JSON.stringify({
            type: 'room_joined',
            roomCode: targetRoomCode,
            playerId: joinPlayerId,
            players: targetRoom.players
          }));
          
          broadcastToRoom(targetRoomCode, {
            type: 'player_joined',
            player: {
              id: joinPlayerId,
              name: joinPlayerName,
              isHost: false
            },
            players: targetRoom.players
          }, ws);
          break;
          
        case 'webrtc_offer':
        case 'webrtc_answer':
        case 'webrtc_ice_candidate':
          const clientInfo = clients.get(ws);
          if (clientInfo) {
            broadcastToRoom(clientInfo.roomCode, {
              type: message.type,
              from: clientInfo.playerId,
              to: message.to,
              data: message.data
            }, ws);
          }
          break;
          
        case 'game_started':
          const gameClientInfo = clients.get(ws);
          if (gameClientInfo) {
            console.log('Broadcasting game_started to room:', gameClientInfo.roomCode);
            broadcastToRoom(gameClientInfo.roomCode, {
              type: 'game_started',
              board: message.board,
              ships: message.ships,
              currentPlayer: message.currentPlayer,
              maxTurns: message.maxTurns
            }, ws);
          }
          break;
          
        case 'attack_sync':
          const attackClientInfo = clients.get(ws);
          if (attackClientInfo) {
            console.log('Broadcasting attack_sync to room:', attackClientInfo.roomCode);
            broadcastToRoom(attackClientInfo.roomCode, {
              type: 'attack_sync',
              coordinates: message.coordinates,
              attacker: message.attacker,
              attackingShipId: message.attackingShipId,
              turn: message.turn
            }, ws);
          }
          break;
          
        case 'move_sync':
          const moveClientInfo = clients.get(ws);
          if (moveClientInfo) {
            console.log('Broadcasting move_sync to room:', moveClientInfo.roomCode);
            broadcastToRoom(moveClientInfo.roomCode, {
              type: 'move_sync',
              shipId: message.shipId,
              coordinates: message.coordinates,
              player: message.player,
              turn: message.turn
            }, ws);
          }
          break;
          
        case 'turn_sync':
          const turnClientInfo = clients.get(ws);
          if (turnClientInfo) {
            console.log('Broadcasting turn_sync to room:', turnClientInfo.roomCode);
            console.log('Received turn_sync message:', message);
            console.log('Message currentPlayer:', message.currentPlayer);
            console.log('Message turnCount:', message.turnCount);
            console.log('Message fromPlayer:', message.fromPlayer);
            
            const broadcastMessage = {
              type: 'turn_sync',
              currentPlayer: message.currentPlayer,
              turnCount: message.turnCount,
              fromPlayer: message.fromPlayer
            };
            console.log('Broadcasting message:', broadcastMessage);
            
            broadcastToRoom(turnClientInfo.roomCode, broadcastMessage, ws);
          }
          break;
          
        case 'leave_room':
          const leaveClientInfo = clients.get(ws);
          if (leaveClientInfo) {
            const room = rooms.get(leaveClientInfo.roomCode);
            if (room) {
              room.clients.delete(ws);
              room.players = room.players.filter(p => p.id !== leaveClientInfo.playerId);
              
              if (room.players.length === 0) {
                rooms.delete(leaveClientInfo.roomCode);
              } else {
                if (room.host === leaveClientInfo.playerId && room.players.length > 0) {
                  room.host = room.players[0].id;
                  room.players[0].isHost = true;
                }
                
                broadcastToRoom(leaveClientInfo.roomCode, {
                  type: 'player_left',
                  playerId: leaveClientInfo.playerId,
                  players: room.players
                });
              }
            }
            clients.delete(ws);
          }
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'メッセージの処理中にエラーが発生しました'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    const clientInfo = clients.get(ws);
    if (clientInfo) {
      const room = rooms.get(clientInfo.roomCode);
      if (room) {
        room.clients.delete(ws);
        room.players = room.players.filter(p => p.id !== clientInfo.playerId);
        
        if (room.players.length === 0) {
          rooms.delete(clientInfo.roomCode);
        } else {
          if (room.host === clientInfo.playerId && room.players.length > 0) {
            room.host = room.players[0].id;
            room.players[0].isHost = true;
          }
          
          broadcastToRoom(clientInfo.roomCode, {
            type: 'player_left',
            playerId: clientInfo.playerId,
            players: room.players
          });
        }
      }
      clients.delete(ws);
    }
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket signaling server running on port ${PORT}`);
});

setInterval(() => {
  const now = new Date();
  for (const [roomCode, room] of rooms.entries()) {
    const timeSinceCreation = now - room.createdAt;
    if (timeSinceCreation > 4 * 60 * 60 * 1000) {
      console.log(`Cleaning up inactive room: ${roomCode}`);
      rooms.delete(roomCode);
    }
  }
}, 10 * 60 * 1000);