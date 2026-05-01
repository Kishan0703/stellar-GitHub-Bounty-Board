const StellarSdk = require('@stellar/stellar-sdk');

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_CODE = process.env.USDC_ASSET_CODE || 'USDC';
const USDC_ISSUER =
  process.env.USDC_ASSET_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);
const usdcAsset = new StellarSdk.Asset(USDC_CODE, USDC_ISSUER);

function getPlatformSecretKey() {
  const secret = process.env.PLATFORM_SECRET_KEY || process.env.PLATFORM_WALLET_SECRET;
  if (!secret) {
    throw new Error('Missing PLATFORM_SECRET_KEY in webhook-server/.env');
  }
  return secret;
}

function getPlatformKeypair() {
  return StellarSdk.Keypair.fromSecret(getPlatformSecretKey());
}

function getPlatformPublicKey() {
  return getPlatformKeypair().publicKey();
}

function formatStellarAmount(amount) {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid USDC amount: ${amount}`);
  }

  return value.toFixed(7).replace(/0+$/, '').replace(/\.$/, '');
}

function hasUsdcTrustline(account) {
  return account.balances.some(
    (balance) =>
      balance.asset_type !== 'native' &&
      balance.asset_code === USDC_CODE &&
      balance.asset_issuer === USDC_ISSUER
  );
}

async function sendUsdcToSolver({ solverWallet, amount, memo }) {
  if (!solverWallet) {
    throw new Error('Missing solver wallet');
  }

  const destinationKeypair = StellarSdk.Keypair.fromPublicKey(solverWallet);
  const destination = destinationKeypair.publicKey();
  const platformKeypair = getPlatformKeypair();
  const platformPublicKey = platformKeypair.publicKey();
  const paymentAmount = formatStellarAmount(amount);

  const [sourceAccount, destinationAccount] = await Promise.all([
    server.loadAccount(platformPublicKey),
    server.loadAccount(destination),
  ]);

  if (!hasUsdcTrustline(sourceAccount)) {
    throw new Error(`Platform wallet ${platformPublicKey} does not have a ${USDC_CODE} trustline`);
  }

  if (!hasUsdcTrustline(destinationAccount)) {
    throw new Error(`Solver wallet ${destination} does not have a ${USDC_CODE} trustline`);
  }

  const sourceUsdcBalance = sourceAccount.balances.find(
    (balance) =>
      balance.asset_type !== 'native' &&
      balance.asset_code === USDC_CODE &&
      balance.asset_issuer === USDC_ISSUER
  );

  if (!sourceUsdcBalance || Number.parseFloat(sourceUsdcBalance.balance) < Number.parseFloat(paymentAmount)) {
    throw new Error(`Platform wallet has insufficient ${USDC_CODE} balance`);
  }

  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  }).addOperation(
    StellarSdk.Operation.payment({
      destination,
      asset: usdcAsset,
      amount: paymentAmount,
    })
  );

  if (memo) {
    txBuilder.addMemo(StellarSdk.Memo.text(String(memo).slice(0, 28)));
  }

  const transaction = txBuilder.setTimeout(60).build();
  transaction.sign(platformKeypair);

  const result = await server.submitTransaction(transaction);
  return {
    hash: result.hash,
    source: platformPublicKey,
    destination,
    amount: paymentAmount,
    assetCode: USDC_CODE,
    assetIssuer: USDC_ISSUER,
  };
}

module.exports = {
  HORIZON_URL,
  USDC_CODE,
  USDC_ISSUER,
  usdcAsset,
  server,
  getPlatformPublicKey,
  sendUsdcToSolver,
};
