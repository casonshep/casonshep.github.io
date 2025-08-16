import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { BlogPage } from './pages/BlogPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { RandomPage } from './pages/RandomPage';
import { ContactPage } from './pages/ContactPage';
import type { PageType } from './utils/types';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    setIsMenuOpen(false); // Close mobile menu when navigating
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onPageChange={handlePageChange} />;
      case 'about':
        return <AboutPage onPageChange={handlePageChange} />;
      case 'blog':
        return <BlogPage onPageChange={handlePageChange} />;
      case 'projects':
        return <ProjectsPage onPageChange={handlePageChange} />;
      case 'random':
        return <RandomPage onPageChange={handlePageChange} />;
      case 'contact':
        return <ContactPage onPageChange={handlePageChange} />;
      default:
        return <HomePage onPageChange={handlePageChange} />;
    }
  };

  return (
    <div className="min-h-screen font-mono bg-cream-50 text-slate-900">
      <Navigation
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isMenuOpen={isMenuOpen}
        onMenuToggle={handleMenuToggle}
      />
      
      <main className="relative">
        {renderCurrentPage()}
      </main>
      
      {/* Background overlay for mobile menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-30 md:hidden"
          onClick={handleMenuToggle}
        />
      )}
    </div>
  );
}

export default App;