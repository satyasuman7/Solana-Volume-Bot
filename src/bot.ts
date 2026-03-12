import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BotConfig } from './config';
import { WalletManager } from './wallet';
import { JupiterClient } from './jupiter';
import { Wallet, TradingStats } from './types';
import { logger } from './logger';

export class VolumeBot {
  private config: BotConfig;
  private connection: Connection;
  private walletManager: WalletManager;
  private jupiterClient: JupiterClient;
  private stats: TradingStats;
  private isRunning: boolean = false;
  private activeTransactions: Set<Promise<void>> = new Set();

  constructor(config: BotConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.walletManager = new WalletManager();
    this.jupiterClient = new JupiterClient(config.jupiterApiUrl, this.connection);
    this.stats = {
      totalBuys: 0,
      totalSells: 0,
      totalVolume: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      startTime: new Date(),
    };
    
    logger.setLevel(config.logLevel);
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Solana Volume Bot...');
    logger.info(`Network: ${this.config.network}`);
    logger.info(`RPC URL: ${this.config.rpcUrl}`);
    
    await this.walletManager.loadWallets(
      this.config.walletPrivateKeys,
      this.config.walletFilePath
    );

    // Verify wallets have balance
    await this.verifyWallets();

    logger.info('Bot initialized successfully');
  }

  private async verifyWallets(): Promise<void> {
    logger.info('Verifying wallet balances...');
    const wallets = this.walletManager.getWallets();
    
    for (const wallet of wallets) {
      try {
        const balance = await this.jupiterClient.getSOLBalance(wallet.publicKey);
        logger.info(`Wallet ${wallet.address}: ${balance.toFixed(4)} SOL`);
        
        if (balance < this.config.minBuyAmountSol) {
          logger.warn(`Wallet ${wallet.address} has low balance (${balance.toFixed(4)} SOL)`);
        }
      } catch (error: any) {
        logger.error(`Failed to check balance for ${wallet.address}: ${error.message}`);
      }
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting volume bot...');
    logger.info(`Transaction speed: ${this.config.transactionSpeedMs}ms`);
    logger.info(`Buy enabled: ${this.config.enableBuy}, Sell enabled: ${this.config.enableSell}`);

    // Start trading loop
    this.tradingLoop();
  }

  async stop(): Promise<void> {
    logger.info('Stopping bot...');
    this.isRunning = false;
    
    // Wait for active transactions to complete
    await Promise.allSettled(Array.from(this.activeTransactions));
    
    this.printStats();
  }

  private async tradingLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we can start a new transaction
        if (this.activeTransactions.size < this.config.maxConcurrentTransactions) {
          const shouldBuy = this.config.enableBuy && Math.random() > 0.5;
          
          if (shouldBuy) {
            this.executeTrade('buy').catch(error => {
              logger.error(`Buy trade error: ${error.message}`);
            });
          } else if (this.config.enableSell) {
            this.executeTrade('sell').catch(error => {
              logger.error(`Sell trade error: ${error.message}`);
            });
          }
        }

        // Wait before next iteration
        await this.sleep(this.config.transactionSpeedMs);
      } catch (error: any) {
        logger.error(`Trading loop error: ${error.message}`);
        await this.sleep(1000);
      }
    }
  }

  private async executeTrade(type: 'buy' | 'sell'): Promise<void> {
    const tradePromise = (async () => {
      try {
        const wallet = this.walletManager.getRandomWallet();
        
        // Determine input/output mints
        const solMint = 'So11111111111111111111111111111111111111112';
        const tokenMint = this.config.tokenMintAddress || solMint;
        
        const inputMint = type === 'buy' ? solMint : tokenMint;
        const outputMint = type === 'buy' ? tokenMint : solMint;
        
        // Get random amount
        const minAmount = type === 'buy' 
          ? this.config.minBuyAmountSol 
          : this.config.minSellAmountSol;
        const maxAmount = type === 'buy' 
          ? this.config.maxBuyAmountSol 
          : this.config.maxSellAmountSol;
        
        const amount = this.getRandomAmount(minAmount, maxAmount);
        const amountInLamports = Math.floor(amount * LAMPORTS_PER_SOL);
        
        logger.info(`Executing ${type.toUpperCase()}: ${amount.toFixed(4)} SOL worth`);
        logger.debug(`Wallet: ${wallet.address}, Input: ${inputMint}, Output: ${outputMint}`);
        
        // Check balance
        if (inputMint === solMint) {
          const balance = await this.jupiterClient.getSOLBalance(wallet.publicKey);
          if (balance < amount) {
            logger.warn(`Insufficient SOL balance: ${balance.toFixed(4)} < ${amount.toFixed(4)}`);
            return;
          }
        } else {
          const balance = await this.jupiterClient.getTokenBalance(wallet.publicKey, inputMint);
          if (balance < amount) {
            logger.warn(`Insufficient token balance: ${balance.toFixed(4)} < ${amount.toFixed(4)}`);
            return;
          }
        }
        
        // Get quote
        const quote = await this.jupiterClient.getQuote(
          inputMint,
          outputMint,
          amountInLamports,
          this.config.slippageBps
        );
        
        logger.debug(`Quote: ${quote.outAmount} output for ${quote.inAmount} input`);
        logger.debug(`Price impact: ${quote.priceImpactPct}%`);
        
        // Get swap transaction
        const swapTx = await this.jupiterClient.getSwapTransaction(
          quote,
          wallet.address
        );
        
        // Execute swap
        const signature = await this.jupiterClient.executeSwap(
          swapTx,
          wallet.keypair
        );
        
        // Update stats
        if (type === 'buy') {
          this.stats.totalBuys++;
        } else {
          this.stats.totalSells++;
        }
        this.stats.totalVolume += amount;
        this.stats.successfulTransactions++;
        
        logger.info(`✓ ${type.toUpperCase()} successful: ${signature}`);
        logger.info(`Stats: ${this.stats.totalBuys} buys, ${this.stats.totalSells} sells, ${this.stats.totalVolume.toFixed(4)} SOL volume`);
        
      } catch (error: any) {
        this.stats.failedTransactions++;
        logger.error(`✗ ${type.toUpperCase()} failed: ${error.message}`);
        throw error;
      }
    })();
    
    this.activeTransactions.add(tradePromise);
    tradePromise.finally(() => {
      this.activeTransactions.delete(tradePromise);
    });
  }

  private getRandomAmount(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printStats(): void {
    const runtime = (Date.now() - this.stats.startTime.getTime()) / 1000;
    logger.info('=== Trading Statistics ===');
    logger.info(`Runtime: ${Math.floor(runtime / 60)} minutes`);
    logger.info(`Total Buys: ${this.stats.totalBuys}`);
    logger.info(`Total Sells: ${this.stats.totalSells}`);
    logger.info(`Total Volume: ${this.stats.totalVolume.toFixed(4)} SOL`);
    logger.info(`Successful Transactions: ${this.stats.successfulTransactions}`);
    logger.info(`Failed Transactions: ${this.stats.failedTransactions}`);
    logger.info(`Success Rate: ${this.stats.successfulTransactions + this.stats.failedTransactions > 0 
      ? ((this.stats.successfulTransactions / (this.stats.successfulTransactions + this.stats.failedTransactions)) * 100).toFixed(2) 
      : 0}%`);
  }

  getStats(): TradingStats {
    return { ...this.stats };
  }
}
