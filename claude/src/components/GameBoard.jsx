import React, { useEffect, useState } from "react";
import { CELL_STATES, TURN_PHASES } from "../hooks/useGameState";

const GameBoard = ({
  board,
  onCellClick,
  currentPlayer,
  isMyTurn,
  showMyShips = false,
  myPlayerId,
  lastAction,
  turnPhase,
  selectedShip,
  onShipSelect,
  onShipMove,
  ships,
  lastAttackResult,
  onChooseAction,
  actionTaken,
  isInAttackRange,
}) => {
  const boardSize = board.length;
  const [attackingCell, setAttackingCell] = useState(null);
  const [splashEffect, setSplashEffect] = useState(new Set());
  const [hoveredCell, setHoveredCell] = useState(null);

  // 最新の攻撃で水しぶき情報をチェック
  useEffect(() => {
    if (lastAction && lastAction.type === "attack") {
      // 攻撃がミスで水しぶきがある場合のみ、攻撃セルに水しぶきエフェクトを表示
      if (lastAction.result === "miss" && lastAction.splashCount > 0) {
        const attackCellKey = `${lastAction.coordinates.x},${lastAction.coordinates.y}`;
        setSplashEffect((prev) => new Set(prev).add(attackCellKey));

        // 水しぶきエフェクトを2秒後に停止
        setTimeout(() => {
          setSplashEffect((prev) => {
            const newSet = new Set(prev);
            newSet.delete(attackCellKey);
            return newSet;
          });
        }, 2000);
      }

    }
  }, [lastAction]);

  const getCellStyle = (cell) => {
    const baseStyle =
      "w-8 h-8 border border-gray-400 flex items-center justify-center cursor-pointer transition-all duration-300";
    const cellKey = `${cell.x},${cell.y}`;
    const isAttacking = attackingCell === cellKey;
    const hasSplash = splashEffect.has(cellKey);

    // 最新の攻撃結果のみ表示
    const isLatestAttack =
      lastAttackResult &&
      lastAttackResult.coordinates.x === cell.x &&
      lastAttackResult.coordinates.y === cell.y;

    if (isLatestAttack) {
      if (lastAttackResult.result === "hit") {
        return `${baseStyle} bg-red-500 text-white ${
          hasSplash ? "animate-bounce" : ""
        }`;
      } else {
        const splashAnimation = hasSplash ? "animate-pulse" : "";
        return `${baseStyle} bg-blue-200 text-blue-800 ${splashAnimation}`;
      }
    }

    if (cell.state === CELL_STATES.SUNK) {
      return `${baseStyle} bg-red-800 text-white`;
    }

    if (cell.state === CELL_STATES.SHIP) {
      const hasMyShip =
        cell.ships && cell.ships.some((ship) => ship.owner === myPlayerId);
      const isSelected =
        selectedShip && cell.ships.some((ship) => ship.id === selectedShip.id);

      if (showMyShips && hasMyShip) {
        let shipStyle = "bg-green-400";
        if (isSelected) {
          shipStyle = "bg-yellow-400 ring-2 ring-yellow-600";
        }
        return `${baseStyle} ${shipStyle} text-white`;
      }
      // 移動可能位置の表示（敵艦があるセルでも優先）
      if (
        turnPhase === TURN_PHASES.MOVEMENT &&
        selectedShip &&
        isMyTurn &&
        !actionTaken &&
        !hasMyShip
      ) {
        const canMoveTo = isValidMovePosition(cell.x, cell.y);
        if (canMoveTo) {
          return `${baseStyle} bg-green-200 hover:bg-green-300`;
        }
      }

      // 敵艦船でも攻撃範囲内なら色を変更
      if (
        turnPhase === TURN_PHASES.ATTACK &&
        selectedShip &&
        isMyTurn &&
        !actionTaken &&
        !hasMyShip
      ) {
        const canAttack =
          isInAttackRange(selectedShip.id, cell.x, cell.y) &&
          cell.state !== CELL_STATES.SUNK;
        if (canAttack) {
          return `${baseStyle} bg-red-200 hover:bg-red-300`;
        }
      }
      // 敵艦船は通常のセルと同じ見た目にする
      return `${baseStyle} bg-gray-100 hover:bg-gray-200`;
    }

    if (isAttacking) {
      return `${baseStyle} bg-yellow-300 animate-ping`;
    }

    // 移動可能位置の表示
    if (
      turnPhase === TURN_PHASES.MOVEMENT &&
      selectedShip &&
      isMyTurn &&
      !actionTaken
    ) {
      const canMoveTo = isValidMovePosition(cell.x, cell.y);
      if (canMoveTo) {
        return `${baseStyle} bg-green-200 hover:bg-green-300`;
      }
    }

    // 攻撃可能位置の表示
    if (
      turnPhase === TURN_PHASES.ATTACK &&
      selectedShip &&
      isMyTurn &&
      !actionTaken
    ) {
      // 範囲内で、自分の艦船でない場合は攻撃可能（撃沈済みセル以外）
      const hasMyShip =
        cell.ships && cell.ships.some((ship) => ship.owner === myPlayerId);
      const canAttack =
        isInAttackRange(selectedShip.id, cell.x, cell.y) &&
        cell.state !== CELL_STATES.SUNK &&
        (cell.state === CELL_STATES.EMPTY ||
          cell.state === CELL_STATES.MISS ||
          cell.state === CELL_STATES.HIT ||
          (cell.state === CELL_STATES.SHIP && !hasMyShip));
      if (canAttack) {
        return `${baseStyle} bg-red-200 hover:bg-red-300`;
      }
    }

    return `${baseStyle} bg-gray-100 hover:bg-gray-200`;
  };

  const isValidMovePosition = (x, y) => {
    if (!selectedShip) return false;

    // 選択された船の現在位置を取得
    const currentCoord = selectedShip.coordinates[0];

    // 縦横移動のみ許可（斜め移動は禁止）
    const dx = Math.abs(x - currentCoord.x);
    const dy = Math.abs(y - currentCoord.y);

    // 斜め移動は禁止（dx > 0 && dy > 0）
    if (dx > 0 && dy > 0) return false;
    // 同じ位置への移動は無効
    if (dx === 0 && dy === 0) return false;

    // 艦船は重複配置可能なので、自分の艦船がない場所なら移動可能
    const cell = board[x][y];
    
    // 自分の艦船がある場合は移動不可
    if (cell.ships && cell.ships.some(ship => ship.owner === myPlayerId)) {
      return false;
    }
    
    // 空のセルまたは敵艦のみがあるセルなら移動可能
    return true;
  };

  const getCellContent = (cell) => {
    const cellKey = `${cell.x},${cell.y}`;
    const isAttacking = attackingCell === cellKey;
    const hasSplash = splashEffect.has(cellKey);

    // 最新の攻撃結果のみ表示
    const isLatestAttack =
      lastAttackResult &&
      lastAttackResult.coordinates.x === cell.x &&
      lastAttackResult.coordinates.y === cell.y;

    if (isLatestAttack) {
      if (lastAttackResult.result === "hit") {
        return hasSplash ? "💥" : "×";
      } else {
        return hasSplash ? "💧" : "〇";
      }
    }

    if (cell.state === CELL_STATES.SUNK) return "●";
    if (
      cell.state === CELL_STATES.SHIP &&
      showMyShips &&
      cell.ships.some((ship) => ship.owner === myPlayerId)
    ) {
      return "■";
    }
    if (isAttacking) {
      return "🎯";
    }

    // 移動可能位置の表示
    if (
      turnPhase === TURN_PHASES.MOVEMENT &&
      selectedShip &&
      isMyTurn &&
      !actionTaken
    ) {
      const canMoveTo = isValidMovePosition(cell.x, cell.y);
      if (canMoveTo) {
        return "➤";
      }
    }

    // 攻撃可能位置の表示
    if (
      turnPhase === TURN_PHASES.ATTACK &&
      selectedShip &&
      isMyTurn &&
      !actionTaken
    ) {
      // 範囲内で、自分の艦船でない場合は攻撃可能（撃沈済みセル以外）
      const hasMyShip =
        cell.ships && cell.ships.some((ship) => ship.owner === myPlayerId);
      const canAttack =
        isInAttackRange(selectedShip.id, cell.x, cell.y) &&
        cell.state !== CELL_STATES.SUNK &&
        (cell.state === CELL_STATES.EMPTY ||
          cell.state === CELL_STATES.MISS ||
          cell.state === CELL_STATES.HIT ||
          (cell.state === CELL_STATES.SHIP && !hasMyShip));
      if (canAttack) {
        return "🎯";
      }
    }

    return "";
  };

  const handleCellClick = (x, y) => {
    if (!isMyTurn || actionTaken) return;

    if (turnPhase === TURN_PHASES.MOVEMENT) {
      const cell = board[x][y];

      // 自分の船をクリックした場合は選択
      if (
        cell.state === CELL_STATES.SHIP &&
        cell.ships.some((ship) => ship.owner === myPlayerId)
      ) {
        const ship = ships.find(
          (s) =>
            s.coordinates.some((coord) => coord.x === x && coord.y === y) &&
            s.owner === myPlayerId,
        );
        if (ship) {
          onShipSelect(ship);
        }
      }
      // 移動可能位置をクリックした場合は移動
      else if (selectedShip && isValidMovePosition(x, y)) {
        onShipMove(selectedShip.id, [{ x, y }]);
      }
    } else if (turnPhase === TURN_PHASES.ATTACK && onCellClick) {
      const cell = board[x][y];

      // 自分の船をクリックした場合は選択
      if (
        cell.state === CELL_STATES.SHIP &&
        cell.ships.some((ship) => ship.owner === myPlayerId)
      ) {
        const ship = ships.find(
          (s) =>
            s.coordinates.some((coord) => coord.x === x && coord.y === y) &&
            s.owner === myPlayerId,
        );
        if (ship) {
          onShipSelect(ship);
        }
        return;
      }

      // 撃沈済みのセルは攻撃不可
      if (cell.state === CELL_STATES.SUNK) return;

      // 攻撃船が選択されていない場合は選択を促す
      if (!selectedShip) {
        return;
      }

      // 自分の艦船への攻撃は不可
      if (
        cell.state === CELL_STATES.SHIP &&
        cell.ships.some((ship) => ship.owner === myPlayerId)
      ) {
        return;
      }

      // 攻撃範囲内でない場合は攻撃不可
      if (!isInAttackRange(selectedShip.id, x, y)) {
        return;
      }

      const cellKey = `${x},${y}`;

      // 攻撃エフェクトを開始
      setAttackingCell(cellKey);

      // 攻撃実行
      onCellClick(x, y, selectedShip.id);

      // 攻撃エフェクトを停止
      setTimeout(() => {
        setAttackingCell(null);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <div className="mb-4">
        <h3 className="text-lg font-bold">
          {currentPlayer ? `${currentPlayer.name}のターン` : "ゲーム待機中"}
        </h3>
        {isMyTurn && (
          <div>
            <p className="text-green-600 font-semibold">あなたのターンです</p>
            <p className="text-sm text-gray-600">
              {turnPhase === TURN_PHASES.CHOOSE_ACTION
                ? "アクション選択"
                : turnPhase === TURN_PHASES.MOVEMENT
                  ? "移動フェーズ"
                  : "攻撃フェーズ"}
            </p>
            {selectedShip && (
              <p className="text-sm text-yellow-600">
                船を選択中: {selectedShip.type}
                {turnPhase === TURN_PHASES.ATTACK && " (攻撃範囲: 3セル)"}
              </p>
            )}
            {actionTaken && (
              <p className="text-sm text-blue-600">
                アクション完了 - 次のターンへ進んでください
              </p>
            )}
          </div>
        )}
      </div>

      {/* アクション選択ボタン */}
      {isMyTurn && turnPhase === TURN_PHASES.CHOOSE_ACTION && !actionTaken && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => onChooseAction(TURN_PHASES.MOVEMENT)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            移動
          </button>
          <button
            onClick={() => onChooseAction(TURN_PHASES.ATTACK)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            攻撃
          </button>
        </div>
      )}

      {/* 攻撃フェーズでの船選択指示 */}
      {isMyTurn &&
        turnPhase === TURN_PHASES.ATTACK &&
        !selectedShip &&
        !actionTaken && (
          <div className="mb-4">
            <p className="text-sm text-orange-600">
              攻撃する船を選択してください
            </p>
          </div>
        )}

      <div
        className="grid gap-1 border-2 border-gray-600 p-2 bg-white"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
          gridTemplateRows: `repeat(${boardSize}, 1fr)`,
        }}
      >
        {board.map((row, x) =>
          row.map((cell, y) => (
            <div
              key={`${x}-${y}`}
              className={`${getCellStyle(cell)} relative`}
              onClick={() => handleCellClick(x, y)}
              onMouseEnter={() => setHoveredCell({ x, y })}
              onMouseLeave={() => setHoveredCell(null)}
            >
              {getCellContent(cell)}
              {hoveredCell && hoveredCell.x === x && hoveredCell.y === y && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10 pointer-events-none">
                  <div>({x}, {y})</div>
                  {cell.ships && cell.ships.length > 0 && (
                    <div className="mt-1">
                      {/* 自分の船のみ表示し、重複を除去 */}
                      {Array.from(new Set(
                        cell.ships
                          .filter(cellShip => cellShip.owner === myPlayerId)
                          .map(cellShip => {
                            const ship = ships.find(s => s.id === cellShip.id);
                            return ship?.type || "Unknown";
                          })
                      )).map((shipType, index) => (
                        <div key={index} className="text-green-300">
                          {shipType}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )),
        )}
      </div>

      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-200 border border-gray-400"></div>
          <span>ミス</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500 border border-gray-400"></div>
          <span>ヒット</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-800 border border-gray-400"></div>
          <span>撃沈</span>
        </div>
        {showMyShips && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-400 border border-gray-400"></div>
            <span>自分の艦船</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
