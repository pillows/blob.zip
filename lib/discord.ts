const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1399645623506174054/L-AHuM3DQ6U57sPgXVOaawE-xreHcEp6gW7v6KzIXhiDfAE671IgTPnRrF5BTG4MpeT0';

interface DiscordMessage {
  content?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    timestamp?: string;
    footer?: {
      text: string;
    };
  }>;
}

export async function sendDiscordNotification(message: DiscordMessage): Promise<void> {
  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}

export async function notifyFileUpload(fileData: {
  id: string;
  filename: string;
  size: number;
  url: string;
  expiresAt?: string;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  const sizeInMB = (fileData.size / (1024 * 1024)).toFixed(2);
  const expiresAt = fileData.expiresAt ? new Date(fileData.expiresAt).toISOString() : 'Unknown';
  
  await sendDiscordNotification({
    content: '<@78331908810874880> 📤 New file uploaded!',
    embeds: [{
      title: '📤 File Uploaded',
      description: `A new file has been uploaded to BlobZip`,
      color: 0x00ff00, // Green
      fields: [
        {
          name: '📁 Filename',
          value: fileData.filename,
          inline: true
        },
        {
          name: '🆔 File ID',
          value: fileData.id,
          inline: true
        },
        {
          name: '📏 Size',
          value: `${sizeInMB} MB`,
          inline: true
        },
        {
          name: '🔗 URL',
          value: fileData.url,
          inline: false
        },
        {
          name: '⏰ Expires At',
          value: expiresAt,
          inline: true
        },
        {
          name: '🌐 IP Address',
          value: fileData.ipAddress,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'BlobZip File Upload'
      }
    }]
  });
}

export async function notifyFileDownload(fileData: {
  id: string;
  filename: string;
  size: number;
  url: string;
  ipAddress: string;
  userAgent: string;
  downloadCount: number;
}): Promise<void> {
  const sizeInMB = (fileData.size / (1024 * 1024)).toFixed(2);
  
  await sendDiscordNotification({
    content: '<@78331908810874880> 📥 File downloaded!',
    embeds: [{
      title: '📥 File Downloaded',
      description: `A file has been downloaded from BlobZip`,
      color: 0x0099ff, // Blue
      fields: [
        {
          name: '📁 Filename',
          value: fileData.filename,
          inline: true
        },
        {
          name: '🆔 File ID',
          value: fileData.id,
          inline: true
        },
        {
          name: '📏 Size',
          value: `${sizeInMB} MB`,
          inline: true
        },
        {
          name: '🔗 URL',
          value: fileData.url,
          inline: false
        },
        {
          name: '📊 Download Count',
          value: fileData.downloadCount.toString(),
          inline: true
        },
        {
          name: '🌐 IP Address',
          value: fileData.ipAddress,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'BlobZip File Download'
      }
    }]
  });
} 