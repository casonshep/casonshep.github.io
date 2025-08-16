import { useEffect, useRef, useState } from 'react';
import type { ConwayCanvasProps } from '../utils/types';
import { useConway } from '../hooks/useConway';

export const ConwayCanvas: React.FC<ConwayCanvasProps> = ({
  config,
  onAnimationComplete,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const conwayState = useConway(config);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = config.width * config.cellSize;
    canvas.height = config.height * config.cellSize;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F5F5F5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setIsInitialized(true);
    }
  }, [config]);

  // Draw grid when state changes
  useEffect(() => {
    if (!isInitialized || !canvasRef.current || !conwayState.grid.cells.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGrid(ctx, conwayState.grid.cells);
  }, [conwayState.grid, isInitialized, config]);

  // Handle animation completion
  useEffect(() => {
    if (!conwayState.isAnimating && conwayState.currentFrame > 0 && onAnimationComplete) {
      onAnimationComplete();
    }
  }, [conwayState.isAnimating, conwayState.currentFrame, onAnimationComplete]);

  const drawGrid = (ctx: CanvasRenderingContext2D, grid: number[][]) => {
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw background
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw cells
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === 1) {
          ctx.fillStyle = '#2C2C2C';
          ctx.fillRect(
            x * config.cellSize + 1,
            y * config.cellSize + 1,
            config.cellSize - 1,
            config.cellSize - 1
          );
        }
      }
    }
    
    // Draw grid lines
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= config.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * config.cellSize, 0);
      ctx.lineTo(x * config.cellSize, ctx.canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= config.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * config.cellSize);
      ctx.lineTo(ctx.canvas.width, y * config.cellSize);
      ctx.stroke();
    }
  };

  const handleStartAnimation = () => {
    conwayState.startAnimation();
  };

  return (
    <div className={`game-of-life-container flex justify-center mx-10 max-w-4xl w-full px-5 ${className}`}>
      <div className="game-window w-full max-w-full">
        <div className="window-header">
          <span className="window-title">Enjoy this cellular welcome from Conway's Automata.</span>
          <div className="window-controls">
            <span className="control"></span>
            <span className="control"></span>
            <span className="control"></span>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="block bg-white w-full h-auto max-w-full pixel-perfect"
          style={{ aspectRatio: '2 / 1' }}
        />
        {!conwayState.isAnimating && conwayState.currentFrame === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
            <button
              onClick={handleStartAnimation}
              className="btn btn-primary"
            >
              Start Animation
            </button>
          </div>
        )}
        {conwayState.isAnimating && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            {Math.round(conwayState.progress * 100)}%
          </div>
        )}
      </div>
    </div>
  );
};