module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!global._fbRate) global._fbRate = new Map();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'Unknown';
  const now = Date.now();
  const WINDOW = 10 * 60 * 1000;
  const MAX = 5;
  const rec = global._fbRate.get(ip);
  if (!rec || now - rec.start > WINDOW) {
    global._fbRate.set(ip, { start: now, count: 1 });
  } else {
    if (rec.count >= MAX) {
      return res.status(429).json({ error: 'Too many feedbacks. Please try again later.' });
    }
    rec.count++;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  let name = (body && body.name) || '';
  const message = (body && body.message) || '';

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (typeof message !== 'string' || message.length > 1500) {
    return res.status(413).json({ error: 'Message too long (max 1500 chars)' });
  }
  if (name && (typeof name !== 'string' || name.length > 50)) {
    return res.status(413).json({ error: 'Name too long (max 50 chars)' });
  }

  const safeName = (name || 'Anonymous').replace(/[*_`\[\]]/g, '').substring(0, 50);
  const safeMessage = message.replace(/[*_`\[\]]/g, '').substring(0, 1500);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return res.status(500).json({ error: 'Config missing' });
  }

  const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `📩 *New Feedback from Nexus*\n\n👤 *Name:* ${safeName}\n🌐 *IP:* \`${ip}\`\n\n💬 *Message:*\n${safeMessage}\n\n🕐 *Time:* ${dateStr}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
    const data = await response.json();
    if (!data.ok) return res.status(500).json({ error: 'Telegram failed', details: data.description });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error', details: error.message });
  }
};