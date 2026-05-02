'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { showSuccessToast } from '../lib/toast';

export default function Docs() {
  const [section, setSection] = useState('overview');

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'post', label: 'Post a Bounty' },
    { id: 'claim', label: 'Claim & Solve' },
    { id: 'webhook', label: 'Webhook Setup' },
    { id: 'faq', label: 'FAQ' },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSuccessToast('Copied to clipboard');
  };

  return (
    <>
      <Head>
        <title>Documentation — BountyBoard</title>
        <meta name="description" content="Learn how to use BountyBoard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <div style={{ borderRight: '1px solid var(--border-color)', padding: '24px', backgroundColor: 'rgba(255,255,255,0.02)', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Documentation
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                style={{
                  background: section === s.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: section === s.id ? '600' : '500',
                  color: section === s.id ? 'var(--accent)' : 'var(--text-secondary)',
                  transition: 'all 200ms ease',
                  textAlign: 'left',
                }}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div style={{ padding: '40px', maxWidth: '800px', overflow: 'auto' }}>
          {section === 'overview' && (
            <>
              <h1 className="page-title">Overview</h1>
              <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '14px' }}>
                <p>BountyBoard makes it easy to reward developers for solving your GitHub issues.</p>

                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  How It Works
                </h2>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li><strong>Post</strong> — Create a bounty linked to your GitHub issue with a USDC reward amount</li>
                  <li><strong>Claim</strong> — Developers connect their wallet and claim the bounty</li>
                  <li><strong>Solve</strong> — Solvers work on the issue and submit a pull request</li>
                  <li><strong>Merge</strong> — When the PR is merged, funds automatically transfer to the solver</li>
                </ol>

                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Why BountyBoard?
                </h2>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>✓ Trustless — Funds are managed by Stellar blockchain</li>
                  <li>✓ Transparent — Everyone can see available bounties</li>
                  <li>✓ Automated — Payments release automatically on PR merge</li>
                  <li>✓ No fees — Direct USDC transfers, no middleman</li>
                </ul>

                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Requirements
                </h2>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <li>Stellar wallet (use <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Freighter</a>)</li>
                  <li>Access to your GitHub repository</li>
                  <li>USDC on Stellar testnet</li>
                </ul>
              </div>
            </>
          )}

          {section === 'post' && (
            <>
              <h1 className="page-title">Post a Bounty</h1>
              <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '14px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '0', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Step-by-Step Guide
                </h2>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  1. Connect Your Wallet
                </h3>
                <p>Click "Connect" and approve the connection in Freighter. Make sure you're on the Testnet.</p>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  2. Link Your GitHub Issue
                </h3>
                <p>Provide the full URL to your GitHub issue. Example: <code style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>https://github.com/owner/repo/issues/123</code></p>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  3. Set the Reward Amount
                </h3>
                <p>Enter the USDC amount you're willing to reward. Minimum 1 USDC.</p>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  4. Configure GitHub Webhook
                </h3>
                <p>Copy the webhook URL and secret from BountyBoard, then add them to your repository:</p>
                <ol style={{ paddingLeft: '20px', marginTop: '8px' }}>
                  <li>Go to your repo → Settings → Webhooks</li>
                  <li>Click "Add webhook"</li>
                  <li>Paste the Payload URL</li>
                  <li>Enter your secret</li>
                  <li>Select "Pull Requests" events</li>
                  <li>Save</li>
                </ol>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  5. Confirm & Launch
                </h3>
                <p>Review your bounty details and click "Post Bounty". Your bounty is now live!</p>
              </div>
            </>
          )}

          {section === 'claim' && (
            <>
              <h1 className="page-title">Claim & Solve</h1>
              <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '14px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '0', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  For Developers
                </h2>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Finding Bounties
                </h3>
                <p>Browse the bounty board to find issues you'd like to solve. Filter by status or search by repository name.</p>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Claiming a Bounty
                </h3>
                <ol style={{ paddingLeft: '20px' }}>
                  <li>Connect your Stellar wallet (Freighter)</li>
                  <li>Click "Claim Bounty" on the issue you want to solve</li>
                  <li>Your claim is recorded on-chain</li>
                </ol>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Solving the Issue
                </h3>
                <ol style={{ paddingLeft: '20px' }}>
                  <li>Fork the repository</li>
                  <li>Create a branch and make your changes</li>
                  <li>Commit and push your code</li>
                  <li>Submit a pull request</li>
                </ol>

                <h3 style={{ fontSize: '14px', fontWeight: '700', marginTop: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Getting Paid
                </h3>
                <p>When your PR is merged, our webhook automatically detects the merge and transfers the USDC reward to your wallet. No manual action needed!</p>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '8px', marginTop: '20px', fontSize: '13px' }}>
                  <strong>💡 Tip:</strong> Make sure your PR references the original issue (e.g., "Fixes #123") so our webhook can match it correctly.
                </div>
              </div>
            </>
          )}

          {section === 'webhook' && (
            <>
              <h1 className="page-title">Webhook Setup</h1>
              <div style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '14px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '0', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Understanding Webhooks
                </h2>
                <p>Webhooks allow BountyBoard to automatically detect when a PR is merged and release funds to the solver.</p>

                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Setup Process
                </h2>

                <div className="card" style={{ marginTop: '16px', marginBottom: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Step 1: Get Your Payload URL</h3>
                  <p style={{ fontSize: '13px', marginBottom: '8px' }}>When you post a bounty, we provide your unique webhook URL. Copy it.</p>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent)', wordBreak: 'break-all' }}>
                    https://stellar-bug-bounty-production.up.railway.app/webhook/github
                  </div>
                </div>

                <div className="card" style={{ marginTop: '16px', marginBottom: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Step 2: Add to GitHub</h3>
                  <ol style={{ paddingLeft: '20px', fontSize: '13px' }}>
                    <li>Go to your repository</li>
                    <li>Settings → Webhooks → Add webhook</li>
                    <li>Paste the Payload URL</li>
                    <li>Enter your webhook secret (from BountyBoard)</li>
                    <li>Content type: application/json</li>
                    <li>Events: Select "Pull Requests"</li>
                    <li>Check "Active"</li>
                    <li>Click "Add webhook"</li>
                  </ol>
                </div>

                <div className="card" style={{ marginTop: '16px', marginBottom: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Step 3: Test</h3>
                  <p style={{ fontSize: '13px' }}>After setup, GitHub will test the webhook. You should see a successful delivery in your webhook settings.</p>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Security
                </h2>
                <p>BountyBoard validates each webhook using your secret. Keep it secure and never share it. If compromised, update it in your webhook settings.</p>

                <h2 style={{ fontSize: '18px', fontWeight: '700', marginTop: '24px', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  How It Works
                </h2>
                <ol style={{ paddingLeft: '20px', fontSize: '13px' }}>
                  <li>Solver submits PR linking to the issue</li>
                  <li>PR is merged</li>
                  <li>GitHub sends merge event to our webhook</li>
                  <li>We verify the signature and find the matching bounty</li>
                  <li>Funds transfer to the solver's wallet</li>
                </ol>
              </div>
            </>
          )}

          {section === 'faq' && (
            <>
              <h1 className="page-title">FAQ</h1>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    What is BountyBoard?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>BountyBoard is a trustless platform where project maintainers can post GitHub issues with crypto rewards, and developers can claim and solve them for payment.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Do I need USDC on mainnet or testnet?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>Currently, BountyBoard operates on Stellar's testnet. You'll need testnet USDC. Check the Stellar docs for how to get testnet assets.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    How long does it take to receive payment?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>Payment is automatic on PR merge via our webhook. It typically takes less than 1 minute for funds to appear in your wallet.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    What if a PR is merged but references the wrong issue?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>Make sure your PR body includes "Fixes #123" or "Closes #123" where 123 is the bounty issue number. Our webhook uses this to match PRs to bounties.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Can I cancel a bounty?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>Contact us if you need to cancel an unclaimed bounty. Funds cannot be refunded once a bounty is claimed.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    What wallet should I use?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>We recommend <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Freighter</a>, the official Stellar browser extension. It's secure, easy to use, and integrates seamlessly with BountyBoard.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Is there a fee for using BountyBoard?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>No fees! 100% of your bounty goes to the solver. We cover transaction costs as part of our service.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Can multiple people claim the same bounty?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>Yes, multiple people can claim it, but only the first solver to get their PR merged receives the reward.</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Still have questions?
                  </h3>
                  <p style={{ lineHeight: '1.6' }}>Check out our GitHub repo or reach out to us on Twitter @BountyBoard.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
