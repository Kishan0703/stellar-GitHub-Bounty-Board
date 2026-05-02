import Link from 'next/link';
import { useState } from 'react';

export default function Navbar({ walletAddress = null, connecting = false, onConnect = null }) {
  const truncateWallet = (wallet) => {
    if (!wallet || wallet.length < 10) return wallet || '';
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo">
        ⚡ BountyBoard
      </Link>

      <ul className="navbar-links">
        <li>
          <Link href="/bounties" className="navbar-link">
            Browse
          </Link>
        </li>
        <li>
          <Link href="/bounties/create" className="navbar-link">
            Post
          </Link>
        </li>
        <li>
          <Link href="/docs" className="navbar-link">
            Docs
          </Link>
        </li>
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {walletAddress ? (
          <div className="wallet-status">
            <div className="wallet-dot"></div>
            <span>{truncateWallet(walletAddress)}</span>
          </div>
        ) : null}
        <div className="testnet-badge">Testnet</div>
        {onConnect && !walletAddress && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onConnect}
            disabled={connecting}
          >
            {connecting ? '🔄 Connecting...' : '🔗 Connect'}
          </button>
        )}
      </div>
    </nav>
  );
}
