import { Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import { Wallet } from './types';
import { logger } from './logger';

export class WalletManager {
  private wallets: Wallet[] = [];

  async loadWallets(privateKeys?: string[], walletFilePath?: string): Promise<Wallet[]> {
    this.wallets = [];

    // Try loading from private keys first
    if (privateKeys && privateKeys.length > 0) {
      logger.info(`Loading ${privateKeys.length} wallet(s) from private keys`);
      for (const privateKey of privateKeys) {
        try {
          const keypair = this.loadKeypairFromPrivateKey(privateKey.trim());
          this.wallets.push({
            keypair,
            publicKey: keypair.publicKey,
            address: keypair.publicKey.toBase58(),
          });
        } catch (error) {
          logger.error(`Failed to load wallet from private key: ${error}`);
        }
      }
    }

    // Try loading from file if provided
    if (walletFilePath && fs.existsSync(walletFilePath)) {
      try {
        logger.info(`Loading wallets from file: ${walletFilePath}`);
        const fileContent = fs.readFileSync(walletFilePath, 'utf-8');
        const walletData = JSON.parse(fileContent);
        
        // Support both array of keys and object with keys array
        const keys = Array.isArray(walletData) 
          ? walletData 
          : walletData.keys || walletData.privateKeys || [];
        
        for (const key of keys) {
          try {
            const keypair = this.loadKeypairFromPrivateKey(key);
            // Avoid duplicates
            if (!this.wallets.find(w => w.address === keypair.publicKey.toBase58())) {
              this.wallets.push({
                keypair,
                publicKey: keypair.publicKey,
                address: keypair.publicKey.toBase58(),
              });
            }
          } catch (error) {
            logger.error(`Failed to load wallet from file entry: ${error}`);
          }
        }
      } catch (error) {
        logger.error(`Failed to load wallet file: ${error}`);
      }
    }

    if (this.wallets.length === 0) {
      throw new Error('No wallets loaded. Please provide WALLET_PRIVATE_KEYS or WALLET_FILE_PATH');
    }

    logger.info(`Successfully loaded ${this.wallets.length} wallet(s)`);
    this.wallets.forEach((wallet, index) => {
      logger.debug(`Wallet ${index + 1}: ${wallet.address}`);
    });

    return this.wallets;
  }

  private loadKeypairFromPrivateKey(privateKey: string): Keypair {
    try {
      // Try base58 decoding first
      const decoded = bs58.decode(privateKey);
      return Keypair.fromSecretKey(decoded);
    } catch {
      try {
        // Try JSON array format
        const keyArray = JSON.parse(privateKey);
        return Keypair.fromSecretKey(Uint8Array.from(keyArray));
      } catch {
        // Try hex string
        const hexMatch = privateKey.match(/^[0-9a-fA-F]{128}$/);
        if (hexMatch) {
          const hexBytes = Buffer.from(privateKey, 'hex');
          return Keypair.fromSecretKey(hexBytes);
        }
        throw new Error('Invalid private key format');
      }
    }
  }

  getWallets(): Wallet[] {
    return this.wallets;
  }

  getRandomWallet(): Wallet {
    if (this.wallets.length === 0) {
      throw new Error('No wallets available');
    }
    return this.wallets[Math.floor(Math.random() * this.wallets.length)];
  }

  getWalletByIndex(index: number): Wallet {
    if (index < 0 || index >= this.wallets.length) {
      throw new Error(`Wallet index ${index} out of range`);
    }
    return this.wallets[index];
  }
}
