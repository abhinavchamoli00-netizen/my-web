module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const referrer = (body && body.referrer) || 'Direct';
  const page = (body && body.page) || 'index.html';
  const device = (body && body.device) || 'Unknown';
  const browser = (body && body.browser) || 'Other';
  const model = (body && body.model) || '';
  const platform = (body && body.platform) || '';

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'Unknown';

  let location = 'Unknown';
  try {
    if (ip !== 'Unknown') {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode,isp`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        location = `${geoData.city}, ${geoData.regionName}, ${geoData.countryCode}`;
      }
    }
  } catch (e) {}

  let deviceStr = device + ' (' + browser + ')';
  if (model) {
    deviceStr = device + ' • ' + model + (platform ? ' • ' + platform : '');
  } else if (platform) {
    deviceStr = device + ' (' + browser + ') • ' + platform;
  }

  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const text = `👀 *New Visitor on Nexus*\n\n🔗 From: ${referrer}\n🌍 Location: ${location}\n💻 Device: ${deviceStr}\n🌐 IP: \`${ip}\`\n📄 Page: ${page}\n🕐 Time: ${time}`;

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return res.status(500).json({ error: 'Config missing' });

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Telegram failed' });
  }
};