const express = require('express');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(express.json());

// Initialize Google Auth with default credentials (Cloud Run provides this automatically)
const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.readonly'
  ]
});

const gmail = google.gmail({ version: 'v1', auth });

// Webhook endpoint to receive Pub/Sub push messages
app.post('/hooks/gmail-webhook', async (req, res) => {
  try {
    // Acknowledge the message immediately
    res.status(200).json({ success: true });

    // Parse the Pub/Sub message
    const message = req.body.message;
    if (!message) {
      console.error('No message in request');
      return;
    }

    // Decode the base64 payload
    const payload = Buffer.from(message.data, 'base64').toString('utf-8');
    const notification = JSON.parse(payload);

    console.log('📧 Gmail notification received:', notification);

    // Extract historyId from notification
    const historyId = notification.historyId;
    if (!historyId) {
      console.error('No historyId in notification');
      return;
    }

    // Call Gmail History API to fetch changes since last notification
    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded', 'labelAdded', 'labelRemoved']
    });

    console.log('📜 History changes:', history.data);

    // Process changes (fetch full messages, detect replies, etc.)
    if (history.data.history) {
      for (const record of history.data.history) {
        if (record.messagesAdded) {
          for (const msg of record.messagesAdded) {
            console.log('✉️ New message ID:', msg.message.id);
            // TODO: Fetch full message, detect threading, send to OpenClaw
          }
        }
        if (record.labelsAdded || record.labelsRemoved) {
          console.log('🏷️ Label change on message:', record.messages);
        }
      }
    }

  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to avoid Pub/Sub retries on processing errors
    res.status(200).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`📡 Gmail webhook listening on port ${PORT}`);
});
