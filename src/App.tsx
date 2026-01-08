import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Coins } from 'lucide-react';

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

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 40;
const OBJECT_SIZE = 30;
const PLAYER_SPEED = 8;

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [player, setPlayer] = useState<Player>({
    x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
    y: GAME_HEIGHT - PLAYER_SIZE - 20,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
  });
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [keys, setKeys] = useState<Set<string>>(new Set());

  const gameLoopRef = useRef<number>();
  const objectIdRef = useRef(0);
  const lastSpawnRef = useRef(0);

  const spawnObject = useCallback(() => {
    const types: Array<'rock' | 'coin' | 'star' | 'gem'> = ['rock', 'rock', 'coin', 'star', 'gem'];
    const type = types[Math.floor(Math.random() * types.length)];

    const newObject: GameObject = {
      id: objectIdRef.current++,
      x: Math.random() * (GAME_WIDTH - OBJECT_SIZE),
      y: -OBJECT_SIZE,
      speed: type === 'rock' ? 3 + Math.random() * 2 : 2 + Math.random() * 1.5,
      type,
    };

    setObjects(prev => [...prev, newObject]);
  }, []);

  const checkCollision = useCallback((obj: GameObject, plr: Player) => {
    return (
      obj.x < plr.x + plr.width &&
      obj.x + OBJECT_SIZE > plr.x &&
      obj.y < plr.y + plr.height &&
      obj.y + OBJECT_SIZE > plr.y
    );
  }, []);

  const gameLoop = useCallback(() => {
    if (!gameStarted || gameOver) return;

    const now = Date.now();

    if (now - lastSpawnRef.current > 1000) {
      spawnObject();
      lastSpawnRef.current = now;
    }

    let currentPlayer = player;

    setPlayer(prev => {
      let newX = prev.x;

      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
        newX = Math.max(0, prev.x - PLAYER_SPEED);
      }
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
        newX = Math.min(GAME_WIDTH - PLAYER_SIZE, prev.x + PLAYER_SPEED);
      }

      currentPlayer = { ...prev, x: newX };
      return currentPlayer;
    });

    setObjects(prev => {
      const updated = prev
        .map(obj => ({ ...obj, y: obj.y + obj.speed }))
        .filter(obj => obj.y < GAME_HEIGHT);

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
  }, [gameStarted, gameOver, keys, player, checkCollision, spawnObject]);

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
      x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
      y: GAME_HEIGHT - PLAYER_SIZE - 20,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-2 drop-shadow-lg">Падащи Камъни</h1>
          <p className="text-lg opacity-90">Избягвай камъните и събирай монети!</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 flex items-center gap-8 text-white">
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6" />
            <span className="text-2xl font-bold">{score}</span>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart
                key={i}
                className={`w-6 h-6 ${i < lives ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
              />
            ))}
          </div>
        </div>

        <div
          className="relative bg-gradient-to-b from-sky-300 to-green-400 rounded-lg shadow-2xl overflow-hidden border-4 border-white/30"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        >
          {!gameStarted ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="text-center">
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white text-2xl font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all"
                >
                  Започни Игра
                </button>
                <p className="mt-4 text-white text-sm">
                  Използвай ← → или A/D за движение
                </p>
              </div>
            </div>
          ) : gameOver ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center bg-white rounded-xl p-8 shadow-2xl">
                <h2 className="text-4xl font-bold text-red-600 mb-4">Край на играта!</h2>
                <p className="text-2xl mb-2">Резултат: <span className="font-bold text-blue-600">{score}</span></p>
                <button
                  onClick={startGame}
                  className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all"
                >
                  Играй Отново
                </button>
              </div>
            </div>
          ) : null}

          {gameStarted && (
            <>
              {objects.map(obj => (
                <div
                  key={obj.id}
                  className="absolute text-3xl transition-none"
                  style={{
                    left: obj.x,
                    top: obj.y,
                    width: OBJECT_SIZE,
                    height: OBJECT_SIZE,
                    lineHeight: `${OBJECT_SIZE}px`,
                    textAlign: 'center',
                  }}
                >
                  {getObjectEmoji(obj.type)}
                </div>
              ))}

              <div
                className="absolute text-4xl transition-none z-10"
                style={{
                  left: player.x,
                  top: player.y,
                  width: PLAYER_SIZE,
                  height: PLAYER_SIZE,
                  lineHeight: `${PLAYER_SIZE}px`,
                  textAlign: 'center',
                }}
              >
                🏃
              </div>
            </>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-12 bg-green-600 border-t-4 border-green-700"></div>
        </div>

        <div className="text-white text-center bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
          <p className="text-sm">
            🪨 Камъни = -1 живот | 🪙 Монети = +10 | ⭐ Звезди = +25 | 💎 Диаманти = +50
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
