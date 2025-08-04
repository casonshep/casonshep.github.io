// Conway's Game of Life Implementation
class GameOfLife {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 150;
        this.height = 100;
        this.cellSize = 8;
        this.grid = [];
        this.states = [];
        this.currentFrame = 0;
        this.isAnimating = false;
        
        this.initializeCanvas();
        this.createWelcomePattern();
    }
    
    initializeCanvas() {
        this.canvas.width = this.width * this.cellSize;
        this.canvas.height = this.height * this.cellSize;
        this.ctx.fillStyle = '#F5F5F5';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    createEmptyGrid() {
        return Array(this.height).fill().map(() => Array(this.width).fill(0));
    }
    
    copyGrid(grid) {
        return grid.map(row => [...row]);
    }
    
    createWelcomePattern() {
        const grid = this.createEmptyGrid();
        const message = "welcome to my website";
        
        // Split message into words
        const words = message.split(' ');
        const maxLineLength = 15; // Maximum characters per line
        const lineHeight = 10; // Pixels between lines
        
        // Function to split text into lines that fit within maxLineLength
        const splitIntoLines = (words, maxLength) => {
            const lines = [];
            let currentLine = [];
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
        const startY = Math.max(10, Math.floor((this.height - (lines.length * lineHeight)) / 2));
        
        lines.forEach((line, lineIndex) => {
            const lineWidth = line.length * 8; // 8 pixels per character (7 width + 1 space)
            let currentX = Math.max(0, Math.floor((this.width - lineWidth) / 2));
            
            // Place each character in the line
            for (let i = 0; i < line.length; i++) {
                const letter = line[i];
                const pattern = getLetterPattern(letter);
                
                // Place letter pattern on grid
                for (let y = 0; y < pattern.length; y++) {
                    for (let x = 0; x < pattern[y].length; x++) {
                        const gridY = startY + (lineIndex * lineHeight) + y;
                        const gridX = currentX + x;
                        
                        if (gridX < this.width && gridY < this.height) {
                            grid[gridY][gridX] = pattern[y][x];
                        }
                    }
                }
                
                currentX += 8; // Move to next character position (7px char + 1px space)
            }
        });
        
        this.generateStates(grid);
    }
    
    generateStates(finalGrid) {
        this.states = [];
        let currentGrid = this.copyGrid(finalGrid);
        
        // Store the final state first
        this.states.push(this.copyGrid(currentGrid));
        
        // Generate 50 iterations backwards by running forward simulation
        for (let i = 0; i < 50; i++) {
            currentGrid = this.getNextGeneration(currentGrid);
            this.states.push(this.copyGrid(currentGrid));
        }
        
        // Reverse the states so we play from chaotic to organized
        this.states.reverse();
    }
    
    getNextGeneration(grid) {
        const newGrid = this.createEmptyGrid();
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
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
    
    countNeighbors(grid, x, y) {
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    count += grid[ny][nx];
                }
            }
        }
        
        return count;
    }
    
    drawGrid(grid) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        this.ctx.fillStyle = '#F5F5F5';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw cells
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (grid[y][x] === 1) {
                    this.ctx.fillStyle = '#2C2C2C';
                    this.ctx.fillRect(
                        x * this.cellSize + 1,
                        y * this.cellSize + 1,
                        this.cellSize - 1,
                        this.cellSize - 1
                    );
                }
            }
        }
        
        // Draw grid lines
        this.ctx.strokeStyle = '#E0E0E0';
        this.ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= this.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }
    }
    
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.currentFrame = 0;
        
        const animate = () => {
            if (this.currentFrame < this.states.length) {
                this.drawGrid(this.states[this.currentFrame]);
                this.currentFrame++;
                setTimeout(animate, 100); // 100ms per frame
            } else {
                this.isAnimating = false;
                // Keep showing the final state
                this.drawGrid(this.states[this.states.length - 1]);
            }
        };
        
        animate();
    }
}

// Navigation functionality
class Navigation {
    constructor() {
        this.navToggle = document.getElementById('nav-toggle');
        this.navMenu = document.getElementById('nav-menu');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('.section');
        
        this.initializeNavigation();
    }
    
    initializeNavigation() {
        // Mobile menu toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.navMenu.classList.toggle('active');
                this.navToggle.classList.toggle('active');
            });
        }
        
        // Navigation link clicks
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('data-section');
                console.log('Navigating to section:', targetSection); // Debug log
                this.showSection(targetSection);
                this.setActiveLink(link);
                
                // Close mobile menu if open
                if (this.navMenu) {
                    this.navMenu.classList.remove('active');
                }
                if (this.navToggle) {
                    this.navToggle.classList.remove('active');
                }
            });
        });
        
        // Handle form submission
        const contactForm = document.querySelector('.contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Thank you for your message! This is a demo form.');
            });
        }
    }
    
    showSection(sectionId) {
        console.log('Attempting to show section:', sectionId); // Debug log
        console.log('Available sections:', Array.from(this.sections).map(s => s.id)); // Debug log
        
        // Hide all sections
        this.sections.forEach(section => {
            section.classList.remove('active');
            console.log('Hiding section:', section.id); // Debug log
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            console.log('Showing section:', targetSection.id); // Debug log
        } else {
            console.error('Section not found:', sectionId); // Debug log
        }
    }
    
    setActiveLink(activeLink) {
        this.navLinks.forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...'); // Debug log
    
    // Initialize navigation
    const navigation = new Navigation();
    
    // Initialize Game of Life
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        const game = new GameOfLife(canvas);
        
        // Start animation after a short delay
        setTimeout(() => {
            game.startAnimation();
        }, 500);
        
        // Restart animation when home section is shown
        const homeLink = document.querySelector('[data-section="home"]');
        if (homeLink) {
            homeLink.addEventListener('click', () => {
                setTimeout(() => {
                    if (!game.isAnimating) {
                        game.startAnimation();
                    }
                }, 100);
            });
        }
    }
    
    // Handle window resize for canvas
    window.addEventListener('resize', () => {
        const canvas = document.getElementById('gameCanvas');
        if (canvas && window.innerWidth <= 768) {
            // Make canvas responsive on mobile
            const container = canvas.parentElement;
            const containerWidth = container.clientWidth - 40; // Account for padding
            const scale = Math.min(1, containerWidth / 800);
            canvas.style.transform = `scale(${scale})`;
            canvas.style.transformOrigin = 'top left';
        } else if (canvas) {
            canvas.style.transform = 'none';
        }
    });
    
    // Trigger resize event on load
    window.dispatchEvent(new Event('resize'));
    
    // Show home section by default
    setTimeout(() => {
        const homeSection = document.getElementById('home');
        if (homeSection) {
            homeSection.classList.add('active');
        }
    }, 100);
});

// Add some interactive elements
document.addEventListener('DOMContentLoaded', () => {
    // Add hover effects to project cards
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(-4px)';
        });
    });
    
    // Add click handlers for read more links
    const readMoreLinks = document.querySelectorAll('.read-more');
    readMoreLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            alert('This would navigate to the full blog post. This is a demo.');
        });
    });
    
    // Add smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';
});