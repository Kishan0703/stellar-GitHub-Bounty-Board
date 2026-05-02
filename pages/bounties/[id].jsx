'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { SkeletonCard, SkeletonText } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { showSuccessToast, showErrorToast } from '../../lib/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function truncateWallet(wallet) {
  if (!wallet || wallet.length < 10) return wallet || '';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BountyDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [bounty, setBounty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [connecting, setConnecting] = useState(false);
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
        showErrorToast('Bounty not found');
      }
    } catch (err) {
      showErrorToast('Failed to load bounty');
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
        showErrorToast('Freighter extension not found. Install it from https://freighter.app');
        return;
      }

      const { networkPassphrase } = await freighter.getNetworkDetails();
      if (networkPassphrase !== 'Test SDF Network ; September 2015') {
        showErrorToast('Please switch Freighter to Testnet');
        return;
      }

      await freighter.setAllowed();
      const publicKeyRes = await freighter.getPublicKey();
      const publicKey = typeof publicKeyRes === 'string' ? publicKeyRes : publicKeyRes?.publicKey;
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

  async function handleClaim() {
    if (!wallet) {
      showErrorToast('Please connect your wallet first');
      return;
    }

    setClaiming(true);
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
      showSuccessToast('Bounty claimed! Now solve the issue and submit a PR.');
      await fetchBounty();
    } catch (err) {
      showErrorToast(err.message);
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... — BountyBoard</title>
        </Head>
        <Navbar />
        <div className="page">
          <div className="container">
            <SkeletonCard />
            <div style={{ marginTop: '24px' }}>
              <SkeletonText />
              <SkeletonText width="80%" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!bounty) {
    return (
      <>
        <Head>
          <title>Not Found — BountyBoard</title>
        </Head>
        <Navbar />
        <div className="page">
          <div className="container">
            <EmptyState
              icon="😕"
              title="Bounty Not Found"
              description="This bounty doesn't exist or has been removed"
              action={<Link href="/bounties" className="btn btn-primary">Back to Bounties</Link>}
            />
          </div>
        </div>
      </>
    );
  }

  const statusColor = {
    open: 'badge-success',
    claimed: 'badge-info',
    completed: 'badge-success',
  }[bounty.status] || 'badge-info';

  return (
    <>
      <Head>
        <title>{bounty.title} — BountyBoard</title>
        <meta name="description" content={`${bounty.amount} USDC bounty: ${bounty.title}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar walletAddress={wallet} connecting={connecting} onConnect={handleConnect} />

      <div className="page">
        <div className="container" style={{ maxWidth: '900px' }}>
          {/* Back Link */}
          <Link href="/bounties" style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: '600', marginBottom: '24px', display: 'inline-block' }}>
            ← Back to Bounties
          </Link>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '32px', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span className={`badge ${statusColor}`}>{bounty.status}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showSuccessToast('Link copied!');
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  🔗
                </button>
              </div>
              <h1 className="page-title" style={{ fontSize: '32px', marginBottom: '12px' }}>{bounty.title}</h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {bounty.repoOwner}/{bounty.repoName}#{bounty.issueNumber}
              </p>
            </div>

            <div className="card" style={{ textAlign: 'center', padding: '24px', minWidth: '180px' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', color: '#3b82f6', marginBottom: '8px' }}>
                ${bounty.amount}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                USDC Reward
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
            {/* Main Content */}
            <div>
              {/* Description */}
              {bounty.description && (
                <div className="card" style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Description
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    {bounty.description}
                  </p>
                </div>
              )}

              {/* Info Grid */}
              <div className="card" style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Details
                </h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>GitHub Issue</div>
                    <a
                      href={bounty.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', fontWeight: '500' }}
                    >
                      Open in GitHub ↗
                    </a>
                  </div>

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Poster Wallet</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {truncateWallet(bounty.posterWallet)}
                    </div>
                  </div>

                  {bounty.solverWallet && (
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Solver Wallet</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {truncateWallet(bounty.solverWallet)}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Created</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {formatDate(bounty.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="card">
                <h3 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '24px' }}>
                  Timeline
                </h3>
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div className="timeline-label">Created</div>
                      <div className="timeline-value">{formatDate(bounty.createdAt)}</div>
                    </div>
                  </div>

                  {bounty.claimedAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-label">Claimed</div>
                        <div className="timeline-value">{formatDate(bounty.claimedAt)}</div>
                      </div>
                    </div>
                  )}

                  {bounty.completedAt && (
                    <div className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="timeline-content">
                        <div className="timeline-label">Completed</div>
                        <div className="timeline-value">{formatDate(bounty.completedAt)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              {bounty.status === 'open' && (
                <div className="card" style={{ marginBottom: '16px' }}>
                  {!wallet ? (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <button
                          onClick={handleConnect}
                          disabled={connecting}
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                        >
                          {connecting ? '🔄 Connecting...' : '🔗 Connect Wallet'}
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                        Connect your Stellar wallet to claim this bounty
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: '16px' }}>
                        <button
                          onClick={handleClaim}
                          disabled={claiming}
                          className="btn btn-success"
                          style={{ width: '100%' }}
                        >
                          {claiming ? '⏳ Claiming...' : '🎯 Claim Bounty'}
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                        Click to claim this bounty and start working on it
                      </p>
                    </>
                  )}
                </div>
              )}

              {bounty.status === 'claimed' && (
                <div className="card" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>⏳ In Progress</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    Solver is working on this bounty. Your PR will trigger automatic payment when merged.
                  </p>
                </div>
              )}

              {bounty.status === 'completed' && (
                <div className="card" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#10b981' }}>✓ Complete</div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    This bounty has been completed and funds have been released.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
