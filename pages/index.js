'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { SkeletonCard } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Landing() {
  const [bounties, setBounties] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBounties();
  }, []);

  async function fetchBounties() {
    try {
      const res = await fetch(`${API_URL}/bounties`);
      if (res.ok) {
        const data = await res.json();
        setBounties(data);

        const total = data.length;
        const open = data.filter((b) => b.status === 'open').length;
        const totalValue = data
          .filter((b) => b.status === 'open')
          .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);

        setStats({
          total,
          open,
          totalValue,
          solvers: new Set(data.map((b) => b.solverWallet).filter(Boolean)).size,
        });
      }
    } catch (err) {
      console.error('Failed to fetch bounties:', err);
    } finally {
      setLoading(false);
    }
  }

  const recentBounties = bounties.filter((b) => b.status === 'open').slice(0, 3);

  return (
    <>
      <Head>
        <title>BountyBoard — Get Paid to Fix Bugs. In Crypto.</title>
        <meta name="description" content="Trustless bounties for open source. Post issues with USDC rewards, solve them, and get paid automatically when your PR merges." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      <div className="page">
        <div className="container">
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '80px', paddingTop: '40px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 className="page-title" style={{ fontSize: '48px', marginBottom: '16px' }}>
                Get Paid to Fix Bugs. In Crypto.
              </h1>
              <p className="page-subtitle" style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto' }}>
                Post GitHub issues with USDC rewards. Solvers claim bounties, submit PRs, and get paid automatically when merged.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '32px' }}>
              <Link href="/bounties/create" className="btn btn-primary btn-lg">
                🚀 Post a Bounty
              </Link>
              <Link href="/bounties" className="btn btn-secondary btn-lg">
                💼 Browse Bounties
              </Link>
            </div>
          </div>

          {/* Stats */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '80px' }}>
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '80px' }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#3b82f6', marginBottom: '8px' }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Total Bounties
                </div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981', marginBottom: '8px' }}>
                  {stats.open}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Open Now
                </div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b', marginBottom: '8px' }}>
                  ${stats.totalValue.toFixed(0)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Available USDC
                </div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#06b6d4', marginBottom: '8px' }}>
                  {stats.solvers}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>
                  Active Solvers
                </div>
              </div>
            </div>
          ) : null}

          {/* How it works */}
          <div style={{ marginBottom: '80px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 className="page-title" style={{ fontSize: '32px' }}>How It Works</h2>
            </div>

            <div className="grid grid-3">
              <div className="card">
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>📝</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Post Issue</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Link your GitHub issue, set the USDC reward amount, and add a webhook to your repo.
                </p>
              </div>
              <div className="card">
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎯</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Claim Bounty</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Solvers connect their Stellar wallet and claim the bounty to start working.
                </p>
              </div>
              <div className="card">
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Get Paid</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Merge the PR, and USDC transfers automatically to the solver's wallet.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Bounties */}
          {recentBounties.length > 0 && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 className="page-title" style={{ fontSize: '32px' }}>Recent Opportunities</h2>
              </div>

              <div className="grid grid-2">
                {recentBounties.map((bounty) => (
                  <Link key={bounty.id} href={`/bounties/${bounty.id}`} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <span className="badge badge-success">{bounty.status}</span>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#3b82f6' }}>
                          ${bounty.amount}
                        </div>
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                        {bounty.title}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        {bounty.repoOwner}/{bounty.repoName}#{bounty.issueNumber}
                      </p>
                      {bounty.description && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {bounty.description}
                        </p>
                      )}
                      <div style={{ marginTop: 'auto', color: 'var(--accent)', fontSize: '13px', fontWeight: '600' }}>
                        View Details →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        <p style={{ marginBottom: '8px' }}>⚡ BountyBoard</p>
        <p>Trustless bounties powered by Stellar & Freighter</p>
      </footer>
    </>
  );
}
