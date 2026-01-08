import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Coins, ChevronLeft, ChevronRight } from 'lucide-react';

interface GameObject {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: 'rock' | 'coin' | 'star' | 'gem';
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GameDimensions {
  width: number;
  height: number;
  playerSize: number;
  objectSize: number;
  playerSpeed: number;
  fontSize: {
    object: string;
    player: string;
  };
}

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const BASE_PLAYER_SIZE = 40;
const BASE_OBJECT_SIZE = 30;
const BASE_PLAYER_SPEED = 8;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;
const MIN_SCALE = 0.35;

function useGameDimensions(): GameDimensions {
  const [dimensions, setDimensions] = useState<GameDimensions>(() => calculateDimensions());

  function calculateDimensions(): GameDimensions {
    const availableWidth = window.innerWidth - 16;
    const availableHeight = window.innerHeight * 0.6;
    
    const widthScale = availableWidth / BASE_WIDTH;
    const heightScale = availableHeight / BASE_HEIGHT;
    const rawScale = Math.min(widthScale, heightScale, 1);
    const scale = Math.max(rawScale, MIN_SCALE);
    
    const width = Math.max(MIN_WIDTH, Math.min(Math.floor(BASE_WIDTH * scale), availableWidth));
    const height = Math.max(MIN_HEIGHT, Math.floor(BASE_HEIGHT * scale));
    const playerSize = Math.max(20, Math.floor(BASE_PLAYER_SIZE * scale));
    const objectSize = Math.max(16, Math.floor(BASE_OBJECT_SIZE * scale));
    const playerSpeed = Math.max(3, BASE_PLAYER_SPEED * scale);

    return {
      width,
      height,
      playerSize,
      objectSize,
      playerSpeed,
      fontSize: {
        object: `${Math.max(14, Math.floor(24 * scale))}px`,
        player: `${Math.max(18, Math.floor(32 * scale))}px`,
      },
    };
  }

  useEffect(() => {
    const handleResize = () => {
      setDimensions(calculateDimensions());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
}

function App() {
  const dims = useGameDimensions();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [player, setPlayer] = useState<Player>({
    x: dims.width / 2 - dims.playerSize / 2,
    y: dims.height - dims.playerSize - 20,
    width: dims.playerSize,
    height: dims.playerSize,
  });
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [touchDirection, setTouchDirection] = useState<'left' | 'right' | null>(null);

  const gameLoopRef = useRef<number>();
  const objectIdRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const dimsRef = useRef(dims);

  useEffect(() => {
    dimsRef.current = dims;
  }, [dims]);

  useEffect(() => {
    if (!gameStarted) {
      setPlayer({
        x: dims.width / 2 - dims.playerSize / 2,
        y: dims.height - dims.playerSize - 20,
        width: dims.playerSize,
        height: dims.playerSize,
      });
    }
  }, [dims, gameStarted]);

  const spawnObject = useCallback(() => {
    const types: Array<'rock' | 'coin' | 'star' | 'gem'> = ['rock', 'rock', 'coin', 'star', 'gem'];
    const type = types[Math.floor(Math.random() * types.length)];
    const currentDims = dimsRef.current;
    const baseSpeed = (type === 'rock' ? 3 + Math.random() * 2 : 2 + Math.random() * 1.5);
    const scaledSpeed = baseSpeed * (currentDims.height / BASE_HEIGHT);

    const newObject: GameObject = {
      id: objectIdRef.current++,
      x: Math.random() * (currentDims.width - currentDims.objectSize),
      y: -currentDims.objectSize,
      speed: scaledSpeed,
      type,
    };

    setObjects(prev => [...prev, newObject]);
  }, []);

  const checkCollision = useCallback((obj: GameObject, plr: Player) => {
    const currentDims = dimsRef.current;
    return (
      obj.x < plr.x + plr.width &&
      obj.x + currentDims.objectSize > plr.x &&
      obj.y < plr.y + plr.height &&
      obj.y + currentDims.objectSize > plr.y
    );
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameStarted || gameOver) return;

    const currentDims = dimsRef.current;
    const now = Date.now();

    if (now - lastSpawnRef.current > 1000) {
      spawnObject();
      lastSpawnRef.current = now;
    }

    let currentPlayer = player;

    setPlayer(prev => {
      let newX = prev.x;
      const isMovingLeft = keys.has('ArrowLeft') || keys.has('a') || keys.has('A') || touchDirection === 'left';
      const isMovingRight = keys.has('ArrowRight') || keys.has('d') || keys.has('D') || touchDirection === 'right';

      if (isMovingLeft) {
        newX = Math.max(0, prev.x - currentDims.playerSpeed);
      }
      if (isMovingRight) {
        newX = Math.min(currentDims.width - currentDims.playerSize, prev.x + currentDims.playerSpeed);
      }

      currentPlayer = { ...prev, x: newX };
      return currentPlayer;
    });

    setObjects(prev => {
      const updated = prev
        .map(obj => ({ ...obj, y: obj.y + obj.speed }))
        .filter(obj => obj.y < currentDims.height);

      const remaining: GameObject[] = [];

      updated.forEach(obj => {
        if (checkCollision(obj, currentPlayer)) {
          if (obj.type === 'rock') {
            setLives(l => {
              const newLives = l - 1;
              if (newLives <= 0) {
                setGameOver(true);
              }
              return newLives;
            });
          } else if (obj.type === 'coin') {
            setScore(s => s + 10);
          } else if (obj.type === 'star') {
            setScore(s => s + 25);
          } else if (obj.type === 'gem') {
            setScore(s => s + 50);
          }
        } else {
          remaining.push(obj);
        }
      });

      return remaining;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameStarted, gameOver, keys, player, checkCollision, spawnObject, touchDirection]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return () => {
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
      };
    }
  }, [gameStarted, gameOver, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.key));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key);
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setLives(3);
    setObjects([]);
    setPlayer({
      x: dims.width / 2 - dims.playerSize / 2,
      y: dims.height - dims.playerSize - 20,
      width: dims.playerSize,
      height: dims.playerSize,
    });
    lastSpawnRef.current = Date.now();
  };

  const getObjectEmoji = (type: string) => {
    switch (type) {
      case 'rock': return '🪨';
      case 'coin': return '🪙';
      case 'star': return '⭐';
      case 'gem': return '💎';
      default: return '❓';
    }
  };

  const handleTouchStart = (direction: 'left' | 'right') => {
    setTouchDirection(direction);
  };

  const handleTouchEnd = () => {
    setTouchDirection(null);
  };

  const groundHeight = Math.max(8, Math.floor(12 * (dims.height / BASE_HEIGHT)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 flex items-center justify-center p-2 sm:p-4">
      <div className="flex flex-col items-center gap-2 sm:gap-4 w-full max-w-4xl">
        <div className="text-center text-white">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-1 sm:mb-2 drop-shadow-lg">Falling Rocks</h1>
          <p className="text-xs sm:text-base md:text-lg opacity-90">Dodge rocks and collect coins!</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-6 py-2 sm:py-3 flex items-center gap-4 sm:gap-8 text-white">
          <div className="flex items-center gap-1 sm:gap-2">
            <Coins className="w-4 h-4 sm:w-6 sm:h-6" />
            <span className="text-lg sm:text-2xl font-bold" data-testid="text-score">{score}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 sm:w-6 sm:h-6 ${i < lives ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
                data-testid={`icon-life-${i}`}
              />
            ))}
          </div>
        </div>

        <div
          className="relative bg-gradient-to-b from-sky-300 to-green-400 rounded-lg shadow-2xl overflow-hidden border-2 sm:border-4 border-white/30"
          style={{ width: dims.width, height: dims.height }}
          data-testid="game-area"
        >
          {!gameStarted ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="text-center px-4">
                <button
                  onClick={startGame}
                  className="px-4 sm:px-8 py-2 sm:py-4 bg-green-500 hover:bg-green-600 text-white text-lg sm:text-2xl font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all"
                  data-testid="button-start"
                >
                  Start Game
                </button>
                <p className="mt-2 sm:mt-4 text-white text-xs sm:text-sm">
                  Use arrow keys or A/D to move
                </p>
                <p className="mt-1 text-white text-xs sm:text-sm opacity-75">
                  On mobile: use the buttons below
                </p>
              </div>
            </div>
          ) : gameOver ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center bg-white rounded-xl p-4 sm:p-8 shadow-2xl mx-4">
                <h2 className="text-2xl sm:text-4xl font-bold text-red-600 mb-2 sm:mb-4">Game Over!</h2>
                <p className="text-lg sm:text-2xl mb-2">Score: <span className="font-bold text-blue-600" data-testid="text-final-score">{score}</span></p>
                <button
                  onClick={startGame}
                  className="mt-2 sm:mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white text-base sm:text-xl font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all"
                  data-testid="button-restart"
                >
                  Play Again
                </button>
              </div>
            </div>
          ) : null}

          {gameStarted && (
            <>
              {objects.map(obj => (
                <div
                  key={obj.id}
                  className="absolute transition-none"
                  style={{
                    left: obj.x,
                    top: obj.y,
                    width: dims.objectSize,
                    height: dims.objectSize,
                    lineHeight: `${dims.objectSize}px`,
                    textAlign: 'center',
                    fontSize: dims.fontSize.object,
                  }}
                >
                  {getObjectEmoji(obj.type)}
                </div>
              ))}

              <div
                className="absolute transition-none z-10"
                style={{
                  left: player.x,
                  top: player.y,
                  width: dims.playerSize,
                  height: dims.playerSize,
                  lineHeight: `${dims.playerSize}px`,
                  textAlign: 'center',
                  fontSize: dims.fontSize.player,
                }}
              >
                🏃
              </div>
            </>
          )}

          <div 
            className="absolute bottom-0 left-0 right-0 bg-green-600 border-t-2 sm:border-t-4 border-green-700"
            style={{ height: groundHeight }}
          />
        </div>

        {gameStarted && !gameOver && (
          <div className="flex gap-4 sm:hidden">
            <button
              onTouchStart={() => handleTouchStart('left')}
              onTouchEnd={handleTouchEnd}
              onMouseDown={() => handleTouchStart('left')}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                touchDirection === 'left' ? 'bg-blue-600 scale-95' : 'bg-blue-500'
              }`}
              data-testid="button-move-left"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onTouchStart={() => handleTouchStart('right')}
              onTouchEnd={handleTouchEnd}
              onMouseDown={() => handleTouchStart('right')}
              onMouseUp={handleTouchEnd}
              onMouseLeave={handleTouchEnd}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                touchDirection === 'right' ? 'bg-blue-600 scale-95' : 'bg-blue-500'
              }`}
              data-testid="button-move-right"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>
        )}

        <div className="text-white text-center bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-6 py-2 sm:py-3">
          <p className="text-xs sm:text-sm">
            🪨 Rock = -1 life | 🪙 Coin = +10 | ⭐ Star = +25 | 💎 Gem = +50
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
