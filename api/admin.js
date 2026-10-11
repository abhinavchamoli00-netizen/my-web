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

  const apiKey = process.env.JSONBIN_API_KEY || process.env.JSONBIN_KEY;
  const binId = process.env.JSONBIN_BIN_ID || process.env.JSONBIN_ID;
  const pollBinId = process.env.POLL_BIN_ID;

  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'Unknown';

  const MAX_ATTEMPTS = 4;
  const LOCK_DURATION_MS = 20 * 60 * 1000;

  async function readSettings() {
    const url = `https://api.jsonbin.io/v3/b/${pollBinId}/latest`;
    const r = await fetch(url, { headers: { 'X-Master-Key': apiKey } });
    const d = await r.json();
    return (d.record && typeof d.record === 'object') ? d.record : {};
  }
  async function writeSettings(data) {
    const url = `https://api.jsonbin.io/v3/b/${pollBinId}`;
    await fetch(url, {
      method: 'PUT',
      headers: { 'X-Master-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

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
  // VISIT ALERT (no password needed)
  // =========================================
  if (action === 'visitAlert') {
    if (isTrusted) return res.status(200).json({ success: true, skipped: true });
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const ip = clientIp;
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
  // CHECK LOCK STATUS (no password needed)
  // =========================================
  if (action === 'checkLock') {
    if (!pollBinId || !apiKey) {
      return res.status(200).json({ success: true, locked: false });
    }
    try {
      const settings = await readSettings();
      const lockMap = settings.adminLock || {};
      const entry = lockMap[clientIp];
      const now = Date.now();
      if (entry && entry.lockedUntil && now < entry.lockedUntil) {
        const msLeft = entry.lockedUntil - now;
        const minsLeft = Math.ceil(msLeft / 60000);
        return res.status(200).json({
          success: true,
          locked: true,
          lockedUntil: entry.lockedUntil,
          minutesLeft: minsLeft
        });
      }
    } catch (e) {}
    return res.status(200).json({ success: true, locked: false });
  }
  // =========================================
  // LOCKOUT CHECK (applies to EVERYONE)
  // =========================================
  let lockData = null;
  if (password && pollBinId && apiKey) {
    try {
      lockData = await readSettings();
      const lockMap = lockData.adminLock || {};
      const entry = lockMap[clientIp];
      const now = Date.now();

      let cleaned = false;
      const cutoff = now - 24 * 60 * 60 * 1000;
      for (const key in lockMap) {
        if (!lockMap[key] || !lockMap[key].lastAttempt || lockMap[key].lastAttempt < cutoff) {
          delete lockMap[key];
          cleaned = true;
        }
      }
      if (cleaned) {
        lockData.adminLock = lockMap;
        writeSettings(lockData).catch(() => {});
      }

      if (entry && entry.lockedUntil && now < entry.lockedUntil) {
        const msLeft = entry.lockedUntil - now;
        const minsLeft = Math.ceil(msLeft / 60000);
        return res.status(429).json({
          success: false,
          error: 'locked',
          message: `Too many failed attempts. Try again in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}.`,
          lockedUntil: entry.lockedUntil
        });
      }
    } catch (e) {}
  }

  // =========================================
  // WRONG PASSWORD TELEGRAM ALERT (skip if trusted)
  // =========================================
  if (password && password !== ADMIN_PASS && !isTrusted) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (botToken && chatId) {
        const ip2 = clientIp;
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

  // =========================================
  // PASSWORD CHECK (applies to EVERYONE)
  // =========================================
  if (password !== ADMIN_PASS) {
    if (pollBinId && apiKey) {
      try {
        const settings = lockData || await readSettings();
        if (!settings.adminLock) settings.adminLock = {};
        const entry = settings.adminLock[clientIp] || { attempts: 0, lockedUntil: 0 };

        if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
          entry.attempts = 0;
          entry.lockedUntil = 0;
        }

        entry.attempts = (entry.attempts || 0) + 1;
        entry.lastAttempt = Date.now();

        let locked = false;
        if (entry.attempts >= MAX_ATTEMPTS) {
          entry.lockedUntil = Date.now() + LOCK_DURATION_MS;
          locked = true;
        }
        settings.adminLock[clientIp] = entry;
        await writeSettings(settings);

        if (locked) {
          return res.status(429).json({
            success: false,
            error: 'locked',
            message: 'Too many failed attempts. Try again in 20 minutes.',
            lockedUntil: entry.lockedUntil
          });
        }
      } catch (e) {}
    }

    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  // =========================================
  // SUCCESS → reset attempts for this IP
  // =========================================
  if (pollBinId && apiKey) {
    try {
      const settings = lockData || await readSettings();
      if (settings.adminLock && settings.adminLock[clientIp]) {
        delete settings.adminLock[clientIp];
        await writeSettings(settings);
      }
    } catch (e) {}
  }

  // =========================================
  // PIN / UNPIN HOMEPAGE SECTIONS
  // =========================================
  if (action === 'pinSection' || action === 'unpinSection' || action === 'getPinnedSections') {
    if (!apiKey || !pollBinId) {
      return res.status(500).json({ error: 'POLL_BIN_ID or JSONBIN key not configured' });
    }
    const settingsUrl = `https://api.jsonbin.io/v3/b/${pollBinId}`;
    const settingsHeaders = { 'X-Master-Key': apiKey, 'Content-Type': 'application/json' };

    try {
      const r = await fetch(`${settingsUrl}/latest`, { headers: settingsHeaders });
      const d = await r.json();
      let data = (d.record && typeof d.record === 'object') ? d.record : {};
      if (!Array.isArray(data.pinned)) data.pinned = [];

      if (action === 'getPinnedSections') {
        return res.status(200).json({ success: true, pinned: data.pinned });
      }

      const sectionId = (body.sectionId || '').trim();
      if (!sectionId) return res.status(400).json({ error: 'sectionId required' });

      if (action === 'pinSection') {
        if (!data.pinned.includes(sectionId)) {
          if (data.pinned.length >= 2) {
            return res.status(400).json({ error: 'Max 2 sections can be pinned. Unpin one first.' });
          }
          data.pinned.push(sectionId);
        }
      } else if (action === 'unpinSection') {
        data.pinned = data.pinned.filter(s => s !== sectionId);
      }

      const saveRes = await fetch(settingsUrl, {
        method: 'PUT', headers: settingsHeaders, body: JSON.stringify(data)
      });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, pinned: data.pinned });
    } catch (e) {
      return res.status(500).json({ error: 'Server error', details: e.message });
    }
  }

  // =========================================
  // COMMENTS MANAGEMENT
  // =========================================
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
      comments = comments.filter(c => String(c.id) !== String(commentId));
      if (comments.length === before) return res.status(404).json({ error: 'Not found' });
      const saveRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(comments) });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'hide') {
      const idx = comments.findIndex(c => String(c.id) === String(commentId));
      if (idx === -1) return res.status(404).json({ error: 'Comment not found' });
      comments[idx].hidden = true;
      comments[idx].hiddenAt = Date.now();
      const saveRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(comments) });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'unhide') {
      const idx = comments.findIndex(c => String(c.id) === String(commentId));
      if (idx === -1) return res.status(404).json({ error: 'Comment not found' });
      delete comments[idx].hidden;
      delete comments[idx].hiddenAt;
      const saveRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(comments) });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'reply') {
      if (!replyText) return res.status(400).json({ error: 'Reply text required' });
      if (replyText.length > 400) return res.status(400).json({ error: 'Reply too long' });
      const idx = comments.findIndex(c => String(c.id) === String(commentId));
      if (idx === -1) return res.status(404).json({ error: 'Comment not found' });
      comments[idx].reply = replyText;
      comments[idx].replyTimestamp = Date.now();
      const saveRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(comments) });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'unreply') {
      const idx = comments.findIndex(c => String(c.id) === String(commentId));
      if (idx === -1) return res.status(404).json({ error: 'Comment not found' });
      delete comments[idx].reply;
      delete comments[idx].replyTimestamp;
      const saveRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify(comments) });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    if (action === 'clear') {
      const saveRes = await fetch(baseUrl, { method: 'PUT', headers, body: JSON.stringify([]) });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });
      return res.status(200).json({ success: true, comments: [] });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};