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

  const password = body.password || '';
  const action = body.action || '';
  const commentId = body.commentId || '';
  const replyText = (body.replyText || '').trim();
  const deviceToken = body.deviceToken || '';
  const deviceModel = body.deviceModel || '';

  const ADMIN_PASS = process.env.ADMIN_PASSWORD || '9272';
  const TRUSTED_TOKEN = process.env.MY_DEVICE_TOKEN || '';
  const isTrusted = !!(TRUSTED_TOKEN && deviceToken === TRUSTED_TOKEN);

  // helper: build device string
  const buildDeviceStr = (ua, model) => {
    let device = 'Desktop';
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) device = 'Mobile';
    else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';
    let browser = 'Other';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    return model ? `${device} • ${model}` : `${device} (${browser})`;
  };

  // helper: geo lookup
  const lookupLocation = async (ip) => {
    try {
      if (!ip || ip === 'Unknown') return 'Unknown';
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,countryCode`);
      const geoData = await geoRes.json();
      if (geoData.status === 'success') {
        return `${geoData.city}, ${geoData.regionName}, ${geoData.countryCode}`;
      }
    } catch (e) {}
    return 'Unknown';
  };

  // =========================================
  // SPECIAL ACTION: visitAlert (no password needed)
  // =========================================
  if (action === 'visitAlert') {
    if (isTrusted) {
      return res.status(200).json({ success: true, skipped: true });
    }

    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'Unknown';
        const ua = req.headers['user-agent'] || '';
        const location = await lookupLocation(ip);
        const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const text = `🚨 *Admin Panel Opened*\n\nSomeone (not you) opened the admin page!\n\n🌍 Location: ${location}\n💻 Device: ${buildDeviceStr(ua, deviceModel)}\n🌐 IP: \`${ip}\`\n🕐 Time: ${time}`;
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
        }).catch(() => {});
      }
    } catch (e) {}
    return res.status(200).json({ success: true });
  }

  // =========================================
  // WRONG PASSWORD ALERT (skip if trusted device)
  // =========================================
  if (password && password !== ADMIN_PASS && !isTrusted) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const ip2 = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'Unknown';
        const ua2 = req.headers['user-agent'] || '';
        const location2 = await lookupLocation(ip2);
        const time2 = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const safeTried = String(password).replace(/[*_`\[\]]/g, '').substring(0, 20);
        const text2 = `⚠️ *Wrong Admin Password Attempt*\n\n🌍 Location: ${location2}\n💻 Device: ${buildDeviceStr(ua2, deviceModel)}\n🌐 IP: \`${ip2}\`\n🔑 Tried: \`${safeTried}\`\n🕐 Time: ${time2}`;
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: text2, parse_mode: 'Markdown' })
        }).catch(() => {});
      }
    } catch (e) {}
  }

  if (password !== ADMIN_PASS) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const apiKey = process.env.JSONBIN_API_KEY || process.env.JSONBIN_KEY;
  const binId = process.env.JSONBIN_BIN_ID || process.env.JSONBIN_ID;
  if (!apiKey || !binId) return res.status(500).json({ error: 'Config missing' });

  const baseUrl = `https://api.jsonbin.io/v3/b/${binId}`;
  const headers = { 'X-Master-Key': apiKey, 'Content-Type': 'application/json' };

  try {
    const readRes = await fetch(`${baseUrl}/latest`, { headers });
    const readData = await readRes.json();
    let comments = [];
    if (readData.record && Array.isArray(readData.record)) comments = readData.record;
    else if (readData.record && readData.record.comments) comments = readData.record.comments;

    if (action === 'verify') {
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'delete') {
      const before = comments.length;
      comments = comments.filter(c => c.id !== commentId);
      if (comments.length === before) return res.status(404).json({ error: 'Not found' });

      const saveRes = await fetch(baseUrl, {
        method: 'PUT', headers, body: JSON.stringify(comments)
      });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'reply') {
      if (!replyText) return res.status(400).json({ error: 'Reply text required' });
      if (replyText.length > 400) return res.status(400).json({ error: 'Reply too long' });

      const idx = comments.findIndex(c => c.id === commentId);
      if (idx === -1) return res.status(404).json({ error: 'Comment not found' });

      comments[idx].reply = replyText;
      comments[idx].replyTimestamp = Date.now();

      const saveRes = await fetch(baseUrl, {
        method: 'PUT', headers, body: JSON.stringify(comments)
      });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'unreply') {
      const idx = comments.findIndex(c => c.id === commentId);
      if (idx === -1) return res.status(404).json({ error: 'Comment not found' });

      delete comments[idx].reply;
      delete comments[idx].replyTimestamp;

      const saveRes = await fetch(baseUrl, {
        method: 'PUT', headers, body: JSON.stringify(comments)
      });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'clear') {
      const saveRes = await fetch(baseUrl, {
        method: 'PUT', headers, body: JSON.stringify([])
      });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: [] });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};