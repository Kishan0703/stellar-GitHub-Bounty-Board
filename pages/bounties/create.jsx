import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { connectWallet, truncateWallet } from '../../lib/freighter';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

function generateWebhookSecret() {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function CreateBounty() {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    issueUrl: '',
    webhookSecret: '',
    amount: '',
    title: '',
    description: '',
  });

  async function handleConnect() {
    setConnecting(true);
    try {
      const publicKey = await connectWallet();
      if (publicKey) {
        setWallet(publicKey);
      }
    } finally {
      setConnecting(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!wallet) {
      setError('Please connect your Freighter wallet first.');
      return;
    }

    if (!form.issueUrl || !form.amount || !form.title) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!form.webhookSecret || form.webhookSecret.trim().length < 8) {
      setError('Please enter a GitHub webhook secret with at least 8 characters.');
      return;
    }

    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount < 1) {
      setError('Bounty amount must be at least 1 USDC.');
      return;
    }

    // Validate GitHub URL format
    const urlPattern = /github\.com\/[^/]+\/[^/]+\/issues\/\d+/;
    if (!urlPattern.test(form.issueUrl)) {
      setError('Please enter a valid GitHub issue URL (e.g., https://github.com/owner/repo/issues/123)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bounty/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueUrl: form.issueUrl,
          posterWallet: wallet,
          amount: form.amount,
          title: form.title,
          description: form.description,
          webhookSecret: form.webhookSecret,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create bounty');
      }

      setSuccess(true);
      setForm({ issueUrl: '', webhookSecret: '', amount: '', title: '', description: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Post a Bounty — Stellar GitHub Bounties</title>
        <meta
          name="description"
          content="Post a GitHub issue bounty with USDC rewards locked in Stellar escrow. Reward open source contributors for solving your issues."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Navigation */}
      <nav className="nav-bar">
        <Link href="/bounties" className="logo">
          🏆 <span>Stellar Bounties</span>
        </Link>
        <div className="nav-links">
          <Link href="/bounties">Browse</Link>
          <Link href="/bounties/create" className="active">Post Bounty</Link>
        </div>
      </nav>

      <div className="page-container">
        <div className="page-header">
          <div className="subtitle-badge">💰 Create New Bounty</div>
          <h1>Post a Bounty</h1>
          <p>
            Attach a USDC reward to any GitHub issue. Funds are locked in escrow and released automatically when a solver&apos;s PR is merged.
          </p>
        </div>

        <div className="form-container">
          {/* Wallet Connection */}
          <div className="wallet-section">
            <div className="wallet-info">
              <div className="wallet-label">Poster Wallet</div>
              {wallet ? (
                <div className="wallet-address">{truncateWallet(wallet)}</div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Connect to deposit bounty funds
                </div>
              )}
            </div>
            <button
              className={`btn btn-wallet ${wallet ? 'connected' : ''}`}
              onClick={handleConnect}
              disabled={connecting || !!wallet}
              type="button"
            >
              {connecting ? (
                <>
                  <span className="spinner" />
                  Connecting...
                </>
              ) : wallet ? (
                '✓ Connected'
              ) : (
                '🔗 Connect Freighter'
              )}
            </button>
          </div>

          {/* Alerts */}
          {success && (
            <div className="alert alert-success">
              ✅ Bounty created successfully!{' '}
              <Link href="/bounties" style={{ fontWeight: 600, textDecoration: 'underline' }}>
                View Bounty Board →
              </Link>
            </div>
          )}

          {error && (
            <div className="alert alert-error">⚠️ {error}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-help">
              <div>
                <strong>Webhook endpoint</strong>
                <span>{API_BASE}/webhook/github</span>
              </div>
              <p>
                Add this URL to the GitHub repository webhook settings, select pull request events, and use the same secret you enter below.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="issueUrl">
                GitHub Issue URL <span className="required">*</span>
              </label>
              <input
                id="issueUrl"
                name="issueUrl"
                type="url"
                className="form-input"
                placeholder="https://github.com/owner/repo/issues/123"
                value={form.issueUrl}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="webhookSecret">
                GitHub Webhook Secret <span className="required">*</span>
              </label>
              <div className="input-action-row">
                <input
                  id="webhookSecret"
                  name="webhookSecret"
                  type="text"
                  className="form-input"
                  placeholder="Use the same secret in GitHub webhook settings"
                  value={form.webhookSecret}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setForm({ ...form, webhookSecret: generateWebhookSecret() });
                    setError('');
                  }}
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="title">
                Bounty Title <span className="required">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                className="form-input"
                placeholder="Fix the login bug"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">
                Bounty Amount (USDC) <span className="required">*</span>
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                className="form-input"
                placeholder="10"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                placeholder="Provide additional context about the bounty requirements, acceptance criteria, etc."
                value={form.description}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || !wallet}
              style={{ width: '100%' }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Creating Bounty...
                </>
              ) : (
                '🚀 Post Bounty'
              )}
            </button>
          </form>
        </div>

        <Link href="/bounties" className="back-link" style={{ display: 'block', textAlign: 'center', marginTop: '2rem' }}>
          ← Back to Bounty Board
        </Link>
      </div>
    </>
  );
}
