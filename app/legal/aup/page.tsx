'use client';

export default function AcceptableUsePolicyPage() {
  return (
    <div className="legal-container">
      <div className="legal-content">
        <h1>🚫 Acceptable Use Policy</h1>
        <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>
        
        <section>
          <h2>1. Introduction</h2>
          <p>
            This Acceptable Use Policy ("AUP") outlines the rules and guidelines for using BlobZip's file hosting service. 
            By using our service, you agree to comply with this policy. Violation of this policy may result in immediate 
            termination of access and potential legal action.
          </p>
        </section>

        <section>
          <h2>2. Prohibited Content</h2>
          <p>The following types of content are strictly prohibited:</p>
          
          <h3>2.1 Illegal Content</h3>
          <ul>
            <li>Content that violates any applicable laws or regulations</li>
            <li>Copyrighted material without proper authorization</li>
            <li>Trade secrets or confidential information</li>
            <li>Content that promotes illegal activities</li>
          </ul>
          
          <h3>2.2 Harmful Content</h3>
          <ul>
            <li>Malware, viruses, or other malicious software</li>
            <li>Content designed to harm or exploit systems</li>
            <li>Phishing materials or fraudulent content</li>
            <li>Content that could cause damage to users or systems</li>
          </ul>
          
          <h3>2.3 Inappropriate Content</h3>
          <ul>
            <li>Explicit adult content or pornography</li>
            <li>Violent or graphic content</li>
            <li>Hate speech or discriminatory content</li>
            <li>Content that promotes violence or harm</li>
          </ul>
        </section>

        <section>
          <h2>3. Prohibited Activities</h2>
          <ul>
            <li>Attempting to circumvent security measures</li>
            <li>Using the service for spam or mass distribution</li>
            <li>Attempting to overload or disrupt the service</li>
            <li>Sharing files with malicious intent</li>
            <li>Using the service for commercial purposes without permission</li>
            <li>Attempting to access files without authorization</li>
            <li>Reverse engineering or attempting to exploit the service</li>
          </ul>
        </section>

        <section>
          <h2>4. File Size and Usage Limits</h2>
          <ul>
            <li>Maximum file size: 50MB per file</li>
            <li>Files are automatically deleted after 3 days</li>
            <li>Files are deleted immediately after first download</li>
            <li>Reasonable usage limits apply to prevent abuse</li>
            <li>We reserve the right to limit upload frequency</li>
          </ul>
        </section>

        <section>
          <h2>5. Security and Privacy</h2>
          <ul>
            <li>Do not upload files containing personal information without consent</li>
            <li>Do not share files containing sensitive data</li>
            <li>Be aware that file links can be shared and accessed by anyone</li>
            <li>We do not guarantee file security or privacy</li>
            <li>Use the service at your own risk</li>
          </ul>
        </section>

        <section>
          <h2>6. Reporting Violations</h2>
          <p>
            If you encounter content that violates this policy, please report it immediately. 
            Include the file URL and a description of the violation. We will investigate all reports 
            and take appropriate action.
          </p>
        </section>

        <section>
          <h2>7. Enforcement</h2>
          <ul>
            <li>We reserve the right to remove any content that violates this policy</li>
            <li>Violations may result in immediate account termination</li>
            <li>We may report violations to appropriate authorities</li>
            <li>We may implement additional restrictions for repeat offenders</li>
            <li>No refunds will be provided for policy violations</li>
          </ul>
        </section>

        <section>
          <h2>8. Monitoring and Investigation</h2>
          <ul>
            <li>We may monitor service usage for policy compliance</li>
            <li>We may investigate suspected violations</li>
            <li>We may access file metadata for investigation purposes</li>
            <li>We cooperate with law enforcement when required</li>
            <li>We maintain logs for security and compliance purposes</li>
          </ul>
        </section>

        <section>
          <h2>9. Consequences of Violations</h2>
          <ul>
            <li>Immediate removal of violating content</li>
            <li>Temporary or permanent suspension of access</li>
            <li>IP address blocking</li>
            <li>Legal action if necessary</li>
            <li>Reporting to relevant authorities</li>
          </ul>
        </section>

        <section>
          <h2>10. Changes to Policy</h2>
          <p>
            We may update this Acceptable Use Policy at any time. Changes will be effective immediately upon posting. 
            Continued use of the service constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2>11. Contact Information</h2>
          <p>
            For questions about this policy or to report violations, please contact us through our support channels. 
            We take all reports seriously and will respond promptly.
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