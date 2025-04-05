# 1inch Cross-Chain API

This project provides a Node.js API for interacting with the 1inch Cross-Chain SDK. It allows token swaps between different blockchains through independent, reusable functions.

## Features

- Token approval
- Quote generation
- Order placement and monitoring
- Secret generation and submission
- Complete cross-chain swap execution

## Prerequisites

- Node.js (v16+)
- npm or yarn
- 1inch Developer Portal API key
- Ethereum wallet private key
- RPC endpoint for Ethereum

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with the required environment variables:
   ```
   WALLET_KEY=your_private_key_here
   WALLET_ADDRESS=your_wallet_address_here
   RPC_URL_ETHEREUM=your_ethereum_rpc_url_here
   DEV_PORTAL_KEY=your_1inch_dev_portal_key_here
   PORT=3000
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Project Structure

```
├── src/
│   ├── app.ts