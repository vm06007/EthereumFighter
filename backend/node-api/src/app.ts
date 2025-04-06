// src/app.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import oneInchService, { OneInchService, SwapConfig } from './services/oneInchService';
import { NetworkEnum } from "@1inch/cross-chain-sdk";

const app = express();
const PORT = process.env.PORT || 3000;

// Active orders with their secrets for monitoring
interface ActiveOrder {
  orderHash: string;
  secrets: string[];
  status: string;
  timestamp: number;
}

// In-memory storage for active orders (would use a database in production)
const activeOrders: Record<string, ActiveOrder> = {};

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Error handler middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error', 
    error: err.message 
  });
});

// Static test data
const staticData = {
  tokenAddress: "0xc5fecC3a29Fb57B5024eEc8a2239d4621e111CBE", // 1inch token on base
  swapConfig: {
    srcChainId: NetworkEnum.COINBASE,
    dstChainId: NetworkEnum.OPTIMISM,
    srcTokenAddress: "0xc5fecC3a29Fb57B5024eEc8a2239d4621e111CBE", // 1inch token on base
    dstTokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on optimism
    amount: "1000000000000000000",
    makerAddress: process.env.WALLET_ADDRESS || "",
    invert: false
  },
  secretsCount: 1,
  secretsData: null, // Will be populated during runtime
  quoteId: "test-quote-id", // Placeholder
  quote: null, // Will be populated during runtime
  orderHash: "test-order-hash", // Placeholder
  secret: "test-secret" // Placeholder
};

// API Routes

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Step 1: Approve token
app.post('/api/approve-token', async (req: Request, res: Response) => {
  try {
    // Use static token address instead of request body
    const tokenAddress = staticData.tokenAddress;
    
    console.log(`Using static token address: ${tokenAddress}`);
    
    const txHash = await oneInchService.approveToken(tokenAddress);
    res.status(200).json({ success: true, txHash });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 2: Get quote
app.post('/api/get-quote', async (req: Request, res: Response) => {
  try {
    // Use static swap config instead of request body
    const swapConfig = staticData.swapConfig;
    
    console.log(`Using static swap config: ${JSON.stringify(swapConfig)}`);
    
    const quote = await oneInchService.getQuote(swapConfig);
    console.log(`Quote received: quote ${quote}`);
    
    // Store quote in static data for later use
    staticData.quote = quote;
    staticData.quoteId = quote?.id;
    staticData.secretsCount = quote?.getPreset()?.secretsCount;
    
    res.status(200).json({ 
      success: true, 
      quote: {
        id: quote?.id,
        srcChainId: quote?.srcChainId,
        dstChainId: quote?.dstChainId,
        secretsCount: quote?.getPreset()?.secretsCount,
        details: quote
      }
    });
  } catch (error: any) {
    console.log(`Error fetching quote: ${error}`);
    
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 3: Generate secrets
app.post('/api/generate-secrets', (req: Request, res: Response) => {
  try {
    // Use static secretsCount instead of request body
    const secretsCount = staticData.secretsCount;
    
    console.log(`Using static secrets count: ${secretsCount}`);
    
    const secretsData = oneInchService.generateSecrets(secretsCount);
    // Store secretsData in static data for later use
    staticData.secretsData = secretsData;
    staticData.secret = secretsData.secrets[0]; // Store first secret for later use
    
    res.status(200).json({ 
      success: true, 
      secrets: secretsData.secrets,
      secretHashes: secretsData.secretHashes
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 4: Place order
app.post('/api/place-order', async (req: Request, res: Response) => {
  try {
    // Use static quoteId and secretsData instead of request body
    const quote = staticData.quote || { id: staticData.quoteId };
    const secretsData = staticData.secretsData;
    
    if (!secretsData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Generate secrets first by calling /api/generate-secrets' 
      });
    }
    
    console.log(`Using static quote ID: ${quote.id}`);
    console.log(`Using static secrets data with ${secretsData.secrets.length} secrets`);
    
    const orderHash = await oneInchService.placeOrder(quote, secretsData);
    // Store orderHash in static data for later use
    staticData.orderHash = orderHash;
    
    // Save order for monitoring
    activeOrders[orderHash] = {
      orderHash,
      secrets: secretsData.secrets,
      status: 'placed',
      timestamp: Date.now()
    };
    
    res.status(200).json({ success: true, orderHash });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 5: Get order status
app.get('/api/order/:orderHash?', async (req: Request, res: Response) => {
  try {
    // Use static orderHash if not provided in params
    const orderHash = req.params.orderHash || staticData.orderHash;
    
    console.log(`Using order hash: ${orderHash}`);
    
    const orderStatus = await oneInchService.getOrderStatus(orderHash);
    res.status(200).json({ 
      success: true, 
      order: orderStatus 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 6: Get ready fills
app.get('/api/fills/:orderHash?', async (req: Request, res: Response) => {
  try {
    // Use static orderHash if not provided in params
    const orderHash = req.params.orderHash || staticData.orderHash;
    
    console.log(`Checking fills for order hash: ${orderHash}`);
    
    const fills = await oneInchService.getReadyFills(orderHash);
    res.status(200).json({ 
      success: true, 
      fills 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 7: Submit secret
app.post('/api/submit-secret', async (req: Request, res: Response) => {
  try {
    // Use static orderHash and secret instead of request body
    const orderHash = staticData.orderHash;
    const secret = staticData.secret;
    
    console.log(`Submitting secret for order hash: ${orderHash}`);
    
    const result = await oneInchService.submitSecret(orderHash, secret);
    res.status(200).json({ 
      success: true, 
      result 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Combined endpoint for complete swap
app.post('/api/execute-swap', async (req: Request, res: Response) => {
  try {
    console.log("Executing complete swap using static configuration");
    
    // Use the service method that uses static default config
    const result = await oneInchService.executeCompleteSwap();
    
    // Update static data with results
    staticData.orderHash = result.orderHash;
    staticData.secret = result.secrets[0];
    
    // Start monitoring in the background
    oneInchService.monitorOrder(result.orderHash, result.secrets)
      .catch(err => console.error(`Monitoring error for order ${result.orderHash}:`, err));
    
    // Save order for monitoring
    activeOrders[result.orderHash] = {
      orderHash: result.orderHash,
      secrets: result.secrets,
      status: 'monitoring',
      timestamp: Date.now()
    };
    
    res.status(200).json({ 
      success: true, 
      orderHash: result.orderHash,
      status: result.status
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all active orders
app.get('/api/active-orders', (req: Request, res: Response) => {
  const orders = Object.values(activeOrders);
  res.status(200).json({ 
    success: true, 
    count: orders.length,
    orders 
  });
});

// Start monitoring an order
app.post('/api/monitor/:orderHash?', async (req: Request, res: Response) => {
  try {
    // Use static values instead of request parameters
    const orderHash = req.params.orderHash || staticData.orderHash;
    const secrets = staticData.secretsData ? staticData.secretsData.secrets : [staticData.secret];
    
    console.log(`Starting monitoring for order hash: ${orderHash}`);
    console.log(`Using ${secrets.length} secrets for monitoring`);
    
    // Start monitoring in the background
    oneInchService.monitorOrder(orderHash, secrets)
      .catch(err => console.error(`Monitoring error for order ${orderHash}:`, err));
    
    // Update or add to active orders
    activeOrders[orderHash] = {
      orderHash,
      secrets,
      status: 'monitoring',
      timestamp: Date.now()
    };
    
    res.status(200).json({ 
      success: true, 
      message: `Monitoring started for order ${orderHash}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;