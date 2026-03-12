import { loadConfig } from './config';
import { VolumeBot } from './bot';
import { logger } from './logger';

async function main() {
  try {
    // Load configuration
    const config = loadConfig();
    
    // Create and initialize bot
    const bot = new VolumeBot(config);
    await bot.initialize();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });
    
    // Start bot
    await bot.start();
    
    // Keep process alive
    setInterval(() => {
      const stats = bot.getStats();
      logger.info(`Bot running... Stats: ${stats.totalBuys} buys, ${stats.totalSells} sells, ${stats.totalVolume.toFixed(4)} SOL volume`);
    }, 60000); // Log stats every minute
    
  } catch (error: any) {
    logger.error(`Fatal error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

main();
