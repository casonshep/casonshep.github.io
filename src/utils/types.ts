// Core types for the application
export type PageType = 'home' | 'about' | 'thoughts' | 'projects' | 'random' | 'contact';

// Conway's Game of Life types
export interface ConwayGrid {
  width: number;
  height: number;
  cells: number[][];
}

export interface ConwayConfig {
  width: number;
  height: number;
  cellSize: number;
  maxIterations: number;
  animationSpeed: number;
}

export interface ConwayState {
  grid: ConwayGrid;
  isAnimating: boolean;
  currentFrame: number;
  totalFrames: number;
}

// Font pattern types
export interface LetterPattern {
  [key: string]: number[][];
}

// Navigation types
export interface NavItem {
  id: PageType;
  label: string;
  href: string;
}

// Project types
export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  status: 'completed' | 'in-progress' | 'concept';
  links?: {
    github?: string;
    demo?: string;
    live?: string;
  };
}

// Blog post types
export interface BlogPost {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  readTime: string;
  slug: string;
}

// Contact form types
export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactMethod {
  type: 'email' | 'linkedin' | 'github';
  label: string;
  value: string;
  url?: string;
}

// Random interests types
export interface RandomItem {
  id: string;
  title: string;
  description: string;
  category: 'resources' | 'music' | 'games' | 'other';
}

// Component prop types
export interface ConwayCanvasProps {
  config: ConwayConfig;
  onAnimationComplete?: () => void;
  className?: string;
}

export interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}

export interface PageProps {
  onPageChange: (page: PageType) => void;
}

// Utility types
export interface WindowSize {
  width: number;
  height: number;
}

export interface AnimationFrame {
  grid: number[][];
  timestamp: number;
}