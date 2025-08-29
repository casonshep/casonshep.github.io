import { useEffect, useState } from 'react';
import { ConwayCanvas } from '../components/ConwayCanvas';
import type { PageProps, ConwayConfig } from '../utils/types';


export const HomePage: React.FC<PageProps> = ({ onPageChange }) => {
  const [conwayConfig, setConwayConfig] = useState<ConwayConfig>({
    width: 150,
    height: 100,
    cellSize: 8,
    maxIterations: 10,
    animationSpeed: 100
  });

  // const [animationStarted, setAnimationStarted] = useState(false);

  // Update Conway config based on screen size
  useEffect(() => {
    const updateConfig = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      let cellSize = 8;
      if (screenWidth <= 768) {
        cellSize = 6;
      } else if (screenWidth <= 480) {
        cellSize = 4;
      }

      const width = Math.min(150, Math.floor(screenWidth / cellSize) - 4);
      const height = Math.min(100, Math.floor(screenHeight / (cellSize * 2)));

      setConwayConfig({
        width,
        height,
        cellSize,
        maxIterations: conwayConfig.maxIterations,
        animationSpeed: conwayConfig.animationSpeed
      });
    };

    updateConfig();
    window.addEventListener('resize', updateConfig);
    
    return () => window.removeEventListener('resize', updateConfig);
  }, []);

  // Auto-start animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      // setAnimationStarted(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = () => {
    // Animation completed - user can now interact with the site
  };

  return (
    <section className="my-sections">
      <div className="container mx-auto px-5">
        <div className="text-center py-10">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5 uppercase tracking-widest">
            Personal Portfolio
          </h1>
          <p className="text-lg text-slate-500 mb-15 uppercase tracking-widest">
            Creative and & Software Developer
          </p>

          {/* Profile Section */}
          <div className="flex items-center text-left gap-8 my-8 mx-0 p-8 bg-cream-100 rounded-lg shadow-md max-w-4xl mx-auto">
            <div className="profile-image-container">
              <img 
                src='/imgs/cason1.jpg'
                className="profile-image"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-teal-600 mb-4 text-3xl font-bold">
                Hi, I'm Cason
              </h2>
              <p className="text-slate-900 text-lg leading-relaxed m-0">
              I am a recent graduate from California Institute of Technology with a Bachelor's of Science in Computer Science and a focus on Machine Learning.
              </p>
              <p className="text-slate-600 text-base mt-3 italic">
                California Institute of Technology - B.S. Computer Science
              </p>
            </div>
          </div>

          {/* Conway's Game of Life */}
          <div className="mt-10">
            <ConwayCanvas
              config={conwayConfig}
              onAnimationComplete={handleAnimationComplete}
              className="mx-auto"
            />
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <p className="text-base text-slate-600 mb-6">
              Explore my work and learn more about my interests.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => onPageChange('about')}
                className="btn btn-primary"
              >
                About Me
              </button>
              <button
                onClick={() => onPageChange('projects')}
                className="btn btn-primary"
              >
                View Projects
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};