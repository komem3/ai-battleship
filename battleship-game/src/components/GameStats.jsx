import React from 'react';
import { getRemainingShipsCount } from '../utils/shipPlacement';

const GameStats = ({ players, ships, board, turnCount, maxTurns, currentPlayer }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-bold mb-3 text-gray-800">ゲーム状況</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">現在のターン:</span>
          <span className="font-medium">{turnCount} / {maxTurns || '∞'}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">現在のプレイヤー:</span>
          <span className="font-medium text-blue-600">
            {currentPlayer ? currentPlayer.name : '待機中'}
          </span>
        </div>
        
        <div className="border-t pt-3">
          <h4 className="font-medium mb-2 text-gray-700">残り艦船数</h4>
          <div className="space-y-1">
            {players.map(player => (
              <div key={player.id} className="flex justify-between items-center">
                <span className="text-sm">{player.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {getRemainingShipsCount(ships, board, player.id)}
                  </span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(getRemainingShipsCount(ships, board, player.id) / 5) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStats;