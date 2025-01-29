const express = require('express');
const bodyParser = require('body-parser');
const { customAlphabet } = require('nanoid');
const getShard = require('./db'); // Import sharding logic
const redis = require('redis');

const app = express(); // ✅ This is missing in your file!
const PORT = process.env.PORT || 3000;

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 6);

app.use(bodyParser.json()); // ✅ Middleware for JSON parsing

// Create Redis client
const redisClient = redis.createClient();
redisClient.connect()
  .then(() => console.log("✅ Connected to Redis"))
  .catch((err) => console.error("❌ Redis connection error:", err));

// Endpoint to shorten URLs
app.post('/shorten', async (req, res) => {
  const { longUrl } = req.body;
  if (!longUrl) return res.status(400).json({ error: 'No longUrl provided.' });

  const shortId = nanoid();
  const db = getShard(shortId); // Pick correct shard

  try {
    const insertStmt = db.prepare('INSERT INTO url_mappings (id, long_url) VALUES (?, ?)');
    insertStmt.run(shortId, longUrl);
    await redisClient.setEx(shortId, 86400, longUrl);

    res.status(201).json({ shortUrl: `http://localhost:${PORT}/${shortId}`, shortId, longUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint to redirect users
app.get('/:shortId', async (req, res) => {
  const { shortId } = req.params;
  try {
    const cachedLongUrl = await redisClient.get(shortId);
    if (cachedLongUrl) return res.redirect(cachedLongUrl);

    const db = getShard(shortId); // Pick correct shard
    const queryStmt = db.prepare('SELECT long_url FROM url_mappings WHERE id = ?');
    const row = queryStmt.get(shortId);
    if (!row) return res.status(404).send('URL not found');

    await redisClient.setEx(shortId, 86400, row.long_url);
    return res.redirect(row.long_url);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`🚀 URL Shortener listening on port ${PORT}`);
});
