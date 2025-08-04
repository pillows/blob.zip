'use client';

export default function LegalPage() {
  return (
    <div className="legal-container">
      <div className="legal-content">
        <h1>📋 Legal Information</h1>
        <p className="legal-intro">
          Welcome to BlobZip's legal information center. Here you'll find all the important legal documents that govern your use of our file hosting service.
        </p>
        
        <div className="legal-links">
          <div className="legal-card">
            <h2>📄 Terms of Service</h2>
            <p>Our terms and conditions for using BlobZip's file hosting service.</p>
            <a href="/legal/terms" className="legal-link">Read Terms of Service →</a>
          </div>
          
          <div className="legal-card">
            <h2>🔒 Privacy Policy</h2>
            <p>How we collect, use, and protect your personal information.</p>
            <a href="/legal/privacy" className="legal-link">Read Privacy Policy →</a>
          </div>
          
          <div className="legal-card">
            <h2>🚫 Acceptable Use Policy</h2>
            <p>Guidelines for acceptable use of our file hosting service.</p>
            <a href="/legal/aup" className="legal-link">Read AUP →</a>
          </div>
        </div>
        
        <div className="legal-contact">
          <h3>📧 Contact Us</h3>
          <p>
            If you have any questions about these legal documents or need to report a violation, 
            please contact us through our support channels.
          </p>
        </div>
      </div>
      
      <style jsx>{`
        .legal-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        
        .legal-content h1 {
          color: white;
          text-align: center;
          margin-bottom: 1rem;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .legal-intro {
          text-align: center;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 3rem;
          font-size: 1.1rem;
        }
        
        .legal-links {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-bottom: 3rem;
        }
        
        .legal-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          transition: transform 0.3s, box-shadow 0.3s;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .legal-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.2);
          background: rgba(255, 255, 255, 0.2);
        }
        
        .legal-card h2 {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.3rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .legal-card p {
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        
        .legal-link {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 0.75rem 1.5rem;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 500;
          transition: all 0.3s ease;
          border: 1px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(8px);
        }
        
        .legal-link:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }
        
        .legal-contact {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .legal-contact h3 {
          color: white;
          margin-bottom: 1rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .legal-contact p {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
        }
        
        @media (max-width: 768px) {
          .legal-container {
            padding: 1rem;
          }
          
          .legal-links {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
} 