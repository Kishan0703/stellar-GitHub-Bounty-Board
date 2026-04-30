const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { releaseEscrow } = require('../trustlesswork');

// TODO: add auth — webhook signature verification is the primary security here

function signatureMatches(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  const sig = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  return sig.length === expected.length && crypto.timingSafeEqual(sig, expected);
}

/**
 * POST /webhook/github
 * Receives GitHub webhook events for pull_request merges.
 * Verifies signature, checks for linked issues, and auto-releases escrow.
 */
router.post(
  '/github',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      // 1. Parse body and verify GitHub webhook signature with this repo's bounty secret.
      const signature = req.headers['x-hub-signature-256'];
      const payload = JSON.parse(req.body.toString());
      const repoOwner = payload.repository?.owner?.login;
      const repoName = payload.repository?.name;

      if (!signature || !repoOwner || !repoName) {
        console.warn('Missing webhook signature or repository information');
        return res.status(401).json({ error: 'Missing signature' });
      }

      const configuredSecrets = db.prepare(`
        SELECT DISTINCT webhookSecret
        FROM bounties
        WHERE LOWER(repoOwner) = LOWER(?)
          AND LOWER(repoName) = LOWER(?)
          AND webhookSecret IS NOT NULL
          AND webhookSecret != ''
      `).all(repoOwner, repoName);
      const secrets = configuredSecrets.map((row) => row.webhookSecret);

      if (process.env.GITHUB_WEBHOOK_SECRET) {
        secrets.push(process.env.GITHUB_WEBHOOK_SECRET);
      }

      const verified = secrets.some((secret) => signatureMatches(req.body, signature, secret));
      if (!verified) {
        console.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // 2. Check event type
      const event = req.headers['x-github-event'];

      if (event !== 'pull_request') {
        return res.status(200).json({ message: `Ignored event: ${event}` });
      }

      // 3. Only process merged PRs
      if (payload.action !== 'closed' || !payload.pull_request?.merged) {
        return res.status(200).json({ message: 'PR not merged, ignoring' });
      }

      console.log(`🔀 Merged PR #${payload.pull_request.number} in ${payload.repository.full_name}`);

      // 5. Search PR title/body for linked issue: Fixes #123, Closes owner/repo#123.
      const prText = `${payload.pull_request.title || ''}\n${payload.pull_request.body || ''}`;
      const issuePattern = /\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?)\s+(?:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)?#(\d+)/gi;
      const matches = [...prText.matchAll(issuePattern)];

      if (matches.length === 0) {
        console.log('No linked issues found in PR title or body');
        return res.status(200).json({ message: 'No linked issues found' });
      }

      // 6. Process each linked issue
      for (const match of matches) {
        const issueNumber = parseInt(match[1], 10);
        console.log(`🔍 Looking up bounty for ${repoOwner}/${repoName}#${issueNumber}`);

        const bounty = db.prepare(
          `SELECT * FROM bounties
           WHERE LOWER(repoOwner) = LOWER(?)
             AND LOWER(repoName) = LOWER(?)
             AND issueNumber = ?`
        ).get(repoOwner, repoName, issueNumber);

        if (!bounty) {
          console.log(`No bounty found for issue #${issueNumber}`);
          continue;
        }

        if (bounty.status !== 'claimed') {
          console.log(`Bounty ${bounty.id} is ${bounty.status}, not claimed — skipping`);
          continue;
        }

        if (!bounty.escrowId) {
          console.log(`Bounty ${bounty.id} has no escrow ID — skipping release`);
          continue;
        }

        // 7. Release escrow via Trustless Work API
        try {
          console.log(`💰 Releasing escrow ${bounty.escrowId} for bounty ${bounty.id}`);
          await releaseEscrow(bounty.escrowId);

          // 8. Update bounty status
          db.prepare(
            'UPDATE bounties SET status = ?, updatedAt = datetime(\'now\') WHERE id = ?'
          ).run('completed', bounty.id);

          console.log(`✅ Bounty ${bounty.id} completed! Funds released to ${bounty.solverWallet}`);
        } catch (releaseError) {
          console.error(`Failed to release escrow for bounty ${bounty.id}:`, releaseError.message);
          // Don't fail the webhook — GitHub needs a 200
        }
      }

      return res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      // Always return 200 to GitHub to avoid retries on our errors
      return res.status(200).json({ message: 'Webhook received with errors' });
    }
  }
);

module.exports = router;
