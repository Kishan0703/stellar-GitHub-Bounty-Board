// Verify endpoint names against https://docs.trustlesswork.com
// Using testnet dev API: https://dev.api.trustlesswork.com

const axios = require('axios');

const api = axios.create({
  baseURL: process.env.TRUSTLESSWORK_API_BASE || 'https://dev.api.trustlesswork.com',
  headers: {
    'Authorization': `Bearer ${process.env.TRUSTLESSWORK_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Initialize a single-release escrow for a bounty.
 * Endpoint: POST /deployer/single-release
 *
 * @param {Object} params
 * @param {string} params.posterWallet - Depositor's Stellar public key
 * @param {string} params.solverWallet - Service provider's Stellar public key (empty string if unknown)
 * @param {string} params.amount - Bounty amount as string
 * @param {string} params.title - Bounty title
 * @param {string} params.description - Bounty description
 * @returns {Object} { escrowId, contractAddress }
 */
async function initializeEscrow({ posterWallet, solverWallet, amount, title, description }) {
  try {
    const response = await api.post('/deployer/single-release', {
      approver: process.env.PLATFORM_WALLET_PUBLIC,
      serviceProvider: solverWallet || '',
      depositor: posterWallet,
      amount: amount,
      currency: 'USDC',
      title: title || 'GitHub Bounty',
      description: description || '',
      platformAddress: process.env.PLATFORM_WALLET_PUBLIC,
      platformFee: '1',
      milestones: [
        {
          description: title || 'Complete bounty task',
          status: 'pending',
          approved_flag: false,
        },
      ],
    });

    return {
      escrowId: response.data?.escrowId || response.data?.id,
      contractAddress: response.data?.contractAddress || response.data?.contract_address,
      unsignedXDR: response.data?.unsignedXDR || response.data?.unsigned_xdr,
    };
  } catch (error) {
    console.error('Failed to initialize escrow:', error.response?.data || error.message);
    throw new Error(`Escrow initialization failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Update the service provider (solver) on an existing escrow.
 * Endpoint: PUT /escrow/single-release/update-escrow
 *
 * @param {string} escrowId - The escrow contract ID
 * @param {string} solverWallet - New service provider's Stellar public key
 */
async function setServiceProvider(escrowId, solverWallet) {
  try {
    const response = await api.put('/escrow/single-release/update-escrow', {
      contractId: escrowId,
      serviceProvider: solverWallet,
      signer: process.env.PLATFORM_WALLET_PUBLIC,
    });

    return {
      success: true,
      unsignedXDR: response.data?.unsignedXDR || response.data?.unsigned_xdr,
    };
  } catch (error) {
    console.error('Failed to set service provider:', error.response?.data || error.message);
    throw new Error(`Set service provider failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Release escrow funds to the service provider.
 * Endpoint: POST /escrow/single-release/release-funds
 *
 * @param {string} escrowId - The escrow contract ID
 */
async function releaseEscrow(escrowId) {
  try {
    const response = await api.post('/escrow/single-release/release-funds', {
      contractId: escrowId,
      signer: process.env.PLATFORM_WALLET_PUBLIC,
    });

    return {
      success: true,
      unsignedXDR: response.data?.unsignedXDR || response.data?.unsigned_xdr,
    };
  } catch (error) {
    console.error('Failed to release escrow:', error.response?.data || error.message);
    throw new Error(`Escrow release failed: ${error.response?.data?.message || error.message}`);
  }
}

module.exports = {
  initializeEscrow,
  setServiceProvider,
  releaseEscrow,
};
