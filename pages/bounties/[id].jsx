import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { connectWallet, truncateWallet } from '../../lib/freighter';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
const TRUSTLINE_ACK_KEY = 'stellar_bounty_trustline_ack_v1';
const DEMO_PUBLIC_KEY = 'GBOBF74KOXPSYUOLNZAIWLT5LT2FUDPDIPTPNHVYXGX2EDMSNDBHEH4U';

function maskPublicKey(key) {
  if (!key || key.length < 16) return key;
  return `${key.slice(0, 6)}...${key.slice(-6)}`;
}

export default function BountyDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [bounty, setBounty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [platformWallet, setPlatformWallet] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [funding, setFunding] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [fundSuccess, setFundSuccess] = useState(false);
  const [showTrustlineNotice, setShowTrustlineNotice] = useState(false);
  const [trustlineChecked, setTrustlineChecked] = useState(false);
  const [trustlineAcknowledged, setTrustlineAcknowledged] = useState(false);

  useEffect(() => {
    if (id) fetchBounty();
  }, [id]);

  useEffect(() => {
    fetchPlatformWallet();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(TRUSTLINE_ACK_KEY) === 'true';
    setTrustlineAcknowledged(stored);
  }, []);

  async function fetchBounty() {
    try {
      const res = await fetch(`${API_BASE}/bounty/${id}`);
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

  async function fetchPlatformWallet() {
    try {
      const res = await fetch(`${API_BASE}/platform-wallet`);
      if (res.ok) {
        const data = await res.json();
        setPlatformWallet(data.publicKey);
      }
    } catch (err) {
      console.error('Failed to fetch platform wallet:', err);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const publicKey = await connectWallet();
      if (publicKey) setWallet(publicKey);
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
      const res = await fetch(`${API_BASE}/bounty/claim`, {
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

  function openTrustlineNotice() {
    setTrustlineChecked(false);
    setShowTrustlineNotice(true);
  }

  async function handleClaimClick() {
    if (!trustlineAcknowledged) {
      openTrustlineNotice();
      return;
    }

    await handleClaim();
  }

  async function handleTrustlineConfirm() {
    if (!trustlineChecked) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TRUSTLINE_ACK_KEY, 'true');
    }
    setTrustlineAcknowledged(true);
    setShowTrustlineNotice(false);
    await handleClaim();
  }

  async function handleMarkFunded() {
    setFunding(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/bounty/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bountyId: id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark bounty funded');
      }

      setFundSuccess(true);
      await fetchBounty();
    } catch (err) {
      setError(err.message);
    } finally {
      setFunding(false);
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

              {bounty.completedTxHash && (
                <div className="detail-item">
                  <div className="label">Payment Transaction</div>
                  <div className="value mono">
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${bounty.completedTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-cyan)' }}
                    >
                      {truncateWallet(bounty.completedTxHash)} ↗
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

            {fundSuccess && (
              <div className="alert alert-success">
                ✅ Bounty marked funded. Solvers can now claim it.
              </div>
            )}

            {/* Status-specific actions */}
            {bounty.status === 'open' && (
              <div className="claim-section">
                <h3>💰 Fund This Bounty</h3>
                <p>
                  Send {bounty.amount} USDC on Stellar testnet to the platform wallet configured in the backend,
                  then mark this bounty funded so solvers can claim it.
                </p>
                {platformWallet && (
                  <p className="funding-address">
                    Platform wallet:{' '}
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${platformWallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {truncateWallet(platformWallet)} ↗
                    </a>
                  </p>
                )}
                <button
                  className="btn btn-primary"
                  onClick={handleMarkFunded}
                  disabled={funding}
                  type="button"
                >
                  {funding ? (
                    <>
                      <span className="spinner" />
                      Marking Funded...
                    </>
                  ) : (
                    'Mark Funded'
                  )}
                </button>
              </div>
            )}

            {bounty.status === 'funded' && (
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
                      className="btn btn-help"
                      onClick={openTrustlineNotice}
                      type="button"
                      aria-label="Claim trustline help"
                      title="Claim trustline help"
                    >
                      ?
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleClaimClick}
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
                {bounty.completedTxHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${bounty.completedTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ marginTop: '1rem' }}
                  >
                    View Payment on Stellar Expert ↗
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showTrustlineNotice && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="trustline-title">
          <div className="modal-card">
            <h3 id="trustline-title">Before claiming</h3>
            <p>
              ⚠️ Before claiming, ensure your Freighter wallet has a USDC trustline set up on Stellar testnet.
            </p>
            <p>
              For demo/testing, use this pre-configured test wallet:
              <br />
              Public Key: <span className="modal-mono">{maskPublicKey(DEMO_PUBLIC_KEY)}</span>
            </p>
            <p>To import in Freighter:</p>
            <ol className="modal-list">
              <li>Open Freighter → Add Account → Import</li>
              <li>Enter the test secret key (provided in submission notes)</li>
              <li>Switch network to Testnet in Freighter settings</li>
            </ol>
            <label className="modal-check">
              <input
                type="checkbox"
                checked={trustlineChecked}
                onChange={(e) => setTrustlineChecked(e.target.checked)}
              />
              <span>I have USDC trustline set up</span>
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowTrustlineNotice(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTrustlineConfirm}
                disabled={!trustlineChecked || claiming}
              >
                Continue to Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
