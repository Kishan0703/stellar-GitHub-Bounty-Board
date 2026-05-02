const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const pool = require('../db');
const StellarSdk = require('@stellar/stellar-sdk');

// TODO: add auth — webhook signature verification is the primary security here

/**
 * Release bounty funds via direct Stellar USDC transfer from platform wallet
 */
async function releaseFunds(solverWallet, amount) {
  const server = new StellarSdk.Horizon.Server(process.env.STELLAR_HORIZON_URL);
  const platformKeypair = StellarSdk.Keypair.fromSecret(process.env.PLATFORM_SECRET_KEY);
  const account = await server.loadAccount(platformKeypair.publicKey());
  
  const usdcAsset = new StellarSdk.Asset(
    process.env.USDC_ASSET_CODE,
    process.env.USDC_ASSET_ISSUER
  );

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: solverWallet,
      asset: usdcAsset,
      amount: amount.toString(),
    }))
    .setTimeout(30)
    .build();

  transaction.sign(platformKeypair);
  const result = await server.submitTransaction(transaction);
  return result;
}

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

      const repoBountiesResult = await pool.query(
        'SELECT * FROM bounties WHERE "repoOwner" = $1 AND "repoName" = $2',
        [repoOwner, repoName]
      );
      const repoBounties = repoBountiesResult.rows;

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

        const bountyResult = await pool.query(
          'SELECT * FROM bounties WHERE "repoOwner" = $1 AND "repoName" = $2 AND "issueNumber" = $3',
          [repoOwner, repoName, issueNumber]
        );
        const bounty = bountyResult.rows[0];

        if (!bounty) {
          console.log(`No bounty found for issue #${issueNumber}`);
          continue;
        }

        if (bounty.status !== 'claimed') {
          console.log(`Bounty ${bounty.id} is ${bounty.status}, not claimed — skipping`);
          continue;
        }

        // 7. Release funds via direct Stellar USDC transfer
        try {
          console.log(`💰 Transferring ${bounty.amount} USDC to ${bounty.solverWallet} for bounty ${bounty.id}`);
          await releaseFunds(bounty.solverWallet, bounty.amount);

          // 8. Update bounty status
          await pool.query(
            'UPDATE bounties SET status = $1, "updatedAt" = NOW() WHERE id = $2',
            ['completed', bounty.id]
          );

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
