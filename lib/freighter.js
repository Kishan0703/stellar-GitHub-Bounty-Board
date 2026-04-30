import { isConnected, getPublicKey } from '@stellar/freighter-api';

export async function connectWallet() {
  try {
    const connectedStatus = await isConnected();
    
    // Handle various return shapes of isConnected():
    // 1. boolean
    // 2. { isConnected: boolean } (newer APIs)
    // 3. window.freighter object itself (v1.7.1 returns this)
    let connected = false;
    if (typeof connectedStatus === 'boolean') {
      connected = connectedStatus;
    } else if (typeof connectedStatus === 'object' && connectedStatus !== null) {
      if ('isConnected' in connectedStatus) {
        connected = connectedStatus.isConnected;
      } else {
        connected = true; // It's likely the window.freighter object
      }
    }

    if (!connected) {
      alert('Please install Freighter wallet extension.\n\nhttps://freighter.app');
      return null;
    }

    const publicKeyRes = await getPublicKey();
    
    // Handle both old API (string) and new API { publicKey: string } shapes
    let publicKey = null;
    if (typeof publicKeyRes === 'string') {
      publicKey = publicKeyRes;
    } else if (typeof publicKeyRes === 'object' && publicKeyRes !== null) {
      if ('publicKey' in publicKeyRes) {
        publicKey = publicKeyRes.publicKey;
      }
    }

    if (!publicKey) {
      throw new Error('Failed to retrieve public key');
    }

    return publicKey;
  } catch (e) {
    console.error('Freighter error:', e);
    alert('Freighter error: ' + e.message);
    return null;
  }
}

export function truncateWallet(wallet) {
  if (!wallet || wallet.length < 10) return wallet || '';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}
