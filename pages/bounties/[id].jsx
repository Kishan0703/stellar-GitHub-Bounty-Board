"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function truncateWallet(wallet) {
  if (!wallet || wallet.length < 10) return wallet || '';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export default function BountyDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [bounty, setBounty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  useEffect(() => {
    if (id) fetchBounty();
  }, [id]);

  async function fetchBounty() {
    try {
      const res = await fetch(`${API_URL}/bounty/${id}`);
      if (res.ok) {
        const data = await res.json();
        setBounty(data);
      } else {
        setError('Bounty not found');
      }
    } catch (err) {
      setError('Failed to load bounty');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const freighter = await import('@stellar/freighter-api');

      const connected = await freighter.isConnected();
      if (!connected) {
        alert('Freighter extension not found. Install it from https://freighter.app and refresh.');
        return;
      }

      const { networkPassphrase } = await freighter.getNetworkDetails();
      if (networkPassphrase !== 'Test SDF Network ; September 2015') {
        alert('Please switch Freighter to Testnet: Freighter → Settings → Network → Test SDF Network');
        return;
      }

      await freighter.setAllowed();
      const publicKeyRes = await freighter.getPublicKey();
      const publicKey = typeof publicKeyRes === 'string'
        ? publicKeyRes
        : publicKeyRes?.publicKey;
      if (publicKey) setWallet(publicKey);
    } catch (e) {
      alert(`Freighter error: ${e.message}`);
    } finally {
      setConnecting(false);
    }
  }

  async function handleClaim() {
    if (!wallet) {
      setError('Please connect your wallet first');
      return;
    }

    setClaiming(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/bounty/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId: id,
          solverWallet: wallet,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to claim bounty');
      }

      setClaimSuccess(true);
      await fetchBounty();
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... — Stellar Bounties</title>
        </Head>
        <nav className="nav-bar">
          <Link href="/bounties" className="logo">
            🏆 <span>Stellar Bounties</span>
          </Link>
          <div className="nav-links">
            <Link href="/bounties">Browse</Link>
            <Link href="/bounties/create">Post Bounty</Link>
          </div>
        </nav>
        <div className="page-container">
          <div className="empty-state">
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem' }}>Loading bounty...</p>
          </div>
        </div>
      </>
    );
  }

  if (!bounty) {
    return (
      <>
        <Head>
          <title>Not Found — Stellar Bounties</title>
        </Head>
        <nav className="nav-bar">
          <Link href="/bounties" className="logo">
            🏆 <span>Stellar Bounties</span>
          </Link>
          <div className="nav-links">
            <Link href="/bounties">Browse</Link>
            <Link href="/bounties/create">Post Bounty</Link>
          </div>
        </nav>
        <div className="page-container">
          <div className="empty-state">
            <div className="icon">😕</div>
            <h3>Bounty Not Found</h3>
            <p>This bounty doesn&apos;t exist or has been removed.</p>
            <Link href="/bounties" className="btn btn-primary">
              Back to Bounty Board
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{bounty.title} — Stellar Bounties</title>
        <meta
          name="description"
          content={`${bounty.amount} USDC bounty: ${bounty.title}. ${bounty.description || 'Claim this bounty and earn USDC by solving this GitHub issue.'}`}
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
          <Link href="/bounties/create">Post Bounty</Link>
        </div>
      </nav>

      <div className="page-container">
        <Link href="/bounties" className="back-link">
          ← Back to Bounty Board
        </Link>

        <div className="detail-container">
          <div className="detail-card">
            {/* Header */}
            <div className="detail-header">
              <div>
                <span className={`status-badge ${bounty.status}`} style={{ marginBottom: '1rem', display: 'inline-flex' }}>
                  {bounty.status}
                </span>
                <h1>{bounty.title}</h1>
              </div>
              <div className="detail-amount">
                {bounty.amount}
                <span className="currency"> {bounty.currency || 'USDC'}</span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="detail-grid">
              <div className="detail-item">
                <div className="label">GitHub Issue</div>
                <div className="value">
                  <a
                    href={bounty.issueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent-purple-light)' }}
                  >
                    {bounty.repoOwner}/{bounty.repoName}#{bounty.issueNumber} ↗
                  </a>
                </div>
              </div>

              <div className="detail-item">
                <div className="label">Poster Wallet</div>
                <div className="value mono">
                  {truncateWallet(bounty.posterWallet)}
                </div>
              </div>

              {bounty.solverWallet && (
                <div className="detail-item">
                  <div className="label">Solver Wallet</div>
                  <div className="value mono">
                    {truncateWallet(bounty.solverWallet)}
                  </div>
                </div>
              )}

              {bounty.escrowContractAddress && (
                <div className="detail-item">
                  <div className="label">Escrow Contract</div>
                  <div className="value mono">
                    <a
                      href={`https://stellar.expert/explorer/testnet/contract/${bounty.escrowContractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-cyan)' }}
                    >
                      {truncateWallet(bounty.escrowContractAddress)} ↗
                    </a>
                  </div>
                </div>
              )}

              <div className="detail-item">
                <div className="label">Created</div>
                <div className="value">
                  {bounty.createdAt ? new Date(bounty.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : 'N/A'}
                </div>
              </div>
            </div>

            {/* Description */}
            {bounty.description && (
              <div className="detail-description">
                <h3>Description</h3>
                <p>{bounty.description}</p>
              </div>
            )}

            {/* Alerts */}
            {error && (
              <div className="alert alert-error">⚠️ {error}</div>
            )}

            {claimSuccess && (
              <div className="alert alert-success">
                ✅ Bounty claimed successfully! Submit your PR and reference this issue to receive payment.
              </div>
            )}

            {/* Status-specific actions */}
            {bounty.status === 'open' && (
              <div className="claim-section">
                <h3>🎯 Claim This Bounty</h3>
                <p>
                  Connect your Freighter wallet and claim this bounty. Once claimed, submit a PR that
                  references this issue (e.g., &quot;Fixes #{bounty.issueNumber}&quot;). When your PR is
                  merged, {bounty.amount} USDC will be released to your wallet automatically.
                </p>

                {!wallet ? (
                  <button
                    className="btn btn-wallet"
                    onClick={handleConnect}
                    disabled={connecting}
                    type="button"
                  >
                    {connecting ? (
                      <>
                        <span className="spinner" />
                        Connecting...
                      </>
                    ) : (
                      '🔗 Connect Freighter Wallet'
                    )}
                  </button>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent-green)', marginBottom: '1rem' }}>
                      Connected: {truncateWallet(wallet)}
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={handleClaim}
                      disabled={claiming}
                      type="button"
                    >
                      {claiming ? (
                        <>
                          <span className="spinner" />
                          Claiming...
                        </>
                      ) : (
                        `⚡ Claim ${bounty.amount} USDC Bounty`
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {bounty.status === 'claimed' && (
              <div className="status-message awaiting">
                <div className="icon">⏳</div>
                <h3>Awaiting PR Merge</h3>
                <p style={{ fontWeight: 400, marginTop: '0.5rem' }}>
                  This bounty has been claimed by {truncateWallet(bounty.solverWallet)}.
                  When their PR referencing issue #{bounty.issueNumber} is merged,
                  funds will be released automatically.
                </p>
              </div>
            )}

            {bounty.status === 'completed' && (
              <div className="status-message completed">
                <div className="icon">✅</div>
                <h3>Completed!</h3>
                <p style={{ fontWeight: 400, marginTop: '0.5rem' }}>
                  This bounty has been completed. {bounty.amount} USDC was released
                  to {truncateWallet(bounty.solverWallet)}.
                </p>
                {bounty.escrowContractAddress && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${bounty.escrowContractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ marginTop: '1rem' }}
                  >
                    View on Stellar Explorer ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
