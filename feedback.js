module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, message } = req.body || {};

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return res.status(500).json({ error: 'Server config missing' });
  }

  const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `📩 *New Feedback from Nexus*\n\n👤 *Name:* ${name || 'Anonymous'}\n\n💬 *Message:*\n${message}\n\n🕐 *Time:* ${dateStr}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
    const data = await response.json();
    if (!data.ok) return res.status(500).json({ error: 'Telegram failed' });
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};