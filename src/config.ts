import dotenv from 'dotenv';

dotenv.config();

export interface BotConfig {
  // RPC Configuration
  rpcUrl: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  
  // Jupiter API
  jupiterApiUrl: string;
  
  // Trading Amounts (in SOL)
  minBuyAmountSol: number;
  maxBuyAmountSol: number;
  minSellAmountSol: number;
  maxSellAmountSol: number;
  
  // Transaction Speed (milliseconds between transactions)
  transactionSpeedMs: number;
  
  // Slippage (basis points, e.g., 50 = 0.5%)
  slippageBps: number;
  
  // Token Configuration
  tokenMintAddress?: string; // If empty, trades SOL
  
  // Wallet Configuration
  walletPrivateKeys?: string[];
  walletFilePath?: string;
  
  // Trading Flags
  enableBuy: boolean;
  enableSell: boolean;
  
  // Concurrency
  maxConcurrentTransactions: number;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function loadConfig(): BotConfig {
  const network = (process.env.NETWORK || 'mainnet-beta') as 'mainnet-beta' | 'devnet' | 'testnet';
  
  return {
    rpcUrl: process.env.RPC_URL || (network === 'devnet' 
      ? process.env.RPC_URL_DEVNET || 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com'),
    network,
    jupiterApiUrl: process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6',
    minBuyAmountSol: parseFloat(process.env.MIN_BUY_AMOUNT_SOL || '0.01'),
    maxBuyAmountSol: parseFloat(process.env.MAX_BUY_AMOUNT_SOL || '0.1'),
    minSellAmountSol: parseFloat(process.env.MIN_SELL_AMOUNT_SOL || '0.01'),
    maxSellAmountSol: parseFloat(process.env.MAX_SELL_AMOUNT_SOL || '0.1'),
    transactionSpeedMs: parseInt(process.env.TRANSACTION_SPEED_MS || '5000', 10),
    slippageBps: parseInt(process.env.SLIPPAGE_BPS || '50', 10),
    tokenMintAddress: process.env.TOKEN_MINT_ADDRESS || undefined,
    walletPrivateKeys: process.env.WALLET_PRIVATE_KEYS?.split(',').filter(k => k.trim()) || undefined,
    walletFilePath: process.env.WALLET_FILE_PATH || 'wallets/wallets.json',
    enableBuy: process.env.ENABLE_BUY !== 'false',
    enableSell: process.env.ENABLE_SELL !== 'false',
    maxConcurrentTransactions: parseInt(process.env.MAX_CONCURRENT_TRANSACTIONS || '3', 10),
    logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  };
}
