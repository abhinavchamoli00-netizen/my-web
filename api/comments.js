module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.JSONBIN_API_KEY || process.env.JSONBIN_KEY;
  const binId = process.env.JSONBIN_BIN_ID || process.env.JSONBIN_ID;
  if (!apiKey || !binId) return res.status(500).json({ error: 'Config missing' });

  const baseUrl = `https://api.jsonbin.io/v3/b/${binId}`;
  const headers = { 'X-Master-Key': apiKey, 'Content-Type': 'application/json' };

  // GET — list visible comments
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${baseUrl}/latest`, { headers });
      const d = await r.json();
      let comments = [];
      if (d.record && Array.isArray(d.record)) comments = d.record;
      else if (d.record && d.record.comments) comments = d.record.comments;

      const visible = comments.filter(c => !c.hidden);
      return res.status(200).json({ success: true, comments: visible.slice(-50) });
    } catch (e) {
      return res.status(500).json({ error: 'Server error', details: e.message });
    }
  }

  // POST — add comment
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const name = (body.name || '').toString().trim().substring(0, 30) || 'Anonymous';
    const message = (body.message || '').toString().trim().substring(0, 300);
    if (!message) return res.status(400).json({ error: 'Message required' });

    try {
      const r = await fetch(`${baseUrl}/latest`, { headers });
      const d = await r.json();
      let comments = [];
      if (d.record && Array.isArray(d.record)) comments = d.record;
      else if (d.record && d.record.comments) comments = d.record.comments;

      const newComment = {
        id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        name: name,
        message: message,
        timestamp: Date.now()
      };
      comments.push(newComment);
      if (comments.length > 100) comments = comments.slice(-100);

      const saveRes = await fetch(baseUrl, {
        method: 'PUT', headers, body: JSON.stringify(comments)
      });
      if (!saveRes.ok) return res.status(500).json({ error: 'Save failed' });

      return res.status(200).json({ success: true, comment: newComment });
    } catch (e) {
      return res.status(500).json({ error: 'Server error', details: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};