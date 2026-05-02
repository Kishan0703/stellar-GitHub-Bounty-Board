import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function BountyBoard() {
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBounties();
  }, []);

  async function fetchBounties() {
    try {
      const res = await fetch(`${API_URL}/bounties`);
      if (res.ok) {
        const data = await res.json();
        setBounties(data);
      }
    } catch (err) {
      console.error('Failed to fetch bounties:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return bounties;
    return bounties.filter((b) => b.status === filter);
  }, [bounties, filter]);

  const stats = useMemo(() => {
    const total = bounties.length;
    const open = bounties.filter((b) => b.status === 'open').length;
    const claimed = bounties.filter((b) => b.status === 'claimed').length;
    const completed = bounties.filter((b) => b.status === 'completed').length;
    const totalValue = bounties
      .filter((b) => b.status === 'open')
      .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    return { total, open, claimed, completed, totalValue };
  }, [bounties]);

  return (
    <>
      <Head>
        <title>Bounty Board — Stellar GitHub Bounties</title>
        <meta
          name="description"
          content="Browse open GitHub bounties with USDC rewards locked in Stellar escrow. Claim bounties, submit PRs, and get paid automatically."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏆</text></svg>" />
      </Head>

      {/* Navigation */}
      <nav className="nav-bar">
        <Link href="/bounties" className="logo">
          🏆 <span>Stellar Bounties</span>
        </Link>
        <div className="nav-links">
          <Link href="/bounties" className="active">Browse</Link>
          <Link href="/bounties/create">Post Bounty</Link>
        </div>
      </nav>

      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <div className="subtitle-badge">⚡ Powered by Stellar &amp; Trustless Work</div>
          <h1>GitHub Bounty Board</h1>
          <p>
            Trustless bounties for open source. Post issues with USDC rewards, solve them, and get paid automatically when your PR merges.
          </p>
          <div className="header-actions">
            <Link href="/bounties/create" className="btn btn-primary btn-lg">
              🚀 Post a Bounty
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Bounties</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.open}</div>
            <div className="stat-label">Open</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.claimed}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">${stats.totalValue.toFixed(0)}</div>
            <div className="stat-label">Available USDC</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          {['all', 'open', 'claimed', 'completed'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="empty-state">
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem' }}>Loading bounties...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>No bounties found</h3>
            <p>
              {filter === 'all'
                ? 'Be the first to post a bounty and reward open source contributors!'
                : `No ${filter} bounties right now.`}
            </p>
            <Link href="/bounties/create" className="btn btn-primary">
              Post the First Bounty
            </Link>
          </div>
        ) : (
          <div className="bounty-grid">
            {filtered.map((bounty) => (
              <Link
                href={`/bounties/${bounty.id}`}
                key={bounty.id}
                style={{ textDecoration: 'none' }}
              >
                <div className="bounty-card" id={`bounty-${bounty.id}`}>
                  <div className="card-top">
                    <span className={`status-badge ${bounty.status}`}>
                      {bounty.status}
                    </span>
                    <div className="amount">
                      {bounty.amount}
                      <span className="currency">{bounty.currency || 'USDC'}</span>
                    </div>
                  </div>
                  <h3>{bounty.title}</h3>
                  {bounty.description && (
                    <p className="description">{bounty.description}</p>
                  )}
                  <div className="card-meta">
                    <span
                      className="github-link"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(bounty.issueUrl, '_blank');
                      }}
                    >
                      <GitHubIcon />
                      {bounty.repoOwner}/{bounty.repoName}#{bounty.issueNumber}
                    </span>
                    <span className="view-btn">View Details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
