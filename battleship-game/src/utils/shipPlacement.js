import { SHIP_TYPES, CELL_STATES } from '../hooks/useGameState';

export const generateRandomShips = (boardSize, playerId) => {
  console.log(`Generating ships for player ${playerId} on ${boardSize}x${boardSize} board`);
  
  // 3種類の艦船のみを使用
  const selectedShipTypes = [SHIP_TYPES.CARRIER, SHIP_TYPES.BATTLESHIP, SHIP_TYPES.CRUISER];
  
  const ships = selectedShipTypes.map((type, index) => ({
    id: `${playerId}-${type.name}-${index}`,
    type: type.name,
    size: type.size,
    owner: playerId,
    sunk: false
  }));

  console.log(`Ship types for ${playerId}:`, ships.map(s => s.type));

  const placedShips = [];
  const occupiedCells = new Set();

  for (const ship of ships) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 1000;

    while (!placed && attempts < maxAttempts) {
      const isHorizontal = Math.random() > 0.5;
      const startX = Math.floor(Math.random() * boardSize);
      const startY = Math.floor(Math.random() * boardSize);

      const coordinates = [];
      let canPlace = true;

      for (let i = 0; i < ship.size; i++) {
        const x = isHorizontal ? startX : startX + i;
        const y = isHorizontal ? startY + i : startY;

        if (x >= boardSize || y >= boardSize || occupiedCells.has(`${x},${y}`)) {
          canPlace = false;
          break;
        }

        coordinates.push({ x, y });
      }

      if (canPlace) {
        coordinates.forEach(coord => {
          occupiedCells.add(`${coord.x},${coord.y}`);
        });

        placedShips.push({
          ...ship,
          coordinates,
          isHorizontal
        });

        placed = true;
      }

      attempts++;
    }

    if (!placed) {
      console.warn(`Could not place ship ${ship.type} for player ${playerId}`);
    }
  }

  console.log(`Successfully placed ${placedShips.length} ships for player ${playerId}`);
  return placedShips;
};

export const isShipSunk = (ship, board) => {
  return ship.coordinates.every(coord => {
    const cell = board[coord.x][coord.y];
    return cell.state === CELL_STATES.HIT || cell.state === CELL_STATES.SUNK;
  });
};

export const checkAllShipsSunk = (ships, board) => {
  // 艦船が存在しない場合は撃沈済みとはみなさない
  if (ships.length === 0) {
    return false;
  }
  return ships.every(ship => isShipSunk(ship, board));
};

export const getPlayerShips = (ships, playerId) => {
  return ships.filter(ship => ship.owner === playerId);
};

export const getRemainingShipsCount = (ships, board, playerId) => {
  const playerShips = getPlayerShips(ships, playerId);
  return playerShips.filter(ship => !isShipSunk(ship, board)).length;
};