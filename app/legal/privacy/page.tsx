'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-container">
      <div className="legal-content">
        <h1>🔒 Privacy Policy</h1>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. Information We Collect</h2>
          <h3>1.1 Information You Provide</h3>
          <ul>
            <li>Files you upload to our service</li>
            <li>File names and metadata</li>
          </ul>
          
          <h3>1.2 Information We Automatically Collect</h3>
          <ul>
            <li>IP addresses for security and abuse prevention</li>
            <li>User agent strings from your browser</li>
            <li>Upload and download timestamps</li>
            <li>File access logs</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain our file hosting service</li>
            <li>To prevent abuse and ensure service security</li>
            <li>To comply with legal obligations</li>
            <li>To improve our service and user experience</li>
            <li>To respond to support requests and abuse reports</li>
          </ul>
        </section>

        <section>
          <h2>3. File Content and Privacy</h2>
          <ul>
            <li>We do not scan, read, or analyze the content of your files</li>
            <li>Files are stored securely but not encrypted by default</li>
            <li>File content is automatically deleted after 3 days or first download</li>
            <li>We cannot access your files after they are deleted</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Retention</h2>
          <ul>
            <li>Files are automatically deleted after 3 days or first download</li>
            <li>File metadata is retained for up to 30 days for security purposes</li>
            <li>IP addresses and access logs are retained for up to 90 days</li>
            <li>Data may be retained longer if required by law or for abuse investigation</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Sharing and Disclosure</h2>
          <p>We do not sell, trade, or otherwise transfer your personal information to third parties, except:</p>
          <ul>
            <li>When required by law or legal process</li>
            <li>To protect our rights, property, or safety</li>
            <li>To investigate potential violations of our terms</li>
            <li>With your explicit consent</li>
          </ul>
        </section>

        <section>
          <h2>6. Data Security</h2>
          <ul>
            <li>We implement appropriate security measures to protect your data</li>
            <li>Files are stored on secure cloud infrastructure</li>
            <li>Access to files is restricted and logged</li>
            <li>We regularly review and update our security practices</li>
          </ul>
        </section>

        <section>
          <h2>7. Cookies and Tracking</h2>
          <ul>
            <li>We use minimal cookies necessary for service functionality</li>
            <li>We do not use tracking cookies or analytics</li>
            <li>We do not track your browsing activity across other sites</li>
          </ul>
        </section>

        <section>
          <h2>8. Third-Party Services</h2>
          <ul>
            <li>We use Vercel for hosting and file storage</li>
            <li>We use PostgreSQL for database storage</li>
            <li>These services have their own privacy policies</li>
            <li>We do not control third-party data practices</li>
          </ul>
        </section>

        <section>
          <h2>9. Your Rights</h2>
          <ul>
            <li>You can request deletion of your data</li>
            <li>You can request information about data we hold about you</li>
            <li>You can report privacy concerns or violations</li>
            <li>You can opt out of certain data collection where possible</li>
          </ul>
        </section>

        <section>
          <h2>10. Children's Privacy</h2>
          <p>
            Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. 
            If you believe we have collected such information, please contact us immediately.
          </p>
        </section>

        <section>
          <h2>11. International Data Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries other than your own. 
            We ensure appropriate safeguards are in place for such transfers.
          </p>
        </section>

        <section>
          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of any material changes by posting the new policy 
            on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2>13. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please contact us through our support channels.
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
        
        section h3 {
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 0.5rem;
          font-size: 1.1rem;
          margin-top: 1.5rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
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