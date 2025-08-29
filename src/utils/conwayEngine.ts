import type { ConwayGrid, ConwayConfig, AnimationFrame } from './types';
import { getLetterPattern } from './fontPatterns';

export class ConwayEngine {
  private config: ConwayConfig;
  private states: AnimationFrame[] = [];

  constructor(config: ConwayConfig) {
    this.config = config;
  }

  public generateStates(): AnimationFrame[] {
    const finalGrid = this.createWelcomePattern();
    this.states = this.generateAnimationStates(finalGrid);
    return this.states;
  }

  private createEmptyGrid(): number[][] {
    return Array(this.config.height).fill(null).map(() => 
      Array(this.config.width).fill(0)
    );
  }

  private copyGrid(grid: number[][]): number[][] {
    return grid.map(row => [...row]);
  }

  private createWelcomePattern(): ConwayGrid {
    const grid = this.createEmptyGrid();
    const message = "hi im cason";
    
    // Split message into words
    const words = message.split(' ');
    const maxLineLength = 15; // Maximum characters per line
    const lineHeight = 10; // Pixels between lines
    
    // Function to split text into lines that fit within maxLineLength
    const splitIntoLines = (words: string[], maxLength: number): string[] => {
      const lines: string[] = [];
      let currentLine: string[] = [];
      let currentLength = 0;
      
      words.forEach(word => {
        // If adding another word would exceed max length, start a new line
        if (currentLength + word.length > maxLength) {
          lines.push(currentLine.join(' '));
          currentLine = [word];
          currentLength = word.length + 1;
        } else {
          currentLine.push(word);
          currentLength += word.length + 1; // +1 for space
        }
      });
      
      // Add the last line if not empty
      if (currentLine.length > 0) {
        lines.push(currentLine.join(' '));
      }
      
      return lines;
    };
    
    const lines = splitIntoLines(words, maxLineLength);
    const startY = Math.max(10, Math.floor((this.config.height - (lines.length * lineHeight)) / 2));
    
    lines.forEach((line, lineIndex) => {
      const lineWidth = line.length * 8; // 8 pixels per character (7 width + 1 space)
      let currentX = Math.max(0, Math.floor((this.config.width - lineWidth) / 2));
      
      // Place each character in the line
      for (let i = 0; i < line.length; i++) {
        const letter = line[i];
        const pattern = getLetterPattern(letter);
        
        // Place letter pattern on grid
        for (let y = 0; y < pattern.length; y++) {
          for (let x = 0; x < pattern[y].length; x++) {
            const gridY = startY + (lineIndex * lineHeight) + y;
            const gridX = currentX + x;
            
            if (gridX < this.config.width && gridY < this.config.height && 
                gridX >= 0 && gridY >= 0) {
              grid[gridY][gridX] = pattern[y][x];
            }
          }
        }
        
        currentX += 8; // Move to next character position (7px char + 1px space)
      }
    });
    
    return {
      width: this.config.width,
      height: this.config.height,
      cells: grid
    };
  }

  private generateAnimationStates(finalGrid: ConwayGrid): AnimationFrame[] {
    const states: AnimationFrame[] = [];
    let currentGrid = this.copyGrid(finalGrid.cells);
    
    // Store the final state first
    states.push({
      grid: this.copyGrid(currentGrid),
      timestamp: Date.now()
    });
    
    // Generate states by running forward simulation
    for (let i = 0; i < this.config.maxIterations; i++) {
      currentGrid = this.getNextGeneration(currentGrid);
      states.push({
        grid: this.copyGrid(currentGrid),
        timestamp: Date.now() + i * this.config.animationSpeed
      });
    }
    
    // Reverse the states so we play from chaotic to organized
    return states.reverse();
  }

  private getNextGeneration(grid: number[][]): number[][] {
    const newGrid = this.createEmptyGrid();
    
    for (let y = 0; y < this.config.height; y++) {
      for (let x = 0; x < this.config.width; x++) {
        const neighbors = this.countNeighbors(grid, x, y);
        const cell = grid[y][x];
        
        if (cell === 1) {
          // Live cell
          if (neighbors < 2) {
            newGrid[y][x] = 0; // Dies from underpopulation
          } else if (neighbors === 2 || neighbors === 3) {
            newGrid[y][x] = 1; // Survives
          } else {
            newGrid[y][x] = 0; // Dies from overpopulation
          }
        } else {
          // Dead cell
          if (neighbors === 3) {
            newGrid[y][x] = 1; // Becomes alive
          }
        }
      }
    }
    
    return newGrid;
  }

  private countNeighbors(grid: number[][], x: number, y: number): number {
    let count = 0;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < this.config.width && ny >= 0 && ny < this.config.height) {
          count += grid[ny][nx];
        }
      }
    }
    
    return count;
  }

  public getStates(): AnimationFrame[] {
    return this.states;
  }

  public getConfig(): ConwayConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<ConwayConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}