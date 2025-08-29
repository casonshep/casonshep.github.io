import type { PageProps, BlogPost } from '../utils/types';

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Blog Post 1',
    date: 'Month xx, year',
    excerpt: 'Coming soon...',
    readTime: '5 min read',
    slug: 'blog-post-1'
  },
  {
    id: '2',
    title: 'Blog Post 2',
    date: 'Month xx, year',
    excerpt: 'Coming soon...',
    readTime: '7 min read',
    slug: 'blog-post-2'
  },
  {
    id: '3',
    title: 'Blog Post 3',
    date: 'Month xx, year',
    excerpt: 'Coming soon...',
    readTime: '4 min read',
    slug: 'blog-post-3'
  }
];

export const BlogPage: React.FC<PageProps> = ({ }) => {
  const handleReadMore = (slug: string) => {
    // Placeholder for blog post navigation
    alert(`This would navigate to blog post: ${slug}. This is a demo.`);
  };

  return (
    <section className="my-sections">
      <div className="container mx-auto px-5">
        <h2 className="section-title">Thoughts</h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-base text-slate-600">
              Thoughts on anything I am reading about or interested in currently. First posts coming soon?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {blogPosts.map((post) => (
              <article key={post.id} className="card group">
                <h3 className="text-xl font-bold text-slate-900 mb-3 uppercase tracking-wider">
                  {post.title}
                </h3>
                <div className="flex items-center gap-3 mb-4 text-xs text-slate-500 uppercase tracking-wider">
                  <time>{post.date}</time>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  {post.excerpt}
                </p>
                <button
                  onClick={() => handleReadMore(post.slug)}
                  className="text-slate-900 no-underline font-bold uppercase tracking-wider text-xs border-b-2 border-slate-900 pb-1 transition-all duration-300 hover:text-black hover:border-black"
                >
                  Read More
                </button>
              </article>
            ))}
          </div>

          <div className="mt-16">
            <div className="card text-center">
              <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-wider">
                Coming Soon
              </h3>
              <div className="space-y-3 text-slate-600">
              <ul>
                <li>Some original and interesting thought but idk what that is yet.</li>

              </ul>
              </div>
              <div className="mt-8">
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};