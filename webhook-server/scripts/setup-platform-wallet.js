require('dotenv').config();

const StellarSdk = require('@stellar/stellar-sdk');
const {
  HORIZON_URL,
  USDC_CODE,
  USDC_ISSUER,
  server,
  usdcAsset,
} = require('../stellar');

async function fundWithFriendbot(publicKey) {
  const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Friendbot failed: ${response.status} ${body}`);
  }
}

async function submitChangeTrust(keypair) {
  const account = await server.loadAccount(keypair.publicKey());
  const hasTrustline = account.balances.some(
    (balance) =>
      balance.asset_type !== 'native' &&
      balance.asset_code === USDC_CODE &&
      balance.asset_issuer === USDC_ISSUER
  );

  if (hasTrustline) {
    console.log(`USDC trustline already exists for ${keypair.publicKey()}`);
    return null;
  }

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset: usdcAsset,
      })
    )
    .setTimeout(60)
    .build();

  transaction.sign(keypair);
  const result = await server.submitTransaction(transaction);
  console.log(`Created USDC trustline: ${result.hash}`);
  return result.hash;
}

async function optionallySeedUsdc(platformPublicKey) {
  const funderSecret = process.env.USDC_FUNDER_SECRET_KEY;
  const amount = process.env.SETUP_USDC_AMOUNT;

  if (!funderSecret || !amount) {
    console.log('Skipping USDC seed payment. Set USDC_FUNDER_SECRET_KEY and SETUP_USDC_AMOUNT to send test USDC.');
    return null;
  }

  const funder = StellarSdk.Keypair.fromSecret(funderSecret);
  const account = await server.loadAccount(funder.publicKey());
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: platformPublicKey,
        asset: usdcAsset,
        amount: Number.parseFloat(amount).toFixed(7).replace(/0+$/, '').replace(/\.$/, ''),
      })
    )
    .setTimeout(60)
    .build();

  transaction.sign(funder);
  const result = await server.submitTransaction(transaction);
  console.log(`Seeded platform wallet with ${amount} ${USDC_CODE}: ${result.hash}`);
  return result.hash;
}

async function main() {
  const existingSecret = process.env.PLATFORM_SECRET_KEY || process.env.PLATFORM_WALLET_SECRET;
  const keypair = existingSecret
    ? StellarSdk.Keypair.fromSecret(existingSecret)
    : StellarSdk.Keypair.random();

  console.log('Platform wallet');
  console.log(`Public key: ${keypair.publicKey()}`);
  console.log(`Secret key: ${keypair.secret()}`);
  console.log(`Horizon: ${HORIZON_URL}`);
  console.log(`USDC asset: ${USDC_CODE}:${USDC_ISSUER}`);

  try {
    await server.loadAccount(keypair.publicKey());
    console.log('Account already exists on testnet');
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('Funding platform wallet with Friendbot XLM...');
      await fundWithFriendbot(keypair.publicKey());
    } else {
      throw error;
    }
  }

  await submitChangeTrust(keypair);
  await optionallySeedUsdc(keypair.publicKey());

  if (!existingSecret) {
    console.log('');
    console.log('Add this to webhook-server/.env:');
    console.log(`PLATFORM_SECRET_KEY=${keypair.secret()}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
