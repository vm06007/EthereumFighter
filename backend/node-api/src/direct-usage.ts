// direct-usage.ts
// Example showing how to use the service directly without the API

import oneInchService, { SwapConfig } from './services/oneInchService';
import { NetworkEnum } from '@1inch/cross-chain-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Define static test configuration
const testConfig: SwapConfig = {
  srcChainId: NetworkEnum.COINBASE,
  dstChainId: NetworkEnum.OPTIMISM,
  srcTokenAddress: "0xc5fecC3a29Fb57B5024eEc8a2239d4621e111CBE", // 1inch token on base
  dstTokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on optimism
  amount: "1000000000000000000",
  makerAddress: process.env.WALLET_ADDRESS || ""
  
};

async function testDirectServiceUsage() {
  try {
    console.log('Testing direct service usage...');
    console.log('===============================');
    
    // Step 1: Approve token
    console.log('1. Approving token...');
    // const approvalTx = await oneInchService.approveToken(testConfig.srcTokenAddress);
    // console.log(`   Token approval transaction: ${approvalTx}`);
    console.log(`Approving token ${testConfig.srcTokenAddress} for spending... from ${testConfig.makerAddress}`);

    // Step 2: Get quote
    console.log('2. Getting quote...');
    const quote = await oneInchService.getQuote(testConfig);
    console.log(`   Quote received with ID: ${quote.id}`);
    
    const secretsCount = quote.getPreset().secretsCount;
    console.log(`   Secrets count needed: ${secretsCount}`);
    
    // Step 3: Generate secrets
    console.log('3. Generating secrets...');
    const secretsData = oneInchService.generateSecrets(secretsCount);
    console.log(`   Generated ${secretsData.secrets.length} secrets`);
    
    // Step 4: Place order
    console.log('4. Placing order...');
    const orderHash = await oneInchService.placeOrder(quote, secretsData);
    console.log(`   Order placed with hash: ${orderHash}`);
    
    // Step 5: Check order status
    console.log('5. Checking order status...');
    const orderStatus = await oneInchService.getOrderStatus(orderHash);
    console.log(`   Order status: ${orderStatus.status}`);
    
    // Step 6: Start monitoring
    console.log('6. Starting monitoring...');
    oneInchService.monitorOrder(orderHash, secretsData.secrets)
      .catch(err => console.error(`   Monitoring error: ${err.message}`));
    console.log(`   Monitoring started for order: ${orderHash}`);
    
    // Helper function to wait for some time
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Wait and check for fills
    console.log('7. Waiting for 5 seconds then checking for fills...');
    await wait(5000);
    
    try {
      const fills = await oneInchService.getReadyFills(orderHash);
      console.log(`   Found ${fills.fills.length} fills ready for acceptance`);
      
      // Submit secrets for any fills
      if (fills.fills.length > 0) {
        for (const fill of fills.fills) {
          console.log(`   Submitting secret for fill index ${fill.idx}...`);
          await oneInchService.submitSecret(orderHash, secretsData.secrets[fill.idx]);
          console.log(`   Secret submitted successfully`);
        }
      }
    } catch (error: any) {
      console.error(`   Error checking for fills: ${error.message}`);
    }
    
    // Wait again and check status
    console.log('8. Waiting for 5 more seconds then checking final status...');
    await wait(5000);
    
    try {
      const finalStatus = await oneInchService.getOrderStatus(orderHash);
      console.log(`   Final order status: ${finalStatus.status}`);
    } catch (error: any) {
      console.error(`   Error checking final status: ${error.message}`);
    }
    
    console.log('===============================');
    console.log('Direct service test completed!');
    
  } catch (error: any) {
    console.error('Error during direct service test:', error.message);
  }
}

// Run the test
testDirectServiceUsage().catch(console.error);