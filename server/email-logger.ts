import sgMail from '@sendgrid/mail';
import { networkInterfaces } from 'os';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface ClientInfo {
  ip: string;
  userAgent: string;
  timestamp: string;
  method: string;
  url: string;
}

function getMacAddresses(): string[] {
  const interfaces = networkInterfaces();
  const macAddresses: string[] = [];
  
  for (const interfaceName of Object.keys(interfaces)) {
    const networkInterface = interfaces[interfaceName];
    if (networkInterface) {
      for (const info of networkInterface) {
        if (info.mac && info.mac !== '00:00:00:00:00:00') {
          macAddresses.push(info.mac);
        }
      }
    }
  }
  
  return Array.from(new Set(macAddresses)); // Remove duplicates
}

function getLocationData(ip: string): string {
  // Basic location info based on IP (simplified for demo)
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'Local Network (Private IP)';
  }
  if (ip === '::1' || ip === '127.0.0.1') {
    return 'Localhost';
  }
  return `External IP: ${ip}`;
}

export async function sendAccessLog(
  eventType: string,
  username: string,
  clientInfo: ClientInfo,
  success: boolean,
  details: string
): Promise<void> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.log('SendGrid API key not configured, skipping email notification');
      return;
    }

    const macAddresses = getMacAddresses();
    const location = getLocationData(clientInfo.ip);
    
    const emailContent = `
SuperAI Platform - Access Log Alert

Event Type: ${eventType.toUpperCase()}
Status: ${success ? 'SUCCESS' : 'FAILURE'}
Username: ${username}
Timestamp: ${clientInfo.timestamp}

Connection Details:
- IP Address: ${clientInfo.ip}
- User Agent: ${clientInfo.userAgent}
- Location: ${location}
- Method: ${clientInfo.method}
- URL: ${clientInfo.url}

System Information:
- MAC Addresses: ${macAddresses.length > 0 ? macAddresses.join(', ') : 'Not available'}
- Server Time: ${new Date().toISOString()}

Details: ${details}

---
This is an automated security notification from SuperAI Platform.
If this activity was not authorized, please investigate immediately.
    `;

    const msg = {
      to: 'contact.beta.zbenyasystems@gmail.com',
      from: 'noreply@superai.platform', // This should be a verified sender in SendGrid
      subject: `SuperAI Access Log: ${eventType} - ${success ? 'Success' : 'Failed'} (${username})`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>')
    };

    await sgMail.send(msg);
    console.log(`Access log email sent for ${eventType} - ${username}`);
    
  } catch (error: any) {
    console.error('Failed to send access log email:', error.message);
    // Don't throw error to avoid breaking the main flow
  }
}