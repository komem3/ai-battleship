import React, { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useGameState, GAME_STATES, TURN_PHASES } from './hooks/useGameState';
import useWebRTC from './hooks/useWebRTC';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import ActionHistory from './components/ActionHistory';
import GameStats from './components/GameStats';
import { generateRandomShips, checkAllShipsSunk, getRemainingShipsCount } from './utils/shipPlacement';

function App() {
  const gameState = useGameState();
  const [myPlayerId] = useState(() => Math.random().toString(36).substr(2, 9));
  const webRTC = useWebRTC(myPlayerId, gameState.isHost);

  const handleCreateRoom = useCallback((playerName, maxTurns) => {
    console.log('Creating room with player:', playerName, 'maxTurns:', maxTurns, 'playerId:', myPlayerId);
    gameState.setIsHost(true);
    gameState.setMaxTurns(maxTurns);
    
    webRTC.connectToSignalingServer();
    
    // Wait for connection before sending message
    setTimeout(() => {
      console.log('Sending create_room message with:', {
        type: 'create_room',
        playerId: myPlayerId,
        playerName: playerName,
        maxTurns: maxTurns
      });
      webRTC.sendToSignalingServer({
        type: 'create_room',
        playerId: myPlayerId,
        playerName: playerName,
        maxTurns: maxTurns
      });
    }, 1000);
  }, [myPlayerId, gameState, webRTC]);

  const handleJoinRoom = useCallback((roomCode, playerName) => {
    console.log('Joining room with player:', playerName, 'roomCode:', roomCode, 'playerId:', myPlayerId);
    gameState.setIsHost(false);
    gameState.setRoomCode(roomCode);
    
    webRTC.connectToSignalingServer();
    
    // Wait for connection before sending message
    setTimeout(() => {
      console.log('Sending join_room message with:', {
        type: 'join_room',
        roomCode: roomCode,
        playerId: myPlayerId,
        playerName: playerName
      });
      webRTC.sendToSignalingServer({
        type: 'join_room',
        roomCode: roomCode,
        playerId: myPlayerId,
        playerName: playerName
      });
    }, 1000);
  }, [myPlayerId, gameState, webRTC]);

  const handleStartGame = useCallback(() => {
    const boardSize = gameState.getBoardSize(gameState.players.length);
    const newBoard = gameState.initializeBoard(boardSize);
    
    // 既存の艦船をクリア
    gameState.setShips([]);
    
    const allShips = [];
    gameState.players.forEach(player => {
      const playerShips = generateRandomShips(boardSize, player.id);
      console.log(`Generated ${playerShips.length} ships for player ${player.name}:`, playerShips);
      allShips.push(...playerShips);
    });
    
    console.log(`Total ships generated: ${allShips.length} for ${gameState.players.length} players`);
    
    // ボードと艦船を同期的に配置
    const boardWithShips = gameState.setBoardWithShips(newBoard, allShips);
    gameState.setCurrentPlayer(gameState.players[0]);
    gameState.setGameState(GAME_STATES.PLAYING);
    
    // WebSocketを通じてゲーム開始を通知（メインの同期手段）
    const gameStartMessage = {
      type: 'game_started',
      board: boardWithShips,
      ships: allShips,
      currentPlayer: gameState.players[0],
      maxTurns: gameState.maxTurns
    };
    
    console.log('Sending game start message via WebSocket');
    webRTC.sendToSignalingServer({
      type: 'game_started',
      roomCode: gameState.roomCode,
      ...gameStartMessage
    });
  }, [gameState, webRTC]);

  const checkGameEnd = useCallback(() => {
    console.log('=== checkGameEnd called ===');
    console.log('Players:', gameState.players.length, gameState.players.map(p => p.name));
    console.log('Ships:', gameState.ships.length);
    console.log('Turn count:', gameState.turnCount);
    console.log('Max turns:', gameState.maxTurns);
    console.log('Game state:', gameState.gameState);
    
    // ゲーム開始直後や艦船が正しく配置されていない場合は終了しない
    if (gameState.ships.length === 0 || gameState.players.length === 0) {
      console.log('Early return: no ships or players');
      return;
    }
    
    // 全プレイヤーが艦船を持っているかチェック
    const playersWithShips = gameState.players.filter(player => {
      const playerShips = gameState.ships.filter(ship => ship.owner === player.id);
      return playerShips.length > 0;
    });
    
    if (playersWithShips.length !== gameState.players.length) {
      console.log('Early return: not all players have ships yet');
      return;
    }
    
    // 最小ターン数を設定（ゲーム開始直後の誤った終了を防ぐ）
    if (gameState.turnCount < 2) {
      console.log('Early return: turn count too low');
      return;
    }
    
    if (gameState.maxTurns && gameState.turnCount >= gameState.maxTurns) {
      console.log('Game ending: max turns reached');
      
      // 最大ターン数に達した場合、残り艦船数で勝者を決定
      const playerStats = gameState.players.map(player => ({
        player: player,
        remainingShips: getRemainingShipsCount(gameState.ships, gameState.board, player.id)
      }));
      
      // 残り艦船数が最も多いプレイヤーを勝者とする
      const maxShips = Math.max(...playerStats.map(stat => stat.remainingShips));
      const winners = playerStats.filter(stat => stat.remainingShips === maxShips);
      
      if (winners.length === 1) {
        gameState.setGameResult({
          type: 'max_turns',
          winner: winners[0].player,
          reason: `最大ターン数に達しました。${winners[0].player.name}が残り艦船数${maxShips}で勝利！`,
          playerStats: playerStats
        });
      } else {
        gameState.setGameResult({
          type: 'max_turns_draw',
          winners: winners.map(w => w.player),
          reason: `最大ターン数に達しました。${winners.map(w => w.player.name).join('、')}が残り艦船数${maxShips}で引き分け！`,
          playerStats: playerStats
        });
      }
      
      gameState.setGameState(GAME_STATES.GAME_OVER);
      return;
    }
    
    const activePlayers = gameState.players.filter(player => {
      const playerShips = gameState.ships.filter(ship => ship.owner === player.id);
      const allSunk = checkAllShipsSunk(playerShips, gameState.board);
      console.log(`Player ${player.name}: ships=${playerShips.length}, allSunk=${allSunk}`);
      return !allSunk;
    });
    
    console.log('Active players:', activePlayers.length, 'out of', gameState.players.length);
    
    // 2人以上のプレイヤーが必要（1人だけでは終了）
    if (activePlayers.length <= 1 && gameState.players.length > 1) {
      console.log('Game ending: too few active players');
      
      if (activePlayers.length === 1) {
        // 1人だけ生き残った場合、その人が勝者
        gameState.setGameResult({
          type: 'last_survivor',
          winner: activePlayers[0],
          reason: `${activePlayers[0].name}が最後まで艦船を残して勝利！`,
          eliminatedPlayers: gameState.players.filter(p => p.id !== activePlayers[0].id)
        });
      } else {
        // 全員の艦船が撃沈された場合
        gameState.setGameResult({
          type: 'all_eliminated',
          reason: '全プレイヤーの艦船が撃沈されました。引き分けです。'
        });
      }
      
      gameState.setGameState(GAME_STATES.GAME_OVER);
    }
    
    console.log('=== checkGameEnd finished ===');
  }, [gameState.ships, gameState.players, gameState.board, gameState.turnCount, gameState.maxTurns, gameState.setGameState, gameState.setGameResult]);

  const handleCellClick = useCallback((x, y, attackingShipId) => {
    if (gameState.currentPlayer?.id !== myPlayerId) return;
    if (gameState.turnPhase !== TURN_PHASES.ATTACK) return;
    
    const cell = gameState.board[x][y];
    if (cell.state !== 'empty' && cell.state !== 'ship') return;
    
    gameState.attack(x, y, myPlayerId, attackingShipId);
    
    const attackMessage = {
      type: 'attack_sync',
      coordinates: { x, y },
      attacker: myPlayerId,
      attackingShipId: attackingShipId,
      turn: gameState.turnCount
    };
    
    // WebSocketを通じて送信（メインの同期手段）
    webRTC.sendToSignalingServer({
      type: 'attack_sync',
      roomCode: gameState.roomCode,
      ...attackMessage
    });
    
    checkGameEnd();
  }, [gameState, myPlayerId, webRTC, checkGameEnd]);

  const handleShipSelect = useCallback((ship) => {
    if (gameState.currentPlayer?.id !== myPlayerId) return;
    if (gameState.turnPhase !== TURN_PHASES.MOVEMENT && gameState.turnPhase !== TURN_PHASES.ATTACK) return;
    
    gameState.setSelectedShip(ship);
  }, [gameState, myPlayerId]);

  const handleShipMove = useCallback((shipId, newCoordinates) => {
    if (gameState.currentPlayer?.id !== myPlayerId) return;
    if (gameState.turnPhase !== TURN_PHASES.MOVEMENT) return;
    
    gameState.moveShip(shipId, newCoordinates);
    
    const moveMessage = {
      type: 'move_sync',
      shipId: shipId,
      coordinates: newCoordinates,
      player: myPlayerId,
      turn: gameState.turnCount
    };
    
    // WebSocketを通じて送信
    webRTC.sendToSignalingServer({
      type: 'move_sync',
      roomCode: gameState.roomCode,
      ...moveMessage
    });
    
  }, [gameState, myPlayerId, webRTC]);

  const handleChooseAction = useCallback((action) => {
    if (gameState.currentPlayer?.id !== myPlayerId) return;
    
    gameState.chooseAction(action);
  }, [gameState, myPlayerId]);

  const handleNextTurn = useCallback(() => {
    console.log('=== handleNextTurn called ===');
    console.log('Current player ID:', gameState.currentPlayer?.id);
    console.log('My player ID:', myPlayerId);
    console.log('Is my turn?:', gameState.currentPlayer?.id === myPlayerId);
    
    if (gameState.currentPlayer?.id !== myPlayerId) {
      console.log('Not my turn, skipping turn change');
      return;
    }
    
    // ターンを進める前に次のプレイヤーを計算
    const currentIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer?.id);
    const nextIndex = (currentIndex + 1) % gameState.players.length;
    const nextPlayer = gameState.players[nextIndex];
    const newTurnCount = gameState.turnCount + 1;
    
    console.log('Current player index:', currentIndex);
    console.log('Next player index:', nextIndex);
    console.log('Next player:', nextPlayer?.name);
    console.log('New turn count:', newTurnCount);
    
    gameState.nextTurn();
    
    const turnMessage = {
      type: 'turn_sync',
      currentPlayer: nextPlayer,
      turnCount: newTurnCount,
      fromPlayer: myPlayerId
    };
    
    console.log('Sending turn message:', turnMessage);
    
    // WebSocketを通じて送信
    webRTC.sendToSignalingServer({
      type: 'turn_sync',
      roomCode: gameState.roomCode,
      ...turnMessage
    });
  }, [gameState, myPlayerId, webRTC]);

  useEffect(() => {
    // ゲーム状態変更の監視
    console.log('Game state changed to:', gameState.gameState);
  }, [gameState.gameState]);

  useEffect(() => {
    // 自動ターン変更のコールバック関数を設定
    gameState.setAutoTurnCallback(handleNextTurn);
    
    console.log('Setting up signaling message handler');
    
    const handleSignalingMessage = (message) => {
      console.log('Received signaling message:', message);
      switch (message.type) {
        case 'room_created':
          console.log('Room created with code:', message.roomCode);
          gameState.setRoomCode(message.roomCode);
          // Set all players from the room
          if (message.players) {
            console.log('Setting players from room_created:', message.players);
            gameState.setPlayers(message.players);
          }
          break;
        case 'room_joined':
          console.log('Room joined with code:', message.roomCode);
          console.log('Players from room_joined:', message.players);
          gameState.setRoomCode(message.roomCode);
          // Set all players from the room
          if (message.players) {
            gameState.setPlayers(message.players);
          }
          break;
        case 'player_joined':
          console.log('Player joined:', message.player);
          if (message.players) {
            console.log('Setting all players from player_joined:', message.players);
            gameState.setPlayers(message.players);
          } else {
            gameState.addPlayer(message.player);
          }
          break;
        case 'game_started':
          console.log('Received game_started message from signaling server:', message);
          console.log('Setting game state from signaling server:', {
            board: message.board ? `${message.board.length}x${message.board[0]?.length}` : 'null',
            ships: message.ships ? message.ships.length : 0,
            currentPlayer: message.currentPlayer?.name,
            maxTurns: message.maxTurns,
            isHost: gameState.isHost
          });
          
          // ホストも参加者も同じ状態を設定
          if (message.board && message.ships && message.currentPlayer) {
            // 状態を同期的に設定
            gameState.setBoardWithShips(message.board, message.ships);
            gameState.setCurrentPlayer(message.currentPlayer);
            gameState.setMaxTurns(message.maxTurns);
            gameState.setGameState(GAME_STATES.PLAYING);
            console.log('Game state synchronized - ships:', message.ships.length, 'board cells with ships:', message.board.flat().filter(cell => cell.ships && cell.ships.length > 0).length);
          } else {
            console.error('Invalid game_started message - missing required fields');
          }
          break;
        case 'attack_sync':
          console.log('Received attack_sync message from signaling server:', message);
          if (message.attacker !== myPlayerId) {
            console.log('Processing remote attack:', message.coordinates, 'by', message.attacker);
            const cellBefore = gameState.board[message.coordinates.x][message.coordinates.y];
            console.log('Cell before attack:', cellBefore);
            gameState.attack(message.coordinates.x, message.coordinates.y, message.attacker, message.attackingShipId, false);
            const cellAfter = gameState.board[message.coordinates.x][message.coordinates.y];
            console.log('Cell after attack:', cellAfter);
            checkGameEnd();
          }
          break;
        case 'move_sync':
          console.log('Received move_sync message from signaling server:', message);
          if (message.player !== myPlayerId) {
            console.log('Processing remote move:', message.shipId, 'to', message.coordinates);
            gameState.moveShip(message.shipId, message.coordinates, false);
          }
          break;
        case 'turn_sync':
          console.log('Received turn_sync message from signaling server:', message);
          console.log('Message details:', {
            currentPlayer: message.currentPlayer,
            turnCount: message.turnCount, 
            fromPlayer: message.fromPlayer,
            myPlayerId: myPlayerId
          });
          
          if (message.fromPlayer !== myPlayerId) {
            console.log('Syncing turn to player:', message.currentPlayer?.name, 'turn:', message.turnCount);
            console.log('Previous game state:', {
              currentPlayer: gameState.currentPlayer?.name,
              turnCount: gameState.turnCount
            });
            
            // ゲーム状態を同期的に更新（flushSyncを利用して即座に同期）
            flushSync(() => {
              if (message.currentPlayer) {
                gameState.setCurrentPlayer(message.currentPlayer);
              }
              if (message.turnCount !== undefined) {
                gameState.setTurnCount(message.turnCount);
              }
              gameState.setTurnPhase(TURN_PHASES.CHOOSE_ACTION);
              gameState.setLastAttackResult(null);
              gameState.setActionTaken(false);
              gameState.setSelectedShip(null);
            });
            
            console.log('After sync game state:', {
              currentPlayer: message.currentPlayer?.name,
              turnCount: message.turnCount
            });
          } else {
            console.log('Skipping turn sync - message from self');
          }
          break;
        case 'player_left':
          console.log('Player left:', message.playerId);
          gameState.removePlayer(message.playerId);
          break;
        case 'error':
          console.error('Signaling error:', message.message);
          alert(message.message);
          break;
      }
    };

    // Set up signaling message handler
    webRTC.setOnSignalingMessage(handleSignalingMessage);

    // WebRTCピアメッセージ処理は無効化（WebSocketのみ使用）
    webRTC.setOnPeerMessage(() => {
      // WebRTCピアメッセージは無視（WebSocketのみ使用）
    });

  }, [webRTC, handleNextTurn, gameState, myPlayerId, checkGameEnd]);

  const renderGameContent = () => {
    switch (gameState.gameState) {
      case GAME_STATES.LOBBY:
        return (
          <Lobby
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartGame={handleStartGame}
            isHost={gameState.isHost}
            roomCode={gameState.roomCode}
            players={gameState.players}
          />
        );
      
      case GAME_STATES.PLAYING:
        return (
          <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <GameBoard
                    board={gameState.board}
                    onCellClick={handleCellClick}
                    currentPlayer={gameState.currentPlayer}
                    isMyTurn={gameState.currentPlayer?.id === myPlayerId}
                    showMyShips={true}
                    myPlayerId={myPlayerId}
                    lastAction={gameState.actionHistory[gameState.actionHistory.length - 1]}
                    turnPhase={gameState.turnPhase}
                    selectedShip={gameState.selectedShip}
                    onShipSelect={handleShipSelect}
                    onShipMove={handleShipMove}
                    ships={gameState.ships}
                    lastAttackResult={gameState.lastAttackResult}
                    onChooseAction={handleChooseAction}
                    actionTaken={gameState.actionTaken}
                    isInAttackRange={gameState.isInAttackRange}
                  />
                  {gameState.currentPlayer?.id === myPlayerId && gameState.actionTaken && (
                    <div className="mt-4 flex gap-2">
                      <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded">
                        自動でターンが変わります...
                      </div>
                      {gameState.selectedShip && (
                        <button
                          onClick={() => gameState.setSelectedShip(null)}
                          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          選択解除
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <GameStats
                    players={gameState.players}
                    ships={gameState.ships}
                    board={gameState.board}
                    turnCount={gameState.turnCount}
                    maxTurns={gameState.maxTurns}
                    currentPlayer={gameState.currentPlayer}
                  />
                  <ActionHistory
                    actions={gameState.actionHistory}
                    players={gameState.players}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case GAME_STATES.GAME_OVER:
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
              <h2 className="text-3xl font-bold mb-4">ゲーム終了</h2>
              
              {gameState.gameResult && (
                <div className="mb-6">
                  {gameState.gameResult.type === 'last_survivor' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <h3 className="text-xl font-bold text-green-800 mb-2">🎉 勝者</h3>
                      <p className="text-green-700 font-medium text-lg">{gameState.gameResult.winner.name}</p>
                      <p className="text-green-600 text-sm mt-2">{gameState.gameResult.reason}</p>
                    </div>
                  )}
                  
                  {gameState.gameResult.type === 'max_turns' && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="text-xl font-bold text-blue-800 mb-2">🏆 勝者</h3>
                      <p className="text-blue-700 font-medium text-lg">{gameState.gameResult.winner.name}</p>
                      <p className="text-blue-600 text-sm mt-2">{gameState.gameResult.reason}</p>
                    </div>
                  )}
                  
                  {gameState.gameResult.type === 'max_turns_draw' && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h3 className="text-xl font-bold text-yellow-800 mb-2">🤝 引き分け</h3>
                      <p className="text-yellow-700 font-medium">
                        {gameState.gameResult.winners.map(w => w.name).join('、')}
                      </p>
                      <p className="text-yellow-600 text-sm mt-2">{gameState.gameResult.reason}</p>
                    </div>
                  )}
                  
                  {gameState.gameResult.type === 'all_eliminated' && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">💥 全滅</h3>
                      <p className="text-gray-600 text-sm">{gameState.gameResult.reason}</p>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-lg mb-4">お疲れ様でした！</p>
              <button
                onClick={gameState.resetGame}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              >
                新しいゲームを開始
              </button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">読み込み中...</h2>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="App">
      {renderGameContent()}
    </div>
  );
}

export default App;
