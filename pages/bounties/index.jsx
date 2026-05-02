'use client';

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { SkeletonCard } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function BountyBoard() {
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

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
    let result = bounties;

    if (filter !== 'all') {
      result = result.filter((b) => b.status === filter);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.repoOwner?.toLowerCase().includes(q) ||
          b.repoName?.toLowerCase().includes(q)
      );
    }

    if (sort === 'highest') {
      result.sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));
    } else if (sort === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [bounties, filter, search, sort]);

  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };


  return (
    <>
      <Head>
        <title>Browse Bounties — BountyBoard</title>
        <meta name="description" content="Browse open GitHub bounties with USDC rewards" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      <div className="page">
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">Browse Bounties</h1>
            <p className="page-subtitle">Find issues to solve and earn USDC rewards</p>
          </div>

          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search bounties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ flex: 1, minWidth: '200px' }}
            />
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="form-input">
              <option value="newest">Newest</option>
              <option value="highest">Highest Reward</option>
            </select>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', overflowX: 'auto' }}>
            {['all', 'open', 'claimed', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn btn-ghost btn-sm`}
                style={{
                  borderBottom: filter === f ? '2px solid var(--accent)' : 'none',
                  color: filter === f ? 'var(--accent)' : 'var(--text-secondary)',
                  borderRadius: '0',
                  padding: '8px 0',
                  whiteSpace: 'nowrap',
                }}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-2">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No bounties found"
              description={
                search
                  ? `No bounties match "${search}"`
                  : `No ${filter !== 'all' ? filter : ''} bounties right now`
              }
              action={
                <Link href="/bounties/create" className="btn btn-primary">
                  Post the First Bounty
                </Link>
              }
            />
          ) : (
            <div className="grid grid-2">
              {filtered.map((bounty) => (
                <Link key={bounty.id} href={`/bounties/${bounty.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                      <span className={`badge badge-${bounty.status === 'completed' ? 'success' : bounty.status === 'claimed' ? 'info' : 'success'}`}>
                        {bounty.status}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {timeAgo(bounty.createdAt)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', flex: 1 }}>
                        {bounty.title}
                      </h3>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#3b82f6', whiteSpace: 'nowrap' }}>
                        ${bounty.amount}
                      </div>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      {bounty.repoOwner}/{bounty.repoName}#{bounty.issueNumber}
                    </p>

                    {bounty.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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
          )}
        </div>
      </div>
    </>
  );
}
