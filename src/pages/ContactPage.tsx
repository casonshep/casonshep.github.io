import { useState } from 'react';
import type { PageProps, ContactForm, ContactMethod } from '../utils/types';

const contactMethods: ContactMethod[] = [
  {
    type: 'email',
    label: 'Email',
    value: 'cason dot shepard at alumni dot caltech dot edu',
    url: 'mailto:cason.shepard@alumni.caltech.edu'
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

export const ContactPage: React.FC<PageProps> = ({ onPageChange }) => {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

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
    alert('Thank you for your message! This is a demo form.');
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
    <section className="min-h-screen pt-16 pb-16">
      <div className="container mx-auto px-5">
        <h2 className="section-title">Contact Me</h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-15">
            {/* Contact Information */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-5 uppercase tracking-widest">
                Get In Touch
              </h3>
              <p className="text-base leading-relaxed text-slate-600 mb-8">
                I'm always interested in discussing new opportunities, innovative projects, 
                and technical challenges.
              </p>

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

              <div className="card">
                <h4 className="text-lg font-bold text-slate-900 mb-4 uppercase tracking-wider">
                  What I'm Looking For
                </h4>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Software development opportunities</li>
                  <li>• Machine learning projects</li>
                  <li>• Creative technology collaborations</li>
                  <li>• Algorithm optimization challenges</li>
                  <li>• Educational content creation</li>
                  <li>• Open source contributions</li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="card p-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-6 uppercase tracking-widest">
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

          {/* Fun Footer Message */}
          <div className="mt-16 text-center">
            <div className="card">
              <p className="text-sm text-slate-600 mb-4">
                This contact form emerges from the same algorithmic principles that create the rest of the site!
              </p>
              <p className="text-xs text-slate-500">
                Like Conway's Game of Life, simple interactions can lead to complex and meaningful connections.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => onPageChange('home')}
                  className="text-teal-600 hover:text-teal-700 transition-colors text-sm font-bold uppercase tracking-wider"
                >
                  ← Back to Conway's Animation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};