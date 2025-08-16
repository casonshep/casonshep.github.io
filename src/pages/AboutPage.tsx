import type { PageProps } from '../utils/types';

export const AboutPage: React.FC<PageProps> = ({ onPageChange }) => {
  const skills = [
    'JavaScript / TypeScript',
    'Python / Java', 
    'React / Node.js',
    'Algorithm Design',
    'System Architecture',
    'Machine Learning',
    'Cellular Automata',
    'Data Structures'
  ];

  return (
    <section className="min-h-screen pt-16 pb-16">
      <div className="container mx-auto px-5">
        <h2 className="section-title">About Me</h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="text-base leading-relaxed text-slate-700 space-y-6">
            <p>
              I am a passionate software developer with a deep interest in computational systems, 
              algorithms, and creative technology. My work spans from complex backend systems to 
              interactive digital experiences.
            </p>
            
            <p>
              With expertise in modern programming languages and frameworks, I enjoy tackling 
              challenging problems and creating elegant solutions. My fascination with cellular 
              automata and mathematical systems often influences my approach to software design.
            </p>

            <p>
              As a recent graduate from the California Institute of Technology with a Bachelor's 
              of Science in Computer Science and a focus on Machine Learning, I bring both 
              theoretical knowledge and practical experience to every project.
            </p>
          </div>

          <div className="mt-12">
            <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-wider">
              Technical Skills
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {skills.map((skill, index) => (
                <div key={index} className="py-2 border-b border-gray-200 text-slate-600">
                  {skill}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">
                Education
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900">California Institute of Technology</h4>
                  <p className="text-sm text-slate-600">Bachelor of Science in Computer Science</p>
                  <p className="text-sm text-slate-600">Focus: Machine Learning</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">
                Interests
              </h3>
              <ul className="space-y-2 text-slate-600">
                <li>• Cellular Automata & Conway's Game of Life</li>
                <li>• Algorithm Visualization</li>
                <li>• Creative Coding</li>
                <li>• Mathematical Systems</li>
                <li>• Interactive Digital Art</li>
                <li>• Computational Biology</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-base text-slate-600 mb-6">
              Ready to collaborate on your next project?
            </p>
            <button
              onClick={() => onPageChange('contact')}
              className="btn btn-primary"
            >
              Get In Touch
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};