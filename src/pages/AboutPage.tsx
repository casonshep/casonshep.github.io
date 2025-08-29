import React from 'react';
import { useState } from 'react';
import { useCollapse } from 'react-collapsed';
import type { PageProps, ContactForm, ContactMethod } from '../utils/types';


export const AboutPage: React.FC<PageProps> = ({ }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const skills: { [category: string]: string[] } = {
    "Programming Languages": ["Python", "TypeScript"],
    "Frameworks & Libraries": [
      "React",
      "Node.js",
      "NumPy",
      "Pandas",
      "Scikit-learn",
      "PyTorch",
      "Hugging Face Transformers",
      "Matplotlib"
    ],
    "Machine Learning & AI": ["BERT", "GPT-3.5", "LLaMA 2/3", "DeepSeek", "CLIP"],
    "Tools & DevOps": ["Git", "GitHub", "VS Code", "Jupyter Notebooks", "Colab", "Ollama", "Cursor", "LaTeX"],
    "Operating Systems / Command Line": ["Linux", "Bash"],
    "3D / Visualization (currently learning)": ["Blender"]
  };

  const contactMethods: ContactMethod[] = [
    {
      type: 'email',
      label: 'Email',
      value: 'cason dot shepard at alumni dot caltech dot edu',
      url: 'none'
    },
    {
      type: 'linkedin',
      label: 'LinkedIn',
      value: '/in/casonshep',
      url: 'https://linkedin.com/in/casonshep'
    },
    {
      type: 'github',
      label: 'GitHub',
      value: '/casonshep',
      url: 'https://github.com/casonshep'
    }
  ];

  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const SkillCategory: React.FC<{ category: string, skills: string[] }> = ({category, skills}) => {
    const isExpanded = expandedCategories.has(category);
    const { getCollapseProps, getToggleProps } = useCollapse({ isExpanded });

    return (
      <div className ="border border-gray-300 rounded-lg overflow-hidden">
        <button
          {...getToggleProps()}
          onClick={() => toggleCategory(category)}
          className='w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-left flex justified-between items-center transition-colors duration-200'
          >
            <span className={`transform transition-transform duration-2000 px-8 ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
            </span>
            <span className="font-semibold text-slate-900">{category}</span>
            
          </button>
          <div {...getCollapseProps()}>
          <div className="px-4 py-3 bg-white">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, you would send the form data to a server
    alert('This form doesn\'t actually work yet.');
    console.log('Form submitted:', formData);
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  const handleContactMethodClick = (method: ContactMethod) => {
    if (method.url) {
      if (method.type === 'email') {
        window.location.href = method.url;
      } else {
        window.open(method.url, '_blank');
      }
    }
  };
  

  return (
    <div>
    <section className="my-sections">
      <div className="container mx-auto px-16">
        <h2 className="section-title">About Me</h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="text-base leading-relaxed text-slate-700 space-y-6">
            <p>
             Hi, my name is Cason Shepard. I recently graduated from Caltech with a Bachelor's in Computer Science, focusing on machine learning and artificial intelligence. I am a creative software developer with a passion for connecting people and technology in unique ways. With expertise in modern programming languages and frameworks, I enjoy tackling challenging problems and learning by doing. I have interests in cellular automata, creative 3D modeling, software development for personal development, and education. I am currently building my skills in Blender and React/Typescript.
            </p>
          </div>

          <div className="subsection1">
            <h3 className="text-xl font-bold text-slate-900 mb-12 uppercase tracking-wider">
              Technical Skills
            </h3>
            {/* `grid grid-cols-1 md:grid-cols-2 gap-3` */}
            <div className="space-y-2"> 
              {Object.entries(skills).map(([category, skillist]) => (
                <SkillCategory key={category} category={category} skills={skillist} />
              ))}
            </div>
          </div>

          <div className="subsection1 grid md:grid-cols-1 gap-8">
            <div className="card">
              <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">
                Education
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-slate-900">California Institute of Technology</h4>
                  <p className="text-sm text-slate-600">Bachelor of Science in Computer Science</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">
                Interests
              </h3>
              <ul className="space-y-2 text-slate-600">
                <li>Cellular Automata & Emergent Behaviour</li>
                <li>Interactive Digital Art</li>
                <li>MCP and Tool Calling</li>
                <li>Embodied Agents for RL</li>

              </ul>
            </div>
          </div>

        </div>
      </div>
    
    <div className='subsection1'>
        
      <div className="max-w-4xl mx-auto">
            {/* Contact Information */}
            <div className='px-32'>
              <h3 className="text-2xl text-center font-bold text-slate-900 mb-5 uppercase tracking-widest">
                Get In Touch
              </h3>

              <div className="space-y-4 mb-8">
                {contactMethods.map((method, index) => (
                  <div key={index} className="text-sm text-slate-600">
                    <strong className="text-slate-900 uppercase tracking-wider">
                      {method.label}:
                    </strong>{' '}
                    <button
                      onClick={() => handleContactMethodClick(method)}
                      className="text-teal-600 hover:text-teal-700 transition-colors underline"
                    >
                      {method.value}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Form */}
            <div className='px-16'>
              <div className="card p-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-6 mt-6 uppercase tracking-widest text-center">
                  Send a Message
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="subject" className="form-label">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="message" className="form-label">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={6}
                      className="form-control resize-none"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full text-center">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
      </div>
    </div>
    </section>
    </div>
  );
};


