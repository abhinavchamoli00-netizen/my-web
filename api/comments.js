module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.JSONBIN_API_KEY || process.env.JSONBIN_KEY;
  const binId = process.env.JSONBIN_BIN_ID || process.env.JSONBIN_ID;

  if (!apiKey || !binId) {
    return res.status(500).json({ 
      error: 'JSONBin config missing',
      hasKey: !!apiKey,
      hasBinId: !!binId
    });
  }

  const baseUrl = `https://api.jsonbin.io/v3/b/${binId}`;
  const headers = {
    'X-Master-Key': apiKey,
    'Content-Type': 'application/json'
  };

  // =====================
  // GET: Fetch all comments (public — hidden filtered out)
  // =====================
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${baseUrl}/latest`, { headers });
      const data = await response.json();
      
      let comments = [];
      if (data.record && Array.isArray(data.record)) {
        comments = data.record;
      } else if (data.record && data.record.comments) {
        comments = data.record.comments;
      }
      
      // ✅ Filter out hidden comments from public view
      comments = comments.filter(c => !c.hidden);
      
      comments = comments.slice(-50).reverse();
      return res.status(200).json({ success: true, comments });
    } catch (error) {
      return res.status(500).json({ error: 'Fetch failed', details: error.message });
    }
  }

  // =====================
  // POST: Add new comment
  // =====================
  if (req.method === 'POST') {
    // Rate limit
    if (!global._cmtRate) global._cmtRate = new Map();
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const now = Date.now();
    const WINDOW = 5 * 60 * 1000;
    const MAX = 5;
    const rec = global._cmtRate.get(ip);
    if (!rec || now - rec.start > WINDOW) {
      global._cmtRate.set(ip, { start: now, count: 1 });
    } else {
      if (rec.count >= MAX) {
        return res.status(429).json({ error: 'Too many comments. Please wait a bit.' });
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

    if (typeof message !== 'string' || message.length > 300) {
      return res.status(413).json({ error: 'Message too long (max 300 chars)' });
    }
    if (name && (typeof name !== 'string' || name.length > 30)) {
      return res.status(413).json({ error: 'Name too long (max 30 chars)' });
    }

    name = (name || '').trim() || 'Anonymous';
    if (name.length > 30) name = name.substring(0, 30);
    let cleanMessage = message.trim();
    if (cleanMessage.length > 300) cleanMessage = cleanMessage.substring(0, 300);

    try {
      const readRes = await fetch(`${baseUrl}/latest`, { headers });
      const readData = await readRes.json();
      
      let comments = [];
      if (readData.record && Array.isArray(readData.record)) {
        comments = readData.record;
      } else if (readData.record && readData.record.comments) {
        comments = readData.record.comments;
      }

      const newComment = {
        id: Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        name: name,
        message: cleanMessage,
        timestamp: Date.now()
      };

      comments.push(newComment);
      if (comments.length > 100) comments = comments.slice(-100);

      const saveRes = await fetch(baseUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify(comments)
      });

      if (!saveRes.ok) {
        return res.status(500).json({ error: 'Save failed' });
      }

      return res.status(200).json({ success: true, comment: newComment });
    } catch (error) {
      return res.status(500).json({ error: 'Internal error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};