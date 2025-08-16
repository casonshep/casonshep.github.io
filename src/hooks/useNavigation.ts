import { useState, useCallback } from 'react';
import type { PageType, NavItem } from '../utils/types';

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', href: '#home' },
  { id: 'about', label: 'About Me', href: '#about' },
  { id: 'blog', label: 'Blog', href: '#blog' },
  { id: 'projects', label: 'Projects', href: '#projects' },
  { id: 'random', label: 'Random Stuff', href: '#random' },
  { id: 'contact', label: 'Contact Me', href: '#contact' }
];

export const useNavigation = (initialPage: PageType = 'home') => {
  const [currentPage, setCurrentPage] = useState<PageType>(initialPage);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handlePageChange = useCallback((page: PageType) => {
    setCurrentPage(page);
    setIsMenuOpen(false); // Close mobile menu when navigating
  }, []);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return {
    currentPage,
    isMenuOpen,
    navItems,
    handlePageChange,
    toggleMenu,
    closeMenu
  };
};