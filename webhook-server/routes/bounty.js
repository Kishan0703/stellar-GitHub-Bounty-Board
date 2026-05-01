const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { getPlatformPublicKey } = require('../stellar');

// TODO: add auth on all sensitive routes

const PUBLIC_BOUNTY_COLUMNS = `
  id, issueUrl, repoOwner, repoName, issueNumber, escrowId, escrowContractAddress,
  posterWallet, solverWallet, amount, currency, status, title, description,
  completedTxHash, createdAt, updatedAt
`;

/**
 * POST /bounty/create
 * Create a new bounty. Funds are held by the platform wallet after manual deposit.
 */
router.post('/bounty/create', async (req, res) => {
  try {
    const { issueUrl, posterWallet, amount, title, description, webhookSecret } = req.body;

    // Validate required fields
    if (!issueUrl || !posterWallet || !amount || !title || !webhookSecret) {
      return res.status(400).json({
        error: 'Missing required fields: issueUrl, posterWallet, amount, title, webhookSecret',
      });
    }

    const normalizedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 1) {
      return res.status(400).json({ error: 'Bounty amount must be at least 1 USDC' });
    }

    const trimmedWebhookSecret = String(webhookSecret).trim();
    if (trimmedWebhookSecret.length < 8) {
      return res.status(400).json({ error: 'Webhook secret must be at least 8 characters' });
    }

    // Parse GitHub issue URL
    // Expected format: https://github.com/owner/repo/issues/123
    let parsedIssueUrl;
    try {
      parsedIssueUrl = new URL(issueUrl);
    } catch (urlError) {
      return res.status(400).json({
        error: 'Invalid GitHub issue URL. Expected format: https://github.com/owner/repo/issues/123',
      });
    }

    const urlMatch = parsedIssueUrl.pathname.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)\/?$/);

    if (parsedIssueUrl.hostname.toLowerCase() !== 'github.com' || !urlMatch) {
      return res.status(400).json({
        error: 'Invalid GitHub issue URL. Expected format: https://github.com/owner/repo/issues/123',
      });
    }

    const [, repoOwner, repoName, issueNumberStr] = urlMatch;
    const issueNumber = parseInt(issueNumberStr, 10);
    const normalizedIssueUrl = `https://github.com/${repoOwner}/${repoName}/issues/${issueNumber}`;

    // Check for duplicate
    const existing = db.prepare('SELECT id FROM bounties WHERE issueUrl = ?').get(normalizedIssueUrl);
    if (existing) {
      return res.status(409).json({ error: 'A bounty already exists for this issue' });
    }

    // Generate unique ID
    const id = crypto.randomUUID();

    // Store in database
    const stmt = db.prepare(`
      INSERT INTO bounties (id, issueUrl, repoOwner, repoName, issueNumber, posterWallet, amount, currency, status, title, description, webhookSecret)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'USDC', 'funded', ?, ?, ?)
    `);

    stmt.run(
      id,
      normalizedIssueUrl,
      repoOwner,
      repoName,
      issueNumber,
      posterWallet,
      normalizedAmount.toFixed(2),
      title,
      description || null,
      trimmedWebhookSecret
    );

    const bounty = db.prepare(`SELECT ${PUBLIC_BOUNTY_COLUMNS} FROM bounties WHERE id = ?`).get(id);

    console.log(`Bounty created: ${title} (${normalizedAmount.toFixed(2)} USDC) for ${normalizedIssueUrl}`);
    return res.status(201).json({
      ...bounty,
      platformWallet: getPlatformPublicKey(),
    });
  } catch (error) {
    console.error('Create bounty error:', error);
    return res.status(500).json({ error: 'Failed to create bounty' });
  }
});

/**
 * POST /bounty/fund
 * Mark a bounty funded after USDC has been sent to the platform wallet.
 */
router.post('/bounty/fund', async (req, res) => {
  try {
    const { bountyId } = req.body;

    if (!bountyId) {
      return res.status(400).json({ error: 'Missing required field: bountyId' });
    }

    const bounty = db.prepare('SELECT * FROM bounties WHERE id = ?').get(bountyId);

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'open') {
      return res.status(400).json({
        error: `Bounty is ${bounty.status}, only open bounties can be marked funded`,
      });
    }

    db.prepare(
      'UPDATE bounties SET status = ?, updatedAt = datetime(\'now\') WHERE id = ?'
    ).run('funded', bountyId);

    const updated = db.prepare(`SELECT ${PUBLIC_BOUNTY_COLUMNS} FROM bounties WHERE id = ?`).get(bountyId);
    console.log(`Bounty ${bountyId} marked funded`);
    return res.json(updated);
  } catch (error) {
    console.error('Fund bounty error:', error);
    return res.status(500).json({ error: 'Failed to mark bounty funded' });
  }
});

/**
 * POST /bounty/claim
 * Claim a funded bounty as a solver.
 */
router.post('/bounty/claim', async (req, res) => {
  try {
    const { bountyId, solverWallet } = req.body;

    if (!bountyId || !solverWallet) {
      return res.status(400).json({
        error: 'Missing required fields: bountyId, solverWallet',
      });
    }

    const bounty = db.prepare('SELECT * FROM bounties WHERE id = ?').get(bountyId);

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'funded') {
      return res.status(400).json({
        error: `Bounty is ${bounty.status}, only funded bounties can be claimed`,
      });
    }

    // Update database
    db.prepare(
      'UPDATE bounties SET solverWallet = ?, status = ?, updatedAt = datetime(\'now\') WHERE id = ?'
    ).run(solverWallet, 'claimed', bountyId);

    const updated = db.prepare(`SELECT ${PUBLIC_BOUNTY_COLUMNS} FROM bounties WHERE id = ?`).get(bountyId);

    console.log(`Bounty ${bountyId} claimed by ${solverWallet}`);
    return res.json(updated);
  } catch (error) {
    console.error('Claim bounty error:', error);
    return res.status(500).json({ error: 'Failed to claim bounty' });
  }
});

router.get('/platform-wallet', (req, res) => {
  try {
    return res.json({
      publicKey: getPlatformPublicKey(),
      network: 'testnet',
      asset: {
        code: 'USDC',
        issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /bounties
 * List all bounties with optional status filter.
 */
router.get('/bounties', (req, res) => {
  try {
    const { status } = req.query;

    let bounties;
    if (status) {
      bounties = db.prepare(
        `SELECT ${PUBLIC_BOUNTY_COLUMNS} FROM bounties WHERE status = ? ORDER BY createdAt DESC`
      ).all(status);
    } else {
      bounties = db.prepare(
        `SELECT ${PUBLIC_BOUNTY_COLUMNS} FROM bounties ORDER BY createdAt DESC`
      ).all();
    }

    return res.json(bounties);
  } catch (error) {
    console.error('List bounties error:', error);
    return res.status(500).json({ error: 'Failed to fetch bounties' });
  }
});

/**
 * GET /bounty/:id
 * Get a single bounty by ID.
 */
router.get('/bounty/:id', (req, res) => {
  try {
    const bounty = db.prepare(`SELECT ${PUBLIC_BOUNTY_COLUMNS} FROM bounties WHERE id = ?`).get(req.params.id);

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    return res.json(bounty);
  } catch (error) {
    console.error('Get bounty error:', error);
    return res.status(500).json({ error: 'Failed to fetch bounty' });
  }
});

module.exports = router;
