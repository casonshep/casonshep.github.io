import type { PageProps, Project } from '../utils/types';

const projects: Project[] = [
  {
    id: '1',
    title: 'This Website',
    description: 'My first attempt at a personal website I will add to. Built with React, TypeScript, and Tailwind CSS, featuring Conway\'s Game of Life integration.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'JavaScript'],
    status: 'completed',
    links: {
      github: '#',
      live: '#'
    }
  },
  {
    id: '2',
    title: 'Conway\'s Game of Life Visualizer',
    description: 'Interactive visualization tool for exploring cellular automata patterns and rules. Features custom pattern creation and animation controls.',
    technologies: ['JavaScript', 'Canvas API', 'CSS'],
    status: 'in-progress'
  },
  {
    id: '3',
    title: 'Algorithm Visualization Suite',
    description: 'Educational tool for visualizing sorting algorithms, graph traversal, and data structures with step-by-step animations.',
    technologies: ['React', 'D3.js', 'TypeScript'],
    status: 'concept'
  },
  {
    id: '4',
    title: 'Machine Learning Pipeline',
    description: 'End-to-end ML pipeline for data preprocessing, model training, and deployment with automated monitoring.',
    technologies: ['Python', 'TensorFlow', 'Docker', 'FastAPI'],
    status: 'completed'
  },
  {
    id: '5',
    title: 'Distributed System Architecture',
    description: 'Scalable microservices architecture with load balancing, fault tolerance, and automated deployment.',
    technologies: ['Java', 'Spring Boot', 'Docker', 'Kubernetes'],
    status: 'completed'
  },
  {
    id: '6',
    title: 'Creative Coding Art Generator',
    description: 'Generative art tool using mathematical algorithms and cellular automata to create unique visual patterns.',
    technologies: ['JavaScript', 'WebGL', 'Canvas API'],
    status: 'in-progress'
  }
];

export const ProjectsPage: React.FC<PageProps> = ({ onPageChange }) => {
  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'concept':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const handleProjectLink = (url?: string) => {
    if (url && url !== '#') {
      window.open(url, '_blank');
    } else {
      alert('Project link coming soon!');
    }
  };

  return (
    <section className="min-h-screen pt-16 pb-16">
      <div className="container mx-auto px-5">
        <h2 className="section-title">Projects</h2>
        
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-base text-slate-600">
              A collection of my work spanning web applications, algorithms, 
              machine learning, and creative coding projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {projects.map((project) => (
              <div key={project.id} className="card group">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900 uppercase tracking-wider flex-1">
                    {project.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded ${getStatusColor(project.status)}`}>
                    {project.status.replace('-', ' ')}
                  </span>
                </div>
                
                <p className="text-slate-600 leading-relaxed mb-4">
                  {project.description}
                </p>
                
                <div className="mb-6">
                  <h4 className="font-bold text-xs mb-3 text-slate-900 uppercase tracking-wider">
                    Technologies:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech, techIndex) => (
                      <span 
                        key={techIndex}
                        className="tech-tag"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {project.links && (
                  <div className="flex gap-3 mt-auto">
                    {project.links.github && (
                      <button 
                        onClick={() => handleProjectLink(project.links?.github)}
                        className="text-slate-900 no-underline font-bold uppercase tracking-wider text-xs border-b-2 border-slate-900 pb-1 transition-all duration-300 hover:text-black hover:border-black"
                      >
                        GitHub →
                      </button>
                    )}
                    {project.links.demo && (
                      <button 
                        onClick={() => handleProjectLink(project.links?.demo)}
                        className="text-slate-900 no-underline font-bold uppercase tracking-wider text-xs border-b-2 border-slate-900 pb-1 transition-all duration-300 hover:text-black hover:border-black"
                      >
                        Demo →
                      </button>
                    )}
                    {project.links.live && (
                      <button 
                        onClick={() => handleProjectLink(project.links?.live)}
                        className="text-slate-900 no-underline font-bold uppercase tracking-wider text-xs border-b-2 border-slate-900 pb-1 transition-all duration-300 hover:text-black hover:border-black"
                      >
                        Live Site →
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <div className="card">
              <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-wider">
                More Projects Coming Soon
              </h3>
              <p className="text-slate-600 mb-6">
                I'm constantly working on new projects and experiments. 
                Check back regularly or get in touch to collaborate!
              </p>
              <button
                onClick={() => onPageChange('contact')}
                className="btn btn-primary"
              >
                Let's Work Together
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};