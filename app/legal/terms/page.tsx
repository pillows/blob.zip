'use client';

export default function TermsOfServicePage() {
  return (
    <div className="legal-container">
      <div className="legal-content">
        <h1>📄 Terms of Service</h1>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using BlobZip ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by the above, please do not use this service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            BlobZip is a temporary file hosting service that allows users to upload files for sharing. Files are automatically deleted after 3 days 
            or immediately after being downloaded once, whichever comes first.
          </p>
        </section>

        <section>
          <h2>3. File Upload and Storage</h2>
          <ul>
            <li>Files are stored for a maximum of 3 days from the upload date</li>
            <li>Files are automatically deleted after the first download</li>
            <li>Maximum file size is 50MB per file</li>
            <li>You are responsible for the content of files you upload</li>
            <li>We do not scan or monitor file content</li>
          </ul>
        </section>

        <section>
          <h2>4. User Responsibilities</h2>
          <ul>
            <li>You must not upload illegal, harmful, or inappropriate content</li>
            <li>You must not violate any applicable laws or regulations</li>
            <li>You must not attempt to circumvent any security measures</li>
            <li>You are responsible for maintaining the confidentiality of your file links</li>
            <li>You must not use the service for spam or mass distribution</li>
          </ul>
        </section>

        <section>
          <h2>5. Service Availability</h2>
          <p>
            We strive to maintain high availability but do not guarantee uninterrupted service. 
            The service may be temporarily unavailable due to maintenance, updates, or technical issues.
          </p>
        </section>

        <section>
          <h2>6. Privacy and Data</h2>
          <ul>
            <li>We collect minimal data necessary to provide the service</li>
            <li>IP addresses are logged for security and abuse prevention</li>
            <li>File content is not scanned or analyzed</li>
            <li>Data is automatically deleted with files</li>
            <li>See our Privacy Policy for detailed information</li>
          </ul>
        </section>

        <section>
          <h2>7. Limitation of Liability</h2>
          <p>
            BlobZip is provided "as is" without warranties of any kind. We are not liable for any damages arising from the use of our service, 
            including but not limited to data loss, service interruption, or security breaches.
          </p>
        </section>

        <section>
          <h2>8. Termination</h2>
          <p>
            We reserve the right to terminate or suspend access to our service immediately, without prior notice, 
            for any conduct that we believe violates these Terms of Service or is harmful to other users or the service.
          </p>
        </section>

        <section>
          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. 
            Your continued use of the service constitutes acceptance of the modified terms.
          </p>
        </section>

        <section>
          <h2>10. Contact Information</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us through our support channels.
          </p>
        </section>

        <div className="legal-navigation">
          <a href="/legal" className="back-link">← Back to Legal</a>
        </div>
      </div>
      
      <style jsx>{`
        .legal-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        
        .legal-content h1 {
          color: white;
          text-align: center;
          margin-bottom: 0.5rem;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .last-updated {
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
          font-style: italic;
          margin-bottom: 3rem;
        }
        
        section {
          margin-bottom: 2.5rem;
        }
        
        section h2 {
          color: white;
          margin-bottom: 1rem;
          font-size: 1.4rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        section p {
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 1rem;
        }
        
        section ul {
          color: rgba(255, 255, 255, 0.9);
          margin-left: 1.5rem;
        }
        
        section li {
          margin-bottom: 0.5rem;
        }
        
        .legal-navigation {
          margin-top: 3rem;
          text-align: center;
        }
        
        .back-link {
          display: inline-block;
          color: white;
          text-decoration: none;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 10px;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(8px);
        }
        
        .back-link:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }
        
        @media (max-width: 768px) {
          .legal-container {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
} 