import freighterApi from '@stellar/freighter-api';

/**
 * Connect to the Freighter wallet extension and retrieve the user's public key.
 * @returns {Promise<string|null>} The Stellar public key, or null if connection failed.
 */
export async function connectWallet() {
  try {
    const connected = await freighterApi.isConnected();
    if (!connected) {
      alert('Please install the Freighter wallet extension to continue.\n\nDownload: https://freighter.app');
      return null;
    }
    const { publicKey } = await freighterApi.getPublicKey();
    return publicKey;
  } catch (e) {
    console.error('Freighter error:', e);
    return null;
  }
}

/**
 * Truncate a Stellar wallet address for display.
 * @param {string} wallet - Full Stellar public key
 * @returns {string} Truncated format: "GABC12...XY89"
 */
export function truncateWallet(wallet) {
  if (!wallet || wallet.length < 10) return wallet || '';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}
