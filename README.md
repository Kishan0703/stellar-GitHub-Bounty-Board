# Stellar GitHub Bounty Board (Testnet)

GitHub bounty board on Stellar testnet where:
- Maintainers post bounties for GitHub issues (USDC amount).
- Solvers claim funded bounties.
- On PR merge webhook, backend sends USDC from the platform wallet to solver.
- Completed payout is visible on Stellar Expert.

## Current Flow

1. Create bounty: status `open`.
2. Maintainer sends USDC to platform wallet and marks bounty as `funded`.
3. Solver claims bounty: status `claimed`.
4. GitHub PR merged with `Closes #X` / `Fixes #X` / `Resolves #X`.
5. Backend webhook pays solver in USDC and marks bounty `completed` with `completedTxHash`.

## Tech Stack

- Frontend: Next.js 14 + Freighter wallet
- Backend: Node.js (CommonJS), Express, better-sqlite3
- Chain: Stellar testnet via `@stellar/stellar-sdk`

## Prerequisites

- Node.js 18+ (or 20+ recommended)
- Freighter browser extension
- GitHub repo admin access (for webhook setup)
- Testnet wallet(s) with XLM for fees and USDC trustlines

## Environment Variables

Backend env file: [webhook-server/.env.example](/Users/kishan/projects/stellar-GitHub-Bounty-Board/webhook-server/.env.example)

Required:
- `GITHUB_WEBHOOK_SECRET`
- `PLATFORM_SECRET_KEY`
- `PORT` (default `4000`)

Recommended defaults:
- `STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org`
- `USDC_ASSET_CODE=USDC`
- `USDC_ASSET_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

Optional:
- `GITHUB_TOKEN`
- `USDC_FUNDER_SECRET_KEY`, `SETUP_USDC_AMOUNT` (used by setup script to seed platform wallet with test USDC)

## How To Run

### 1. Install dependencies

Root (frontend):
```bash
npm install
```

Backend:
```bash
cd webhook-server
npm install
cp .env.example .env
```

### 2. Configure backend `.env`

Edit [webhook-server/.env](/Users/kishan/projects/stellar-GitHub-Bounty-Board/webhook-server/.env) and set:
- `GITHUB_WEBHOOK_SECRET`
- `PLATFORM_SECRET_KEY`

### 3. Set up platform wallet (one-time)

From `webhook-server`:
```bash
npm run setup:platform-wallet
```

This script:
- Creates/uses platform wallet from `PLATFORM_SECRET_KEY`
- Funds account with Friendbot XLM if account is missing
- Creates USDC trustline on testnet
- Optionally seeds USDC if `USDC_FUNDER_SECRET_KEY` and `SETUP_USDC_AMOUNT` are set

### 4. Start backend

From `webhook-server`:
```bash
npm run dev
```

Backend endpoints:
- `GET /health`
- `GET /bounties`
- `GET /bounty/:id`
- `POST /bounty/create`
- `POST /bounty/fund`
- `POST /bounty/claim`
- `POST /webhook/github`

### 5. Start frontend

From project root:
```bash
npm run dev
```

Open:
- `http://localhost:3000/bounties`

If backend is on non-default host/port:
```bash
NEXT_PUBLIC_API_BASE=http://localhost:4000 npm run dev
```

### 6. Expose backend for GitHub webhook (local dev)

```bash
ngrok http 4000
```

Set:
```bash
NEXT_PUBLIC_WEBHOOK_BASE=https://<your-ngrok-domain>.ngrok-free.app
```

Then restart frontend so bounty create page shows public webhook URL.

## GitHub Webhook Setup

In target repo:
1. Go to `Settings -> Webhooks -> Add webhook`
2. Payload URL: `https://<public-backend>/webhook/github`
3. Content type: `application/json`
4. Secret: same as bounty webhook secret
5. Events: select `Pull requests`

PR body/title must include one of:
- `Closes #<issue>`
- `Fixes #<issue>`
- `Resolves #<issue>`

## End-to-End Test

1. Connect poster wallet and create bounty from `/bounties/create`.
2. Send bounty USDC to platform wallet.
3. Open bounty detail and click `Mark Funded`.
4. Connect solver wallet and claim bounty.
5. Create and merge PR with `Fixes #<issue-number>`.
6. Confirm webhook response includes `released[].transactionHash`.
7. Verify bounty status is `completed` and link opens:
   `https://stellar.expert/explorer/testnet/tx/<hash>`

## Notes

- Platform wallet must keep enough XLM for transaction fees.
- Solver wallet must already have USDC trustline, or payout will fail.
- Bounties are stored in local SQLite (`webhook-server/bounties.db`).
