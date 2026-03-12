# Solana Volume Bot

An automated trading bot for Solana that uses Jupiter Aggregator to execute buy/sell transactions across all DEXs on Solana. The bot supports configurable trading parameters including speed, amount ranges, and multiple participant wallets.

## Features

- 🤖 **Automated Trading**: Automated buy/sell execution using Jupiter Aggregator
- 🔄 **Multi-DEX Support**: Automatically routes through all DEXs on Solana via Jupiter
- ⚙️ **Highly Configurable**: Customize speed, amounts, slippage, and more
- 👥 **Multi-Wallet Support**: Use multiple wallets for distributed trading
- 📊 **Real-time Stats**: Track trading statistics and performance
- 🔒 **Secure**: Private keys stored securely (never commit to git)

## Prerequisites

- Node.js 18+ and npm
- Solana wallets with SOL balance
- RPC endpoint (can use public or private RPC)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Solana-Volume-Bot
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

1. Copy the example environment file:
```bash
# Create .env file manually (see .env.example for reference)
```

2. Create `.env` file with your configuration:

```env
# Solana RPC Configuration
RPC_URL=https://api.mainnet-beta.solana.com
RPC_URL_DEVNET=https://api.devnet.solana.com
NETWORK=mainnet-beta

# Jupiter API
JUPITER_API_URL=https://quote-api.jup.ag/v6

# Bot Configuration
MIN_BUY_AMOUNT_SOL=0.01
MAX_BUY_AMOUNT_SOL=0.1
MIN_SELL_AMOUNT_SOL=0.01
MAX_SELL_AMOUNT_SOL=0.1
TRANSACTION_SPEED_MS=5000
SLIPPAGE_BPS=50

# Token Configuration (leave empty for SOL)
TOKEN_MINT_ADDRESS=

# Wallet Configuration - Option 1: Direct private keys
WALLET_PRIVATE_KEYS=your_base58_private_key1,your_base58_private_key2

# Wallet Configuration - Option 2: Wallet file (alternative)
WALLET_FILE_PATH=wallets/wallets.json

# Trading Configuration
ENABLE_BUY=true
ENABLE_SELL=true
MAX_CONCURRENT_TRANSACTIONS=3

# Logging
LOG_LEVEL=info
```

### Configuration Options

#### RPC Configuration
- `RPC_URL`: Your Solana RPC endpoint (mainnet)
- `RPC_URL_DEVNET`: Devnet RPC endpoint
- `NETWORK`: Network to use (`mainnet-beta`, `devnet`, or `testnet`)

#### Trading Amounts
- `MIN_BUY_AMOUNT_SOL`: Minimum buy amount in SOL
- `MAX_BUY_AMOUNT_SOL`: Maximum buy amount in SOL
- `MIN_SELL_AMOUNT_SOL`: Minimum sell amount in SOL
- `MAX_SELL_AMOUNT_SOL`: Maximum sell amount in SOL

#### Speed & Slippage
- `TRANSACTION_SPEED_MS`: Milliseconds between transactions (lower = faster)
- `SLIPPAGE_BPS`: Slippage tolerance in basis points (50 = 0.5%)

#### Token Trading
- `TOKEN_MINT_ADDRESS`: Leave empty to trade SOL, or provide token mint address

#### Wallet Setup

**Option 1: Environment Variable**
```env
WALLET_PRIVATE_KEYS=key1,key2,key3
```

**Option 2: Wallet File**
Create `wallets/wallets.json` (see `wallets/wallets.json.example` for reference):
```json
{
  "keys": [
    "your_base58_private_key1",
    "your_base58_private_key2"
  ]
}
```

Or simple array format:
```json
[
  "your_base58_private_key1",
  "your_base58_private_key2"
]
```

#### Trading Flags
- `ENABLE_BUY`: Enable buy transactions (true/false)
- `ENABLE_SELL`: Enable sell transactions (true/false)
- `MAX_CONCURRENT_TRANSACTIONS`: Maximum concurrent transactions

#### Logging
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Watch Mode (for development)
```bash
npm run watch
```

## How It Works

1. **Initialization**: The bot loads wallets and verifies balances
2. **Trading Loop**: Continuously executes buy/sell transactions at configured intervals
3. **Jupiter Integration**: Uses Jupiter API to get quotes and execute swaps across all DEXs
4. **Random Selection**: Randomly selects wallets and amounts within configured ranges
5. **Statistics**: Tracks all trading activity and provides real-time stats

## Wallet Private Key Format

The bot supports multiple private key formats:
- **Base58 encoded** (recommended): Standard Solana wallet format
- **JSON array**: `[123,45,67,...]` format
- **Hex string**: 128 character hex string

To get your private key in base58 format:
```javascript
const bs58 = require('bs58');
const keypair = Keypair.generate();
const privateKey = bs58.encode(keypair.secretKey);
console.log(privateKey);
```

## Safety Features

- ✅ Balance verification before transactions
- ✅ Configurable slippage protection
- ✅ Transaction confirmation waiting
- ✅ Error handling and retry logic
- ✅ Graceful shutdown on SIGINT/SIGTERM

## Important Notes

⚠️ **Security Warning**: 
- Never commit your `.env` file or wallet private keys to git
- Use environment variables or secure wallet storage
- Start with small amounts to test

⚠️ **RPC Limits**:
- Public RPC endpoints have rate limits
- Consider using a private RPC endpoint for production use
- Adjust `TRANSACTION_SPEED_MS` to avoid rate limiting

⚠️ **Slippage**:
- Higher slippage allows more trades to succeed but at worse prices
- Lower slippage may cause more failed transactions
- Monitor failed transactions and adjust accordingly

## Troubleshooting

### "No wallets loaded" error
- Ensure `WALLET_PRIVATE_KEYS` or `WALLET_FILE_PATH` is configured
- Verify private key format is correct
- Check file permissions if using wallet file

### "Insufficient balance" warnings
- Fund your wallets with SOL
- Ensure minimum balance > `MIN_BUY_AMOUNT_SOL`

### Transaction failures
- Check RPC endpoint is working
- Verify network configuration matches your RPC
- Increase `SLIPPAGE_BPS` if getting price impact errors
- Check wallet balances are sufficient

### Rate limiting
- Increase `TRANSACTION_SPEED_MS`
- Use a private RPC endpoint
- Reduce `MAX_CONCURRENT_TRANSACTIONS`

## Project Structure

```
Solana-Volume-Bot/
├── src/
│   ├── index.ts          # Entry point
│   ├── bot.ts            # Main bot logic
│   ├── config.ts         # Configuration loader
│   ├── jupiter.ts        # Jupiter API client
│   ├── wallet.ts         # Wallet management
│   ├── logger.ts         # Logging utility
│   └── types.ts          # TypeScript types
├── dist/                 # Compiled JavaScript (generated)
├── wallets/              # Wallet storage (gitignored)
├── .env                  # Environment variables (gitignored)
├── .env.example          # Example environment file
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Disclaimer

This bot is for educational purposes. Trading cryptocurrencies involves risk. Use at your own discretion. The authors are not responsible for any financial losses.
