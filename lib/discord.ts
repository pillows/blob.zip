interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp: string;
  footer?: {
    text: string;
  };
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function maskIP(ip: string): string {
  // Mask the IP for privacy (e.g., 192.168.1.1 -> 192.168.*.*)
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  // For IPv6 or other formats, just show first part
  return ip.split(':')[0] + ':****';
}

export async function sendDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error sending Discord webhook:', error);
  }
}

export async function notifyFileUpload({
  webhookUrl,
  fileId,
  filename,
  size,
  ipAddress,
  userAgent,
  downloadUrl,
  expiresAt,
}: {
  webhookUrl: string;
  fileId: string;
  filename: string;
  size: number;
  ipAddress: string;
  userAgent?: string;
  downloadUrl: string;
  expiresAt: Date;
}): Promise<void> {
  if (!webhookUrl) return;

  const embed: DiscordEmbed = {
    title: '📤 File Uploaded',
    description: `A new file has been uploaded to BlobZip`,
    color: 0x00ff00, // Green
    fields: [
      {
        name: '📁 Filename',
        value: filename,
        inline: true,
      },
      {
        name: '📏 Size',
        value: formatFileSize(size),
        inline: true,
      },
      {
        name: '🆔 File ID',
        value: fileId,
        inline: true,
      },
      {
        name: '🔗 Download URL',
        value: downloadUrl,
        inline: false,
      },
      {
        name: '⏰ Expires',
        value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
        inline: true,
      },
      {
        name: '🌐 IP Address',
        value: maskIP(ipAddress),
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'BlobZip File Monitor',
    },
  };

  if (userAgent) {
    embed.fields.push({
      name: '🖥️ User Agent',
      value: userAgent.length > 100 ? userAgent.substring(0, 100) + '...' : userAgent,
      inline: false,
    });
  }

  await sendDiscordWebhook(webhookUrl, { embeds: [embed] });
}

export async function notifyFileDownload({
  webhookUrl,
  fileId,
  filename,
  size,
  ipAddress,
  userAgent,
  uploadedAt,
}: {
  webhookUrl: string;
  fileId: string;
  filename: string;
  size: number;
  ipAddress: string;
  userAgent?: string;
  uploadedAt: Date;
}): Promise<void> {
  if (!webhookUrl) return;

  const embed: DiscordEmbed = {
    title: '📥 File Downloaded',
    description: `A file has been downloaded from BlobZip`,
    color: 0x0099ff, // Blue
    fields: [
      {
        name: '📁 Filename',
        value: filename,
        inline: true,
      },
      {
        name: '📏 Size',
        value: formatFileSize(size),
        inline: true,
      },
      {
        name: '🆔 File ID',
        value: fileId,
        inline: true,
      },
      {
        name: '📅 Originally Uploaded',
        value: `<t:${Math.floor(uploadedAt.getTime() / 1000)}:R>`,
        inline: true,
      },
      {
        name: '🌐 IP Address',
        value: maskIP(ipAddress),
        inline: true,
      },
             {
         name: '⚠️ Status',
         value: 'File deleted from storage (one-time download)',
         inline: false,
       },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'BlobZip File Monitor',
    },
  };

  if (userAgent) {
    embed.fields.push({
      name: '🖥️ User Agent',
      value: userAgent.length > 100 ? userAgent.substring(0, 100) + '...' : userAgent,
      inline: false,
    });
  }

  await sendDiscordWebhook(webhookUrl, { embeds: [embed] });
} 