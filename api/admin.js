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

  const ADMIN_PASS = process.env.ADMIN_PASSWORD || '9272';
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

    // Verify only
    if (action === 'verify') {
      return res.status(200).json({ success: true, comments: comments.slice(-50).reverse() });
    }

    // Delete single comment
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

    // Reply to comment
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

    // Remove reply
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

    // Clear all
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