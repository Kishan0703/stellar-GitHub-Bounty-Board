const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../db');
const { initializeEscrow, setServiceProvider } = require('../trustlesswork');

// TODO: add auth on all sensitive routes

/**
 * POST /bounty/create
 * Create a new bounty backed by a Trustless Work escrow.
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

    // Parse GitHub issue URL
    // Expected format: https://github.com/owner/repo/issues/123
    const urlPattern = /github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/;
    const urlMatch = issueUrl.match(urlPattern);

    if (!urlMatch) {
      return res.status(400).json({
        error: 'Invalid GitHub issue URL. Expected format: https://github.com/owner/repo/issues/123',
      });
    }

    const [, repoOwner, repoName, issueNumberStr] = urlMatch;
    const issueNumber = parseInt(issueNumberStr, 10);

    // Check for duplicate
    const existingResult = await pool.query('SELECT id FROM bounties WHERE "issueUrl" = $1', [issueUrl]);
    if (existingResult.rows[0]) {
      return res.status(409).json({ error: 'A bounty already exists for this issue' });
    }

    // Generate unique ID
    const id = crypto.randomUUID();

    // Initialize escrow via Trustless Work API
    let escrowData = {};
    try {
      escrowData = await initializeEscrow({
        posterWallet,
        solverWallet: '',
        amount,
        title,
        description: description || '',
      });
    } catch (escrowError) {
      console.error('Escrow initialization failed:', escrowError.message);
      // Still create the bounty, but without escrow — can be linked later
      // This allows the app to function even if the API is temporarily down
    }

    // Store in database
    await pool.query(`
      INSERT INTO bounties (
        id, "issueUrl", "repoOwner", "repoName", "issueNumber", "escrowId",
        "escrowContractAddress", "posterWallet", amount, currency, status, title, description, webhook_secret
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'USDC', 'open', $10, $11, $12)
    `, [
      id,
      issueUrl,
      repoOwner,
      repoName,
      issueNumber,
      escrowData.escrowId || null,
      escrowData.contractAddress || null,
      posterWallet,
      amount,
      title,
      description || null,
      webhookSecret,
    ]);

    const bountyResult = await pool.query('SELECT * FROM bounties WHERE id = $1', [id]);
    const bounty = bountyResult.rows[0];

    console.log(`🏆 Bounty created: ${title} (${amount} USDC) for ${issueUrl}`);
    return res.status(201).json(bounty);
  } catch (error) {
    console.error('Create bounty error:', error);
    return res.status(500).json({ error: 'Failed to create bounty' });
  }
});

/**
 * POST /bounty/claim
 * Claim an open bounty as a solver.
 */
router.post('/bounty/claim', async (req, res) => {
  try {
    const { bountyId, solverWallet } = req.body;

    if (!bountyId || !solverWallet) {
      return res.status(400).json({
        error: 'Missing required fields: bountyId, solverWallet',
      });
    }

    const bountyResult = await pool.query('SELECT * FROM bounties WHERE id = $1', [bountyId]);
    const bounty = bountyResult.rows[0];

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'open') {
      return res.status(400).json({
        error: `Bounty is ${bounty.status}, only open bounties can be claimed`,
      });
    }

    // Update service provider on escrow
    if (bounty.escrowId) {
      try {
        await setServiceProvider(bounty.escrowId, solverWallet);
      } catch (escrowError) {
        console.error('Failed to set service provider on escrow:', escrowError.message);
        // Continue — we still want to mark it claimed in our DB
      }
    }

    // Update database
    await pool.query(
      'UPDATE bounties SET "solverWallet" = $1, status = $2, "updatedAt" = NOW() WHERE id = $3',
      [solverWallet, 'claimed', bountyId]
    );

    const updatedResult = await pool.query('SELECT * FROM bounties WHERE id = $1', [bountyId]);
    const updated = updatedResult.rows[0];

    console.log(`🎯 Bounty ${bountyId} claimed by ${solverWallet}`);
    return res.json(updated);
  } catch (error) {
    console.error('Claim bounty error:', error);
    return res.status(500).json({ error: 'Failed to claim bounty' });
  }
});

/**
 * GET /bounties
 * List all bounties with optional status filter.
 */
router.get('/bounties', async (req, res) => {
  try {
    const { status } = req.query;

    let bounties;
    if (status) {
      const result = await pool.query(
        'SELECT * FROM bounties WHERE status = $1 ORDER BY "createdAt" DESC',
        [status]
      );
      bounties = result.rows;
    } else {
      const result = await pool.query(
        'SELECT * FROM bounties ORDER BY "createdAt" DESC'
      );
      bounties = result.rows;
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
router.get('/bounty/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bounties WHERE id = $1', [req.params.id]);
    const bounty = result.rows[0];

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
