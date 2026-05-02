const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initializeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bounties (
      id TEXT PRIMARY KEY,
      "issueUrl" TEXT UNIQUE NOT NULL,
      "repoOwner" TEXT NOT NULL,
      "repoName" TEXT NOT NULL,
      "issueNumber" INTEGER NOT NULL,
      "escrowId" TEXT,
      "escrowContractAddress" TEXT,
      "posterWallet" TEXT NOT NULL,
      "solverWallet" TEXT,
      amount TEXT NOT NULL,
      currency TEXT DEFAULT 'USDC',
      status TEXT DEFAULT 'open',
      title TEXT,
      description TEXT,
      webhook_secret TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW(),
      "updatedAt" TIMESTAMP
    )
  `);
}

initializeSchema().catch((error) => {
  console.error('Failed to initialize database schema:', error);
});

module.exports = pool;
