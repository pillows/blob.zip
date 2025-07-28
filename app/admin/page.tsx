'use client';

import React, { useState, useEffect } from 'react';

interface FileData {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
  downloadCount: number;
  ipAddress: string;
  userAgent: string;
  downloadedAt: string | null;
}

interface AdminStats {
  totalFiles: number;
  totalSize: number;
  todayUploads: number;
  expiringSoon: number;
}

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<FileData[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        setAuthenticated(true);
        setPassword('');
        loadAdminData();
      } else {
        setError(data.error || 'Authentication failed');
        if (data.remaining !== undefined) {
          setError(`${data.error}. ${data.remaining} attempts remaining.`);
        }
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const [filesRes, statsRes] = await Promise.all([
        fetch('/api/admin/files'),
        fetch('/api/admin/stats')
      ]);

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData.files || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    
    if (!confirm(`Delete ${selectedFiles.size} selected files?`)) return;

    try {
      const response = await fetch('/api/admin/files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: Array.from(selectedFiles) }),
      });

      const data = await response.json();
      if (data.success) {
        setSelectedFiles(new Set());
        loadAdminData();
        alert(`Successfully deleted ${data.deletedCount} files`);
      } else {
        alert(`Delete failed: ${data.error}`);
      }
    } catch (error) {
      alert('Delete failed: Network error');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Run cleanup to remove expired files?')) return;

    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        loadAdminData();
        alert(`Cleanup completed: ${data.deletedCount} expired files removed`);
      } else {
        alert(`Cleanup failed: ${data.error}`);
      }
    } catch (error) {
      alert('Cleanup failed: Network error');
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (!authenticated) {
    return (
      <div className="admin-login">
        <div className="login-container">
          <h1>🔐 Admin Panel</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="password">Administrator Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Enter admin password"
                autoComplete="current-password"
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" disabled={loading || !password}>
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
          <div className="security-notice">
            <small>⚠️ Multiple failed attempts will result in IP ban</small>
          </div>
        </div>

        <style jsx>{`
          .admin-login {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .login-container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 400px;
          }
          h1 {
            text-align: center;
            margin-bottom: 2rem;
            color: #333;
            font-size: 1.8rem;
          }
          .form-group {
            margin-bottom: 1.5rem;
          }
          label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #555;
          }
          input {
            width: 100%;
            padding: 1rem;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s ease;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
          }
          input:disabled {
            background: #f8f9fa;
            cursor: not-allowed;
          }
          button {
            width: 100%;
            padding: 1rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
          }
          button:hover:not(:disabled) {
            background: #5a6fd8;
          }
          button:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
          .error-message {
            background: #fee;
            color: #c53030;
            padding: 0.75rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            border: 1px solid #feb2b2;
          }
          .security-notice {
            text-align: center;
            margin-top: 1rem;
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1>🛠️ BlobZip Admin Panel</h1>
        <div className="header-actions">
          <a href="/home" className="home-btn">← Home</a>
          <button onClick={() => setAuthenticated(false)} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Files</h3>
            <div className="stat-value">{stats.totalFiles}</div>
          </div>
          <div className="stat-card">
            <h3>Total Storage</h3>
            <div className="stat-value">{formatFileSize(stats.totalSize)}</div>
          </div>
          <div className="stat-card">
            <h3>Today's Uploads</h3>
            <div className="stat-value">{stats.todayUploads}</div>
          </div>
          <div className="stat-card">
            <h3>Expiring Soon</h3>
            <div className="stat-value">{stats.expiringSoon}</div>
          </div>
        </div>
      )}

      <div className="admin-actions">
        <button onClick={loadAdminData} className="action-btn refresh">
          🔄 Refresh
        </button>
        <button onClick={handleCleanup} className="action-btn cleanup">
          🧹 Cleanup Expired
        </button>
        <button 
          onClick={handleDeleteSelected} 
          className="action-btn delete"
          disabled={selectedFiles.size === 0}
        >
          🗑️ Delete Selected ({selectedFiles.size})
        </button>
      </div>

      <div className="files-section">
        <h2>File Management</h2>
        {files.length === 0 ? (
          <div className="no-files">No files found</div>
        ) : (
          <div className="files-table">
            <div className="table-header">
              <div className="col-select">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFiles(new Set(files.map(f => f.id)));
                    } else {
                      setSelectedFiles(new Set());
                    }
                  }}
                />
              </div>
              <div className="col-filename">Filename</div>
              <div className="col-size">Size</div>
              <div className="col-downloads">Status</div>
              <div className="col-uploaded">Uploaded</div>
              <div className="col-ip">IP Address</div>
            </div>
            {files.map((file) => (
              <div key={file.id} className="table-row">
                <div className="col-select">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                  />
                </div>
                <div className="col-filename">
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    {file.filename}
                  </a>
                  <div className="file-id">ID: {file.id}</div>
                </div>
                <div className="col-size">{formatFileSize(file.size)}</div>
                <div className="col-downloads">
                  {file.downloadedAt ? (
                    <span className="status-downloaded">Downloaded</span>
                  ) : (
                    <span className="status-available">Available</span>
                  )}
                </div>
                <div className="col-uploaded">{formatDate(file.uploadedAt)}</div>
                <div className="col-ip">{file.ipAddress}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-panel {
          min-height: 100vh;
          background: #f8f9fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .admin-header {
          background: white;
          padding: 1rem 2rem;
          border-bottom: 1px solid #e1e5e9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .home-btn {
          background: #6c757d;
          color: white;
          text-decoration: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          transition: background 0.2s ease;
        }

        .home-btn:hover {
          background: #5a6268;
        }
        .admin-header h1 {
          margin: 0;
          color: #333;
          font-size: 1.5rem;
        }
        .logout-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .logout-btn:hover {
          background: #c82333;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          padding: 2rem;
        }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 {
          margin: 0 0 0.5rem 0;
          color: #666;
          font-size: 0.9rem;
          text-transform: uppercase;
          font-weight: 600;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
        }
        .admin-actions {
          padding: 0 2rem;
          margin-bottom: 2rem;
          display: flex;
          gap: 1rem;
        }
        .action-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .action-btn.refresh {
          background: #28a745;
          color: white;
        }
        .action-btn.refresh:hover {
          background: #218838;
        }
        .action-btn.cleanup {
          background: #ffc107;
          color: #212529;
        }
        .action-btn.cleanup:hover {
          background: #e0a800;
        }
        .action-btn.delete {
          background: #dc3545;
          color: white;
        }
        .action-btn.delete:hover:not(:disabled) {
          background: #c82333;
        }
        .action-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .files-section {
          padding: 0 2rem 2rem;
        }
        .files-section h2 {
          color: #333;
          margin-bottom: 1rem;
        }
        .no-files {
          background: white;
          padding: 2rem;
          text-align: center;
          border-radius: 8px;
          color: #666;
        }
        .files-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .table-header {
          display: grid;
          grid-template-columns: 40px 1fr 100px 100px 150px 120px;
          gap: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          font-weight: 600;
          color: #555;
          border-bottom: 1px solid #e1e5e9;
        }
        .table-row {
          display: grid;
          grid-template-columns: 40px 1fr 100px 100px 150px 120px;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid #f0f0f0;
          align-items: center;
        }
        .table-row:hover {
          background: #f8f9fa;
        }
        .col-filename a {
          color: #007bff;
          text-decoration: none;
          font-weight: 500;
        }
        .col-filename a:hover {
          text-decoration: underline;
        }
        .file-id {
          font-size: 0.8rem;
          color: #666;
          margin-top: 0.25rem;
        }
        input[type="checkbox"] {
          transform: scale(1.2);
        }

        .status-downloaded {
          color: #dc3545;
          font-weight: 600;
          font-size: 0.85rem;
        }

        .status-available {
          color: #28a745;
          font-weight: 600;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
} 