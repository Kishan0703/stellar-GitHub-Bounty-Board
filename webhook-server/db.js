const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bounties.db'));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create bounties table
db.exec(`
  CREATE TABLE IF NOT EXISTS bounties (
    id TEXT PRIMARY KEY,
    issueUrl TEXT UNIQUE NOT NULL,
    repoOwner TEXT NOT NULL,
    repoName TEXT NOT NULL,
    issueNumber INTEGER NOT NULL,
    escrowId TEXT,
    escrowContractAddress TEXT,
    posterWallet TEXT NOT NULL,
    solverWallet TEXT,
    amount TEXT NOT NULL,
    currency TEXT DEFAULT 'USDC',
    status TEXT DEFAULT 'open',
    title TEXT,
    description TEXT,
    webhook_secret TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT
  )
`);

const columns = db.prepare('PRAGMA table_info(bounties)').all();
const hasColumn = (name) => columns.some((column) => column.name === name);

if (!hasColumn('webhook_secret')) {
  db.exec('ALTER TABLE bounties ADD COLUMN webhook_secret TEXT');
}

module.exports = db;
