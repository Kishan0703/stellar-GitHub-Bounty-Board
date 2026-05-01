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
  async (req, res) => {
    try {
      // 1. Verify GitHub webhook signature
      const rawBody = req.body;
      const signature = req.headers['x-hub-signature-256'];
      if (!signature) {
        console.warn('Missing webhook signature');
        return res.status(401).json({ error: 'Missing signature' });
      }

      // 2. Parse body and check event type
      const payload = JSON.parse(rawBody.toString());
      const event = req.headers['x-github-event'];

      if (event !== 'pull_request') {
        return res.status(200).json({ message: `Ignored event: ${event}` });
      }

      // 3. Only process merged PRs
      if (payload.action !== 'closed' || !payload.pull_request?.merged) {
        return res.status(200).json({ message: 'PR not merged, ignoring' });
      }

      console.log(`🔀 Merged PR #${payload.pull_request.number} in ${payload.repository.full_name}`);

      // 4. Extract repo info
      const repoUrl = payload.repository?.html_url || '';
      const repoOwner = payload.repository?.owner?.login;
      const repoName = payload.repository?.name;

      if (!repoOwner || !repoName) {
        return res.status(400).json({ error: 'Missing repository info in payload' });
      }

      const repoBounties = db.prepare(
        'SELECT * FROM bounties WHERE repoOwner = ? AND repoName = ?'
      ).all(repoOwner, repoName);

      const matchingBounties = repoBounties.filter((bounty) =>
        signatureMatches(rawBody, signature, bounty.webhook_secret)
      );

      if (matchingBounties.length === 0) {
        console.warn(`Invalid webhook signature for repo ${repoUrl || `${repoOwner}/${repoName}`}`);
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // 5. Search PR body for linked issue: Fixes #123, Closes #123, Resolves #123
      const prBody = payload.pull_request.body || '';
      const issuePattern = /(?:fixes|closes|resolves)\s+#(\d+)/gi;
      const matches = [...prBody.matchAll(issuePattern)];

      if (matches.length === 0) {
        console.log('No linked issues found in PR body');
        return res.status(200).json({ message: 'No linked issues found' });
      }

      // 6. Process each linked issue
      for (const match of matches) {
        const issueNumber = parseInt(match[1], 10);
        console.log(`🔍 Looking up bounty for ${repoOwner}/${repoName}#${issueNumber}`);

        const bounty = db.prepare(
          'SELECT * FROM bounties WHERE repoOwner = ? AND repoName = ? AND issueNumber = ?'
        ).get(repoOwner, repoName, issueNumber);

        if (!bounty) {
          console.log(`No bounty found for issue #${issueNumber}`);
          continue;
        }

        if (bounty.status !== 'claimed') {
          console.log(`Bounty ${bounty.id} is ${bounty.status}, not claimed — skipping`);
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
