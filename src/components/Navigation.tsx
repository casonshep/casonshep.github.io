import { useEffect } from 'react';
import type { NavigationProps } from '../utils/types';

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onPageChange,
  isMenuOpen,
  onMenuToggle
}) => {
  const navItems = [
    { id: 'home' as const, label: 'Home', href: '#home' },
    { id: 'about' as const, label: 'About Me', href: '#about' },
    { id: 'blog' as const, label: 'Blog', href: '#blog' },
    { id: 'projects' as const, label: 'Projects', href: '#projects' },
    { id: 'random' as const, label: 'Random Stuff', href: '#random' },
    { id: 'contact' as const, label: 'Contact Me', href: '#contact' }
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('.nav-container')) {
        onMenuToggle();
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen, onMenuToggle]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  return (
    <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50">
      <nav className="nav-container max-w-5xl mx-auto px-5 flex justify-between items-center h-15">
        <div className="text-lg font-bold text-slate-900 uppercase tracking-widest">
          Cason Shepard
        </div>

        {/* Desktop Menu */}
        <ul className="hidden md:flex list-none gap-0">
          {navItems.map((item) => (
            <li key={item.id} className="relative">
              <button
                onClick={() => onPageChange(item.id)}
                className={`block px-6 py-5 text-slate-500 no-underline uppercase tracking-wider text-xs font-normal transition-all duration-300 ease-standard border-b-3 border-transparent hover:text-slate-900 hover:border-slate-900 ${
                  currentPage === item.id ? 'text-slate-900 border-slate-900' : ''
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Mobile Menu Toggle */}
        <button
          className={`md:hidden flex flex-col cursor-pointer ${isMenuOpen ? 'active' : ''}`}
          onClick={onMenuToggle}
          aria-label="Toggle mobile menu"
        >
          <span className={`w-6 h-0.5 bg-slate-900 my-0.5 transition-all duration-300 ${
            isMenuOpen ? 'transform translate-y-2 rotate-45' : ''
          }`} />
          <span className={`w-6 h-0.5 bg-slate-900 my-0.5 transition-all duration-300 ${
            isMenuOpen ? 'opacity-0' : ''
          }`} />
          <span className={`w-6 h-0.5 bg-slate-900 my-0.5 transition-all duration-300 ${
            isMenuOpen ? 'transform -translate-y-2 -rotate-45' : ''
          }`} />
        </button>

        {/* Mobile Menu */}
        <ul className={`fixed left-0 top-15 md:hidden flex-col bg-white w-full text-center transition-all duration-300 shadow-lg border-t border-gray-200 z-40 ${
          isMenuOpen ? 'flex' : 'hidden'
        }`}>
          {navItems.map((item) => (
            <li key={item.id} className="m-0">
              <button
                onClick={() => onPageChange(item.id)}
                className={`block w-full px-4 py-4 text-slate-500 border-b border-gray-200 uppercase tracking-wider text-xs transition-colors hover:text-slate-900 hover:bg-gray-50 ${
                  currentPage === item.id ? 'text-slate-900 bg-gray-50' : ''
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};