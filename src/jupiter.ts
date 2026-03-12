import axios, { AxiosInstance } from 'axios';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { SwapQuote, SwapTransaction } from './types';
import { logger } from './logger';

export class JupiterClient {
  private apiClient: AxiosInstance;
  private connection: Connection;

  constructor(apiUrl: string, connection: Connection) {
    this.apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
    });
    this.connection = connection;
  }

  /**
   * Get a swap quote from Jupiter
   */
  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number,
    onlyDirectRoutes: boolean = false
  ): Promise<SwapQuote> {
    try {
      const params = {
        inputMint,
        outputMint,
        amount: Math.floor(amount).toString(),
        slippageBps,
        onlyDirectRoutes,
      };

      logger.debug(`Getting quote: ${JSON.stringify(params)}`);
      
      const response = await this.apiClient.get<SwapQuote>('/quote', { params });
      
      if (!response.data || !response.data.outAmount) {
        throw new Error('Invalid quote response');
      }

      logger.debug(`Quote received: ${response.data.outAmount} output for ${amount} input`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get quote: ${error.message}`);
      if (error.response) {
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Get swap transaction from Jupiter
   */
  async getSwapTransaction(
    quote: SwapQuote,
    userPublicKey: string,
    wrapUnwrapSOL: boolean = true
  ): Promise<SwapTransaction> {
    try {
      const params = new URLSearchParams({
        userPublicKey,
        wrapUnwrapSOL: wrapUnwrapSOL.toString(),
      });

      logger.debug(`Getting swap transaction for user: ${userPublicKey}`);
      
      const response = await this.apiClient.post<SwapTransaction>(
        `/swap?${params.toString()}`,
        quote
      );

      if (!response.data || !response.data.swapTransaction) {
        throw new Error('Invalid swap transaction response');
      }

      return response.data;
    } catch (error: any) {
      logger.error(`Failed to get swap transaction: ${error.message}`);
      if (error.response) {
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Execute swap transaction
   */
  async executeSwap(
    swapTransaction: SwapTransaction,
    keypair: any
  ): Promise<string> {
    try {
      // Deserialize the transaction
      const transactionBuf = Buffer.from(swapTransaction.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBuf);

      // Sign the transaction
      transaction.sign([keypair]);

      // Send and confirm transaction
      logger.debug(`Sending swap transaction...`);
      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 3,
      });

      logger.info(`Transaction sent: ${signature}`);

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      logger.info(`Transaction confirmed: ${signature}`);
      return signature;
    } catch (error: any) {
      logger.error(`Failed to execute swap: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get SOL balance
   */
  async getSOLBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error: any) {
      logger.error(`Failed to get SOL balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get token balance
   */
  async getTokenBalance(publicKey: PublicKey, mintAddress: string): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: new PublicKey(mintAddress),
      });

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    } catch (error: any) {
      logger.error(`Failed to get token balance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get token decimals
   */
  async getTokenDecimals(mintAddress: string): Promise<number> {
    try {
      const mintInfo = await getMint(this.connection, new PublicKey(mintAddress));
      return mintInfo.decimals;
    } catch (error: any) {
      logger.error(`Failed to get token decimals: ${error.message}`);
      throw error;
    }
  }
}
