import React, { useState } from 'react';

const Lobby = ({ onCreateRoom, onJoinRoom, onStartGame, isHost, roomCode, players }) => {
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [maxTurns, setMaxTurns] = useState(50);

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      onCreateRoom(playerName, maxTurns);
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim() && joinRoomCode.trim()) {
      onJoinRoom(joinRoomCode, playerName);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          バトルシップ
        </h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            プレイヤー名
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="名前を入力してください"
          />
        </div>

        {!roomCode && !isHost && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大ターン数
              </label>
              <input
                type="number"
                value={maxTurns}
                onChange={(e) => setMaxTurns(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="10"
                max="200"
              />
            </div>
            
            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              ルームを作成
            </button>
            
            <div className="text-center text-gray-500">または</div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ルームコード
              </label>
              <input
                type="text"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ルームコードを入力"
              />
            </div>
            
            <button
              onClick={handleJoinRoom}
              disabled={!playerName.trim() || !joinRoomCode.trim()}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              ルームに参加
            </button>
          </div>
        )}

        {roomCode && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                {isHost ? 'ルーム作成完了' : 'ルーム参加完了'}
              </h2>
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="text-sm text-gray-600">ルームコード</p>
                <p className="text-2xl font-bold text-blue-600">{roomCode}</p>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {isHost ? 'このコードを他のプレイヤーに共有してください' : 'ホストがゲームを開始するまでお待ちください'}
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">参加プレイヤー ({players.length}/5)</h3>
              <p className="text-sm text-gray-600 mb-2">2人以上でゲーム開始可能</p>
              <div className="space-y-2">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>{player.name}</span>
                    {player.isHost && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        ホスト
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isHost && players.length >= 2 && (
              <button
                onClick={onStartGame}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                ゲーム開始 ({players.length}人)
              </button>
            )}
            {isHost && players.length < 2 && (
              <div className="text-center text-gray-500 p-4">
                あと{2 - players.length}人必要です
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;