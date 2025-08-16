import type { PageProps, RandomItem } from '../utils/types';

const randomItems: RandomItem[] = [
  {
    id: '1',
    title: 'Links and Resources I enjoy',
    description: 'Links to some of my favorite resources and links I find interesting.',
    category: 'resources'
  },
  {
    id: '2', 
    title: 'My Favorite Music',
    description: 'Collection of some of my favorite songs and artists.',
    category: 'music'
  },
  {
    id: '3',
    title: 'Favorite Games',
    description: 'Collection of some of my favorite games.',
    category: 'games'
  }
];

const additionalInterests = [
  'Mathematical Visualizations',
  'Retro Computing',
  'Generative Art',
  'Puzzle Solving',
  'Chess Algorithms',
  'Digital Art Creation',
  'Music Theory',
  'Game Development',
  'Creative Writing',
  'Photography'
];

export const RandomPage: React.FC<PageProps> = ({ onPageChange }) => {
  const handleItemClick = (item: RandomItem) => {
    alert(`This would show ${item.title}. Coming soon!`);
  };

  return (
    <section className="min-h-screen pt-16 pb-16">
      <div className="container mx-auto px-5">
        <h2 className="section-title">Random Stuff</h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-base text-slate-600">
              A collection of things I find interesting, from useful resources 
              to entertainment and creative pursuits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
            {randomItems.map((item) => (
              <div 
                key={item.id} 
                className="text-center py-10 px-5 border-2 border-gray-200 rounded-base transition-all duration-300 cursor-pointer hover:border-gray-400 hover:shadow-md"
                onClick={() => handleItemClick(item)}
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">
                  {item.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div className="card">
              <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-wider">
                Other Interests
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {additionalInterests.map((interest, index) => (
                  <div key={index} className="py-2 border-b border-gray-200 text-sm text-slate-600">
                    {interest}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-wider">
                Fun Facts
              </h3>
              <div className="space-y-4 text-slate-600">
                <p>
                  • I'm fascinated by the emergence of complex patterns from simple rules, 
                  which is why Conway's Game of Life is featured throughout this site.
                </p>
                <p>
                  • I enjoy creating mathematical art and exploring algorithmic creativity 
                  in my spare time.
                </p>
                <p>
                  • This website itself is an example of cellular automata - the interface 
                  literally emerges from Conway's Game of Life!
                </p>
                <p>
                  • I believe that the most beautiful solutions often come from understanding 
                  the underlying mathematical principles.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <div className="card text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-wider">
                Conway's Game of Life Philosophy
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6 max-w-2xl mx-auto">
                Just like how this website emerges from simple cellular automata rules, 
                I believe that complex and beautiful systems can arise from elegant, 
                foundational principles. This philosophy guides both my technical work 
                and creative pursuits.
              </p>
              <button
                onClick={() => onPageChange('about')}
                className="btn btn-primary"
              >
                Learn More About Me
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};