import { PublicKey, Keypair } from '@solana/web3.js';

export interface Wallet {
  keypair: Keypair;
  publicKey: PublicKey;
  address: string;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: any;
  priceImpactPct: string;
  routePlan: any[];
}

export interface SwapTransaction {
  swapTransaction: string; // base64 encoded transaction
}

export interface TradingStats {
  totalBuys: number;
  totalSells: number;
  totalVolume: number;
  successfulTransactions: number;
  failedTransactions: number;
  startTime: Date;
}
