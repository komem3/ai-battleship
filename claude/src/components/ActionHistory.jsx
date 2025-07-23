import React from 'react';

const ActionHistory = ({ actions, players }) => {
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  const formatAction = (action) => {
    const time = new Date(action.timestamp).toLocaleTimeString();
    
    if (action.type === 'move') {
      const player = getPlayerName(action.player);
      
      return `${time} - ${player}の${action.shipType}が${action.direction}に${action.distance}マス移動`;
    }
    
    const attacker = getPlayerName(action.attacker);
    const coord = `(${action.coordinates.x}, ${action.coordinates.y})`;
    
    let message = `${time} - ${attacker}が${coord}を攻撃`;
    
    // 攻撃された艦船の情報を追加（ヒット/ミスに関係なく）
    if (action.affectedShipsDetails && action.affectedShipsDetails.length > 0) {
      const affectedShipNames = action.affectedShipsDetails.map(ship => 
        `${getPlayerName(ship.owner)}の${ship.type}`
      );
      message += ` [対象: ${affectedShipNames.join(', ')}]`;
    }
    
    if (action.result === 'hit') {
      message += ' → ヒット！';
      
      // ヒットした艦船の詳細を追加
      if (action.hitShipsDetails && action.hitShipsDetails.length > 0) {
        const hitShipNames = action.hitShipsDetails.map(ship => 
          `${getPlayerName(ship.owner)}の${ship.type}`
        );
        message += ` (${hitShipNames.join(', ')}が被弾)`;
      }
      
      // 撃沈情報を追加
      if (action.sunkShipsDetails && action.sunkShipsDetails.length > 0) {
        const sunkShipNames = action.sunkShipsDetails.map(ship => 
          `${getPlayerName(ship.owner)}の${ship.type}`
        );
        message += ` 撃沈: ${sunkShipNames.join(', ')}`;
      }
    } else {
      message += ' → ミス';
      
      // 水しぶき情報を追加（艦船名付き）
      if (action.splashShipsDetails && action.splashShipsDetails.length > 0) {
        const splashShipNames = action.splashShipsDetails.map(ship => 
          `${getPlayerName(ship.owner)}の${ship.type}`
        );
        message += ` (水しぶき: ${splashShipNames.join(', ')}に接近)`;
      } else if (action.splashCount && action.splashCount > 0) {
        message += ` (水しぶき: ${action.splashCount}箇所)`;
      }
    }
    
    return message;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 h-64 overflow-y-auto">
      <h3 className="font-bold mb-3 text-gray-800">アクション履歴</h3>
      {actions.length === 0 ? (
        <p className="text-gray-500 text-sm">まだアクションがありません</p>
      ) : (
        <div className="space-y-1">
          {actions.slice().reverse().map((action, index) => (
            <div
              key={index}
              className={`text-sm p-2 rounded ${
                action.type === 'move'
                  ? 'bg-green-50 text-green-700 border-l-4 border-green-400'
                  : action.result === 'hit' 
                    ? action.shipsSunk && action.shipsSunk.length > 0
                      ? 'bg-red-100 text-red-800 border-l-4 border-red-500'
                      : 'bg-red-50 text-red-700'
                    : action.splashCount && action.splashCount > 0
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-300'
                      : 'bg-gray-50 text-gray-600'
              }`}
            >
              {formatAction(action)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionHistory;