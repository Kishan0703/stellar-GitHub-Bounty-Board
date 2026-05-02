'use client';

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const WEBHOOK_PAYLOAD_URL = 'https://stellar-bug-bounty-production.up.railway.app/webhook/github';

function truncateWallet(wallet) {
  if (!wallet || wallet.length < 10) return wallet || '';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export default function CreateBounty() {
  const [step, setStep] = useState(1);
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    issueUrl: '',
    webhookSecret: '',
    amount: '',
    title: '',
    description: '',
  });

  const [errors, setErrors] = useState({});

  async function handleConnect() {
    setConnecting(true);
    try {
      const freighter = await import('@stellar/freighter-api');
      const connected = await freighter.isConnected();
      if (!connected) {
        showErrorToast('Freighter extension not found. Install it from https://freighter.app');
        return;
      }

      const { networkPassphrase } = await freighter.getNetworkDetails();
      if (networkPassphrase !== 'Test SDF Network ; September 2015') {
        showErrorToast('Please switch Freighter to Testnet');
        return;
      }

      await freighter.setAllowed();
      const publicKey = await freighter.getPublicKey();
      if (publicKey) {
        setWallet(publicKey);
        showSuccessToast('Wallet connected!');
      }
    } catch (e) {
      showErrorToast(`Freighter error: ${e.message}`);
    } finally {
      setConnecting(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  }

  function validateStep(stepNum) {
    const newErrors = {};

    if (stepNum === 1) {
      if (!form.issueUrl) newErrors.issueUrl = 'GitHub issue URL is required';
      else if (!form.issueUrl.includes('github.com')) newErrors.issueUrl = 'Must be a valid GitHub URL';
    }

    if (stepNum === 2) {
      if (!form.title) newErrors.title = 'Title is required';
      if (!form.amount) newErrors.amount = 'Amount is required';
      else if (parseFloat(form.amount) < 1) newErrors.amount = 'Amount must be at least 1 USDC';
    }

    if (stepNum === 3) {
      if (!form.webhookSecret) newErrors.webhookSecret = 'Webhook secret is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function goToStep(stepNum) {
    if (validateStep(step)) {
      setStep(stepNum);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateStep(3)) return;
    if (!wallet) {
      showErrorToast('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bounty/create`, {
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
      showSuccessToast('Bounty created successfully!');
      setTimeout(() => {
        window.location.href = '/bounties';
      }, 2000);
    } catch (err) {
      showErrorToast(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <>
        <Head>
          <title>Bounty Created — BountyBoard</title>
        </Head>
        <Navbar walletAddress={wallet} />
        <div className="page">
          <div className="container">
            <div style={{ maxWidth: '500px', margin: '100px auto', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '24px' }}>✅</div>
              <h1 className="page-title">Bounty Created!</h1>
              <p className="page-subtitle">Your bounty is now live and waiting for solvers</p>
              <div style={{ marginTop: '32px' }}>
                <Link href="/bounties" className="btn btn-primary">
                  View All Bounties
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Post a Bounty — BountyBoard</title>
        <meta name="description" content="Post a GitHub issue bounty with USDC rewards" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar walletAddress={wallet} connecting={connecting} onConnect={handleConnect} />

      <div className="page">
        <div className="container" style={{ maxWidth: '600px' }}>
          <div className="page-header">
            <h1 className="page-title">Post a Bounty</h1>
            <p className="page-subtitle">Reward developers to fix your GitHub issues</p>
          </div>

          {/* Wallet Connection */}
          {!wallet && (
            <div className="card" style={{ marginBottom: '32px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>🔗 Connect Wallet</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Connect your Stellar wallet to post a bounty</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleConnect} disabled={connecting}>
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          )}

          {wallet && (
            <div className="card" style={{ marginBottom: '32px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>✓ Wallet Connected</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{truncateWallet(wallet)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '4px',
                  background: s <= step ? 'var(--accent)' : 'var(--border-color)',
                  borderRadius: '2px',
                  transition: 'background-color 200ms ease',
                }}
              />
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: GitHub Issue */}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Step 1: GitHub Issue</h3>
                <div className="form-group">
                  <label className="form-label">GitHub Issue URL *</label>
                  <input
                    type="url"
                    name="issueUrl"
                    placeholder="https://github.com/owner/repo/issues/123"
                    value={form.issueUrl}
                    onChange={handleChange}
                    className="form-input"
                  />
                  {errors.issueUrl && <div style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>{errors.issueUrl}</div>}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Amount & Details */}
            {step === 2 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Step 2: Bounty Details</h3>

                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Fix authentication bug"
                    value={form.title}
                    onChange={handleChange}
                    className="form-input"
                  />
                  {errors.title && <div style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>{errors.title}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">Reward Amount (USDC) *</label>
                  <input
                    type="number"
                    name="amount"
                    placeholder="0"
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    className="form-input"
                  />
                  {errors.amount && <div style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>{errors.amount}</div>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {[10, 50, 100, 500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm({ ...form, amount: preset.toString() })}
                        className="btn btn-secondary btn-sm"
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    placeholder="Describe the issue and what solvers need to do..."
                    value={form.description}
                    onChange={handleChange}
                    className="form-textarea"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Webhook Setup */}
            {step === 3 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Step 3: Webhook Setup</h3>

                <div className="card" style={{ marginBottom: '24px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Payload URL</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={WEBHOOK_PAYLOAD_URL}
                      readOnly
                      className="form-input"
                      style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(WEBHOOK_PAYLOAD_URL);
                        showSuccessToast('Copied to clipboard');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Webhook Secret *</label>
                  <input
                    type="text"
                    name="webhookSecret"
                    placeholder="e.g., my-secret-123"
                    value={form.webhookSecret}
                    onChange={handleChange}
                    className="form-input"
                  />
                  {errors.webhookSecret && <div style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px' }}>{errors.webhookSecret}</div>}
                </div>

                <div className="card" style={{ marginTop: '24px', marginBottom: '24px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: '600', marginBottom: '4px' }}>⚠ Setup Instructions</div>
                  <ol style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '16px', lineHeight: '1.8' }}>
                    <li>Go to your repo → Settings → Webhooks → Add webhook</li>
                    <li>Paste the Payload URL above</li>
                    <li>Enter your webhook secret</li>
                    <li>Select "Let me select individual events" → Check "Pull Requests"</li>
                    <li>Click "Add webhook"</li>
                  </ol>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !wallet}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {loading ? '⏳ Creating...' : '🚀 Create Bounty'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
