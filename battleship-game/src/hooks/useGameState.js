import { useCallback, useEffect, useRef, useState } from "react";

export const GAME_STATES = {
  LOBBY: "lobby",
  PLACING_SHIPS: "placing_ships",
  WAITING_FOR_PLAYERS: "waiting_for_players",
  PLAYING: "playing",
  GAME_OVER: "game_over",
};

export const TURN_PHASES = {
  CHOOSE_ACTION: "choose_action",
  MOVEMENT: "movement",
  ATTACK: "attack",
};

export const SHIP_TYPES = {
  CARRIER: { name: "Carrier", size: 1 },
  BATTLESHIP: { name: "Battleship", size: 1 },
  CRUISER: { name: "Cruiser", size: 1 },
  SUBMARINE: { name: "Submarine", size: 1 },
  DESTROYER: { name: "Destroyer", size: 1 },
};

export const BOARD_SIZES = {
  2: 5,
  3: 7,
  4: 10,
  5: 12,
};

export const CELL_STATES = {
  EMPTY: "empty",
  SHIP: "ship",
  HIT: "hit",
  MISS: "miss",
  SUNK: "sunk",
  SPLASH: "splash",
};

export const useGameState = () => {
  const [gameState, setGameState] = useState(GAME_STATES.LOBBY);

  // ゲーム状態変更の監視（useEffect内で）
  useEffect(() => {
    console.log("=== GAME STATE CHANGED ===");
    console.log("New game state:", gameState);
    console.trace("Game state change stack trace:");
  }, [gameState]);

  // ゲーム状態変更をログに記録
  const loggedSetGameState = (newState) => {
    console.log("=== Game State Change ===");
    console.log("From:", gameState);
    console.log("To:", newState);
    console.trace("Stack trace:");

    // GAME_OVERへの変更を特別に監視
    if (newState === "game_over") {
      console.error("!!! GAME_OVER STATE CHANGE DETECTED !!!");
      console.error("Current state:", gameState);
      console.error("New state:", newState);
      console.trace("GAME_OVER Stack trace:");
    }

    setGameState(newState);
  };
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [board, setBoard] = useState([]);
  const [ships, setShips] = useState([]);
  const autoTurnCallbackRef = useRef(null);

  const setAutoTurnCallback = useCallback((callback) => {
    autoTurnCallbackRef.current = callback;
  }, []);

  // ボードと船を同期的に設定する関数
  const setBoardWithShips = useCallback((newBoard, newShips) => {
    console.log(
      "Setting board with ships - board cells:",
      newBoard?.flat().length,
      "ships:",
      newShips?.length,
    );

    // 新しいボードを作成してから船を配置
    const boardWithShips = newBoard.map((row) =>
      row.map((cell) => ({ ...cell, splashes: cell.splashes || [] })),
    );

    // 各船をボードセルに配置
    newShips.forEach((ship) => {
      ship.coordinates.forEach((coord) => {
        if (boardWithShips[coord.x] && boardWithShips[coord.x][coord.y]) {
          const cell = boardWithShips[coord.x][coord.y];
          if (!cell.ships) {
            cell.ships = [];
          }
          cell.ships.push({ id: ship.id, owner: ship.owner });
          cell.state = CELL_STATES.SHIP;
        }
      });
    });

    console.log(
      "Board with ships placed - cells with ships:",
      boardWithShips
        .flat()
        .filter((cell) => cell.ships && cell.ships.length > 0).length,
    );
    setBoard(boardWithShips);
    setShips(newShips);

    // 配置されたボードを返す
    return boardWithShips;
  }, []);
  const [actionHistory, setActionHistory] = useState([]);
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns, setMaxTurns] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [turnPhase, setTurnPhase] = useState(TURN_PHASES.CHOOSE_ACTION);
  const [selectedShip, setSelectedShip] = useState(null);
  const [lastAttackResult, setLastAttackResult] = useState(null);
  const [actionTaken, setActionTaken] = useState(false);
  const [gameResult, setGameResult] = useState(null); // 勝者情報

  const getBoardSize = useCallback((playerCount) => {
    return BOARD_SIZES[playerCount] || 10;
  }, []);

  const initializeBoard = useCallback((size) => {
    const newBoard = [];
    for (let i = 0; i < size; i++) {
      newBoard[i] = [];
      for (let j = 0; j < size; j++) {
        newBoard[i][j] = {
          state: CELL_STATES.EMPTY,
          ships: [],
          splashes: [],
          x: i,
          y: j,
        };
      }
    }
    return newBoard;
  }, []);

  const addPlayer = useCallback((player) => {
    setPlayers((prev) => [...prev, player]);
  }, []);

  const removePlayer = useCallback((playerId) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  }, []);

  const setPlayersArray = useCallback((playersArray) => {
    console.log("Setting players array:", playersArray);
    setPlayers(playersArray);
  }, []);

  const addAction = useCallback(
    (action) => {
      const actionWithTimestamp = {
        ...action,
        timestamp: new Date().toISOString(),
        turn: turnCount,
      };
      setActionHistory((prev) => [...prev, actionWithTimestamp]);
    },
    [turnCount],
  );

  const attack = useCallback(
    (x, y, attackerId, attackingShipId, shouldAutoTurn = true) => {
      setBoard((prev) => {
        const newBoard = [...prev];
        const cell = newBoard[x][y];

        if (
          cell.state !== CELL_STATES.EMPTY &&
          cell.state !== CELL_STATES.SHIP
        ) {
          return prev;
        }

        const isHit = cell.ships.length > 0;

        // デバッグ情報をログ出力
        if (isHit) {
          console.log(
            `Attack at (${x}, ${y}): Cell has ${cell.ships.length} ships:`,
            cell.ships.map((s) => `${s.id} (owner: ${s.owner})`),
          );
        }

        cell.state = isHit ? CELL_STATES.HIT : CELL_STATES.MISS;

        const hitShips = cell.ships.map((ship) => ship.id);
        const hitShipsDetails = cell.ships.map((ship) => ({
          id: ship.id,
          owner: ship.owner,
          type: ships.find((s) => s.id === ship.id)?.type || "Unknown",
        }));
        const sunkShips = [];
        const sunkShipsDetails = [];
        const splashCells = [];
        const splashShipsDetails = [];
        const splashShipIds = new Set(); // 重複防止用

        // 撃沈チェック - 最新のships状態を使用
        if (isHit) {
          hitShips.forEach((shipId) => {
            const ship = ships.find((s) => s.id === shipId);
            if (
              ship &&
              ship.coordinates.every(
                (coord) => newBoard[coord.x][coord.y].state === CELL_STATES.HIT,
              )
            ) {
              sunkShips.push(shipId);
              sunkShipsDetails.push({
                id: shipId,
                type: ship.type,
                owner: ship.owner,
              });
              // 撃沈した艦船のセルを更新
              ship.coordinates.forEach((coord) => {
                newBoard[coord.x][coord.y].state = CELL_STATES.SUNK;
              });
            }
          });
        } else {
          // ミスの場合、隣接セルに艦船があるかチェック（水しぶき検出）
          const adjacentOffsets = [
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
            [1, 1],
          ];

          let hasSplash = false;
          adjacentOffsets.forEach(([dx, dy]) => {
            const adjX = x + dx;
            const adjY = y + dy;

            if (
              adjX >= 0 &&
              adjX < newBoard.length &&
              adjY >= 0 &&
              adjY < newBoard[0].length
            ) {
              const adjCell = newBoard[adjX][adjY];

              // 隣接セルに艦船があり、攻撃者以外の艦船なら水しぶき
              if (adjCell.ships && adjCell.ships.length > 0) {
                const enemyShips = adjCell.ships.filter(
                  (ship) => ship.owner !== attackerId,
                );
                if (enemyShips.length > 0) {
                  splashCells.push({ x: adjX, y: adjY });
                  // 水しぶきを受けた艦船の詳細を記録（重複除去）
                  enemyShips.forEach((ship) => {
                    if (!splashShipIds.has(ship.id)) {
                      splashShipIds.add(ship.id);
                      const shipDetails = ships.find((s) => s.id === ship.id);
                      if (shipDetails) {
                        splashShipsDetails.push({
                          id: ship.id,
                          type: shipDetails.type,
                          owner: ship.owner,
                          coordinates: { x: adjX, y: adjY },
                        });
                      }
                    }
                  });
                  hasSplash = true;
                }
              }
            }
          });

          // 水しぶきがある場合は攻撃したセルに記録
          if (hasSplash) {
            if (!cell.splashes) {
              cell.splashes = [];
            }
            cell.splashes.push({
              attackerId: attackerId,
              attackCoord: { x, y },
              turn: turnCount,
            });
          }
        }

        // 実際にヒットした船の所有者のみを取得
        const affectedPlayers = isHit
          ? [...new Set(cell.ships.map((ship) => ship.owner))]
          : [];

        const action = {
          type: "attack",
          attacker: attackerId,
          attackingShipId: attackingShipId,
          coordinates: { x, y },
          result: isHit ? "hit" : "miss",
          shipsHit: hitShips,
          hitShipsDetails: hitShipsDetails,
          shipsSunk: sunkShips,
          sunkShipsDetails: sunkShipsDetails,
          affectedPlayers: affectedPlayers,
          splashCells: splashCells,
          splashShipsDetails: splashShipsDetails,
          splashCount: splashCells.length,
        };

        addAction(action);
        setLastAttackResult(action);
        setActionTaken(true);

        // 攻撃後に自動でターンを変更（現在のプレイヤーの行動の場合のみ）
        if (shouldAutoTurn) {
          setTimeout(() => {
            if (autoTurnCallbackRef.current) {
              autoTurnCallbackRef.current();
            }
          }, 1000);
        }

        return newBoard;
      });
    },
    [addAction, ships, turnCount],
  );

  const placeShip = useCallback((ship, coordinates) => {
    setBoard((prev) => {
      const newBoard = [...prev];
      coordinates.forEach((coord) => {
        const cell = newBoard[coord.x][coord.y];
        cell.state = CELL_STATES.SHIP;
        cell.ships.push(ship);
      });
      return newBoard;
    });

    setShips((prev) => [...prev, { ...ship, coordinates }]);
  }, []);

  const moveShip = useCallback(
    (shipId, newCoordinates, shouldAutoTurn = true) => {
      setBoard((prev) => {
        const newBoard = prev.map((row) => row.map((cell) => ({ ...cell })));

        // 既存の船を削除
        const ship = ships.find((s) => s.id === shipId);
        if (ship) {
          ship.coordinates.forEach((coord) => {
            const cell = newBoard[coord.x][coord.y];
            cell.ships = cell.ships.filter((s) => s.id !== shipId);
            if (cell.ships.length === 0) {
              cell.state = CELL_STATES.EMPTY;
            }
          });
        }

        // 新しい位置に船を配置
        newCoordinates.forEach((coord) => {
          const cell = newBoard[coord.x][coord.y];
          if (!cell.ships) {
            cell.ships = [];
          }
          cell.ships.push({ id: shipId, owner: ship.owner });
          cell.state = CELL_STATES.SHIP;
        });

        return newBoard;
      });

      // 船の座標を更新
      setShips((prev) =>
        prev.map((ship) =>
          ship.id === shipId ? { ...ship, coordinates: newCoordinates } : ship,
        ),
      );

      // 移動アクションを記録
      const ship = ships.find((s) => s.id === shipId);
      const oldCoordinates = ship ? ship.coordinates[0] : null;
      const newCoordinate = newCoordinates[0];

      // 移動方向と距離を計算
      let direction = "";
      let distance = 0;
      if (oldCoordinates) {
        const deltaX = newCoordinate.x - oldCoordinates.x;
        const deltaY = newCoordinate.y - oldCoordinates.y;

        if (deltaX > 0) direction = "下";
        else if (deltaX < 0) direction = "上";
        else if (deltaY > 0) direction = "右";
        else if (deltaY < 0) direction = "左";

        distance = Math.abs(deltaX) + Math.abs(deltaY);
      }

      const action = {
        type: "move",
        shipId: shipId,
        shipType: ship?.type || "Unknown",
        oldCoordinates: oldCoordinates,
        newCoordinates: newCoordinate,
        direction: direction,
        distance: distance,
        player: ship?.owner,
      };
      addAction(action);

      setSelectedShip(null);
      setActionTaken(true);

      // 移動後に自動でターンを変更（現在のプレイヤーの行動の場合のみ）
      if (shouldAutoTurn) {
        setTimeout(() => {
          if (autoTurnCallbackRef.current) {
            autoTurnCallbackRef.current();
          }
        }, 1000);
      }
    },
    [ships, addAction],
  );

  const nextTurn = useCallback(() => {
    console.log("=== nextTurn called ===");
    console.log("Current turn count:", turnCount);
    console.log("Current player:", currentPlayer?.name);
    console.log(
      "Players:",
      players.map((p) => p.name),
    );
    console.log("Game state:", gameState);

    // プレイヤーが存在しない場合の安全性チェック
    if (players.length === 0) {
      console.log("ERROR: No players found, cannot change turn");
      return;
    }

    setTurnPhase(TURN_PHASES.CHOOSE_ACTION);
    setTurnCount((prev) => {
      console.log("Turn count changing from", prev, "to", prev + 1);
      return prev + 1;
    });
    setCurrentPlayer((prev) => {
      const currentIndex = players.findIndex((p) => p.id === prev?.id);
      console.log("Current player index:", currentIndex);

      if (currentIndex === -1) {
        console.log(
          "WARNING: Current player not found in players list, using first player",
        );
        const firstPlayer = players[0];
        console.log(
          "Setting current player to first player:",
          firstPlayer?.name,
        );
        return firstPlayer;
      }

      const nextIndex = (currentIndex + 1) % players.length;
      const nextPlayer = players[nextIndex];
      console.log(
        "Current player changing from",
        prev?.name,
        "to",
        nextPlayer?.name,
      );
      return nextPlayer;
    });
    setLastAttackResult(null);
    setActionTaken(false);
    setSelectedShip(null);

    console.log("=== nextTurn finished ===");
  }, [players, gameState, turnCount, currentPlayer]);

  const chooseAction = useCallback((action) => {
    setTurnPhase(action);
  }, []);

  const isInAttackRange = useCallback(
    (attackingShipId, targetX, targetY) => {
      const attackingShip = ships.find((s) => s.id === attackingShipId);
      if (!attackingShip) return false;

      const shipCoord = attackingShip.coordinates[0];
      const distance = Math.max(
        Math.abs(targetX - shipCoord.x),
        Math.abs(targetY - shipCoord.y),
      );

      // 攻撃範囲を隣接マス（距離1）のみに制限
      return distance <= 1;
    },
    [ships],
  );

  const resetGame = useCallback(() => {
    loggedSetGameState(GAME_STATES.LOBBY);
    setPlayers([]);
    setCurrentPlayer(null);
    setBoard([]);
    setShips([]);
    setActionHistory([]);
    setTurnCount(0);
    setMaxTurns(null);
    setTurnPhase(TURN_PHASES.CHOOSE_ACTION);
    setSelectedShip(null);
    setLastAttackResult(null);
    setActionTaken(false);
    setGameResult(null);
  }, []);

  return {
    gameState,
    setGameState: loggedSetGameState,
    players,
    addPlayer,
    removePlayer,
    setPlayers: setPlayersArray,
    currentPlayer,
    setCurrentPlayer,
    board,
    setBoard,
    setBoardWithShips,
    ships,
    setShips,
    actionHistory,
    addAction,
    turnCount,
    setTurnCount,
    maxTurns,
    setMaxTurns,
    isHost,
    setIsHost,
    roomCode,
    setRoomCode,
    turnPhase,
    setTurnPhase,
    selectedShip,
    setSelectedShip,
    lastAttackResult,
    setLastAttackResult,
    actionTaken,
    setActionTaken,
    gameResult,
    setGameResult,
    getBoardSize,
    initializeBoard,
    attack,
    placeShip,
    moveShip,
    nextTurn,
    chooseAction,
    isInAttackRange,
    resetGame,
    setAutoTurnCallback,
  };
};
