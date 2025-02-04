import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert ES module paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to pick the correct database shard
function getShard(shortId) {
    const shards = ['shard_A.db', 'shard_B.db']; // Add more shards as needed
    const index = shortId.charCodeAt(0) % shards.length; // Hashing based on first character
    return new Database(path.join(__dirname, shards[index]));
}

// Ensure each shard has the correct table structure
['shard_A.db', 'shard_B.db'].forEach((shard) => {
    const db = new Database(path.join(__dirname, shard));
    db.exec(`
      CREATE TABLE IF NOT EXISTS url_mappings (
        id TEXT PRIMARY KEY,
        long_url TEXT NOT NULL,
        creation_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
});

export default getShard;
