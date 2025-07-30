import { Pool } from 'pg'

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export const db = pool

// Database schema initialization
export async function initializeDatabase() {
  try {
    // Create files table for tracking uploads
    await db.query(`
      CREATE TABLE IF NOT EXISTS files (
        id VARCHAR(12) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        blob_url TEXT NOT NULL,
        blob_pathname TEXT NOT NULL,
        size BIGINT NOT NULL,
        ip_address INET,
        user_agent TEXT,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '3 days',
        deleted_at TIMESTAMP WITH TIME ZONE,
        download_count INTEGER DEFAULT 0,
        downloaded_at TIMESTAMP WITH TIME ZONE
      )
    `)

    // Create index for faster lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at) 
      WHERE deleted_at IS NULL
    `)

    // Create IP bans table
    await db.query(`
      CREATE TABLE IF NOT EXISTS ip_bans (
        ip_address INET PRIMARY KEY,
        reason TEXT,
        banned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        created_by VARCHAR(100)
      )
    `)

    // Create index for IP bans lookup
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_ip_bans_lookup ON ip_bans(ip_address, expires_at)
    `)

    // Create admin login attempts table for rate limiting
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_login_attempts (
        id SERIAL PRIMARY KEY,
        ip_address INET NOT NULL,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        success BOOLEAN DEFAULT FALSE,
        user_agent TEXT
      )
    `)

    // Create index for login attempts rate limiting
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_attempts_ip_time ON admin_login_attempts(ip_address, attempted_at)
    `)

    console.log('Database schema initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

// Helper functions
export async function isIpBanned(ipAddress: string): Promise<boolean> {
  try {
    const result = await db.query(
      `SELECT 1 FROM ip_bans 
       WHERE ip_address = $1 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [ipAddress]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Error checking IP ban:', error)
    return false
  }
}

export async function getFileById(id: string) {
  try {
    console.log('Looking up file by ID:', id)
    
    const result = await db.query(
      `SELECT * FROM files 
       WHERE id = $1 
       AND deleted_at IS NULL 
       AND expires_at > NOW()`,
      [id]
    )
    
    console.log('File lookup result:', { 
      found: result.rows.length > 0, 
      rowCount: result.rows.length,
      file: result.rows[0] || null 
    })
    
    return result.rows[0] || null
  } catch (error) {
    console.error('Error getting file by ID:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return null
  }
}

export async function markFileAsDownloaded(id: string) {
  try {
    await db.query(
      `UPDATE files 
       SET downloaded_at = NOW(), download_count = download_count + 1, deleted_at = NOW()
       WHERE id = $1 AND downloaded_at IS NULL`,
      [id]
    )
  } catch (error) {
    console.error('Error marking file as downloaded:', error)
    throw error
  }
}

export async function createFileRecord(data: {
  id: string
  filename: string
  blobUrl: string
  blobPathname: string
  size: number
  ipAddress?: string
  userAgent?: string
}) {
  try {
    console.log('Creating file record:', { id: data.id, filename: data.filename, size: data.size })
    
    const result = await db.query(
      `INSERT INTO files (id, filename, blob_url, blob_pathname, size, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '3 days')
       RETURNING *`,
      [
        data.id,
        data.filename,
        data.blobUrl,
        data.blobPathname,
        data.size,
        data.ipAddress,
        data.userAgent,
      ]
    )
    
    console.log('File record created successfully:', result.rows[0])
    return result.rows[0]
  } catch (error) {
    console.error('Error creating file record:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}



export async function getAllFiles() {
  try {
    const result = await db.query(
      `SELECT id, filename, size, uploaded_at, download_count, downloaded_at, ip_address, user_agent
       FROM files 
       WHERE deleted_at IS NULL 
       AND expires_at > NOW()
       ORDER BY uploaded_at DESC`
    )
    return result.rows
  } catch (error) {
    console.error('Error getting all files:', error)
    return []
  }
}

export async function updateFileRecord(id: string, data: {
  blobUrl?: string
  blobPathname?: string
  size?: number
}) {
  try {
    console.log('updateFileRecord: Updating file with ID:', id);
    console.log('updateFileRecord: Data to update:', data);
    
    const updates = []
    const values = []
    let paramCount = 1

    if (data.blobUrl !== undefined) {
      updates.push(`blob_url = $${paramCount}`)
      values.push(data.blobUrl)
      paramCount++
    }

    if (data.blobPathname !== undefined) {
      updates.push(`blob_pathname = $${paramCount}`)
      values.push(data.blobPathname)
      paramCount++
    }

    if (data.size !== undefined) {
      updates.push(`size = $${paramCount}`)
      values.push(data.size)
      paramCount++
    }

    if (updates.length === 0) {
      console.log('updateFileRecord: No updates to make');
      return // No updates to make
    }

    values.push(id)
    const query = `UPDATE files SET ${updates.join(', ')} WHERE id = $${paramCount}`;
    console.log('updateFileRecord: Executing query:', query);
    console.log('updateFileRecord: Values:', values);
    
    const result = await db.query(query, values);
    console.log('updateFileRecord: Update successful, rows affected:', result.rowCount);
  } catch (error) {
    console.error('Error updating file record:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function deleteFileRecord(id: string) {
  try {
    await db.query(
      `UPDATE files SET deleted_at = NOW() WHERE id = $1`,
      [id]
    )
  } catch (error) {
    console.error('Error deleting file record:', error)
    throw error
  }
}

export async function cleanupExpiredFiles() {
  try {
    // Get expired files
    const expiredResult = await db.query(
      `SELECT id, blob_pathname FROM files 
       WHERE expires_at < NOW() 
       AND deleted_at IS NULL`
    )

    // Mark as deleted in database
    if (expiredResult.rows.length > 0) {
      await db.query(
        `UPDATE files SET deleted_at = NOW() 
         WHERE expires_at < NOW() 
         AND deleted_at IS NULL`
      )
      
      console.log(`Marked ${expiredResult.rows.length} expired files as deleted`)
    }

    return expiredResult.rows
  } catch (error) {
    console.error('Error cleaning up expired files:', error)
    throw error
  }
}

// Admin-related functions
export async function recordLoginAttempt(ipAddress: string, success: boolean, userAgent?: string) {
  try {
    await db.query(
      `INSERT INTO admin_login_attempts (ip_address, success, user_agent)
       VALUES ($1, $2, $3)`,
      [ipAddress, success, userAgent]
    )
  } catch (error) {
    console.error('Error recording login attempt:', error)
  }
}

export async function getRecentFailedAttempts(ipAddress: string, windowMinutes: number = 15): Promise<number> {
  try {
    const result = await db.query(
      `SELECT COUNT(*) as count FROM admin_login_attempts 
       WHERE ip_address = $1 
       AND success = FALSE 
       AND attempted_at > NOW() - INTERVAL '${windowMinutes} minutes'`,
      [ipAddress]
    )
    return parseInt(result.rows[0].count)
  } catch (error) {
    console.error('Error getting recent failed attempts:', error)
    return 0
  }
}

export async function shouldBanIP(ipAddress: string): Promise<boolean> {
  const failedAttempts = await getRecentFailedAttempts(ipAddress, 15)
  return failedAttempts >= 5 // Ban after 5 failed attempts in 15 minutes
}

export async function banIP(ipAddress: string, reason: string, durationHours: number = 24) {
  try {
    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000)
    await db.query(
      `INSERT INTO ip_bans (ip_address, reason, expires_at, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (ip_address) DO UPDATE SET
       reason = $2, expires_at = $3, banned_at = NOW()`,
      [ipAddress, reason, expiresAt, 'admin-protection']
    )
  } catch (error) {
    console.error('Error banning IP:', error)
    throw error
  }
} 