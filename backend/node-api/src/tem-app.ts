// src/app.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import oneInchService, { OneInchService, SwapConfig } from './services/oneInchService';

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
app.use((req: Request, res: Response, next : any) => {
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

// API Routes

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Step 1: Approve token
app.post('/api/approve-token', async (req: Request, res: Response) => {
  try {
    const { tokenAddress } = req.body;
    
    if (!tokenAddress) {
      return res.status(400).json({ success: false, message: 'Token address is required' });
    }
    
    const txHash = await oneInchService.approveToken(tokenAddress);
    res.status(200).json({ success: true, txHash });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 2: Get quote
app.post('/api/get-quote', async (req: Request, res: Response) => {
  try {
    // Use either provided config or defaults
    const swapConfig: SwapConfig = {
      srcChainId: req.body.srcChainId,
      dstChainId: req.body.dstChainId,
      srcTokenAddress: req.body.srcTokenAddress,
      dstTokenAddress: req.body.dstTokenAddress,
      amount: req.body.amount || '1000000',
      invert: req.body.invert || false
    };
    
    const quote = await oneInchService.getQuote(swapConfig);
    res.status(200).json({ 
      success: true, 
      quote: {
        id: quote.id,
        srcChainId: quote.srcChainId,
        dstChainId: quote.dstChainId,
        secretsCount: quote.getPreset().secretsCount,
        details: quote
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Step 3: Generate secrets
app.post('/api/generate-secrets', (req: Request, res: Response) => {
  try {
    const { secretsCount } = req.body;
    
    if (!secretsCount || isNaN(parseInt(secretsCount))) {
      return res.status(400).json({ success: false, message: 'Valid secretsCount is required' });
    }
    
    const secretsData = oneInchService.generateSecrets(parseInt(secretsCount));
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
    const { quoteId, secretsData } = req.body;
    
    if (!quoteId || !secretsData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quote ID and secrets data are required' 
      });
    }
    
    // In a real implementation, you'd pull the quote from storage or rebuild it
    // For testing purposes, we're assuming the quote is available and valid
    const quote = { id: quoteId };
    
    const orderHash = await oneInchService.placeOrder(quote, secretsData);
    
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
app.get('/api/order/:orderHash', async (req: Request, res: Response) => {
  try {
    const { orderHash } = req.params;
    
    if (!orderHash) {
      return res.status(400).json({ success: false, message: 'Order hash is required' });
    }
    
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
app.get('/api/fills/:orderHash', async (req: Request, res: Response) => {
  try {
    const { orderHash } = req.params;
    
    if (!orderHash) {
      return res.status(400).json({ success: false, message: 'Order hash is required' });
    }
    
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
    const { orderHash, secret } = req.body;
    
    if (!orderHash || !secret) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order hash and secret are required' 
      });
    }
    
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
    const result = await oneInchService.executeCompleteSwap();
    
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
app.post('/api/monitor/:orderHash', async (req: Request, res: Response) => {
  try {
    const { orderHash } = req.params;
    const { secrets } = req.body;
    
    if (!orderHash || !secrets || !Array.isArray(secrets)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order hash and secrets array are required' 
      });
    }
    
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