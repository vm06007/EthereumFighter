// src/services/oneInchService.ts
import { SDK, HashLock, PrivateKeyProviderConnector, NetworkEnum } from "@1inch/cross-chain-sdk";
import Web3 from "web3";
import { solidityPackedKeccak256, randomBytes, Contract, Wallet, JsonRpcProvider } from "ethers";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Environment variables and configuration
const config = {
  makerPrivateKey: process.env.WALLET_KEY || "",
  makerAddress: process.env.WALLET_ADDRESS || "",
  nodeUrl: process.env.RPC_URL_ETHEREUM || "",
  devPortalApiKey: process.env.DEV_PORTAL_KEY || "",
  // Default token configuration - can be overridden in API calls
  defaultConfig: {
    srcChainId: NetworkEnum.COINBASE,
    dstChainId: NetworkEnum.OPTIMISM,
    srcTokenAddress: "0xc5fecC3a29Fb57B5024eEc8a2239d4621e111CBE", // 1inch token on base
    dstTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC on optimism
  }
};

// Validate configuration
if (!config.makerPrivateKey || !config.makerAddress || !config.nodeUrl || !config.devPortalApiKey) {
  throw new Error("Missing required environment variables. Please check your .env file.");
}

// Initialize Web3 and provider
const web3Instance = new Web3(config.nodeUrl) as any;
const blockchainProvider = new PrivateKeyProviderConnector(config.makerPrivateKey, web3Instance);

// Initialize SDK
const sdk = new SDK({
  url: "https://api.1inch.dev/fusion-plus",
  authKey: config.devPortalApiKey,
  blockchainProvider,
});
console.log({config});

// Initialize JsonRpcProvider and signer for Ethers
const provider = new JsonRpcProvider(config.nodeUrl);
const signer = new Wallet(config.makerPrivateKey, provider);

// ABI for token approval
const approveABI = [
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Helper function to generate random bytes
function getRandomBytes32(): string {
  return "0x" + Buffer.from(randomBytes(32)).toString("hex");
}

// Define types for the service
export interface SwapConfig {
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  amount: string;
  invert?: boolean;
  makerAddress?: string;
}

export interface OrderStatus {
  status: string;
  orderHash: string;
  details?: any;
}

export interface SecretsData {
  secrets: string[];
  secretHashes: string[];
  merkleLeaves: string[];
  hashLock: any;
}

// Service class for 1inch operations
export class OneInchService {
  
  // Step 1: Approve token for spending
  async approveToken(tokenAddress: string): Promise<string> {
    try {
      const tokenContract = new Contract(tokenAddress, approveABI, signer);
      
      console.log(`Approving token ${tokenAddress} for spending...`);
      const tx = await tokenContract.approve(
        "0x111111125421ca6dc452d289314280a0f8842a65", // 1inch router address
        (2n ** 256n - 1n) // Max uint256
      );
      
      const receipt = await tx.wait();
      console.log("Token approval successful:", receipt.hash);
      return receipt.hash;
    } catch (error) {
      console.error("Error approving token:", error);
      throw new Error(`Failed to approve token: ${error}`);
    }
  }

  // Step 2: Get quote from 1inch API
  async getQuote(config: SwapConfig): Promise<any> {
    try {
      let { srcChainId, dstChainId, srcTokenAddress, dstTokenAddress, amount, invert } = config;
      
      // Handle inversion if specified
      if (invert) {
        [srcChainId, dstChainId] = [dstChainId, srcChainId];
        [srcTokenAddress, dstTokenAddress] = [dstTokenAddress, srcTokenAddress];
      }
      
      console.log("Fetching Fusion+ quote from 1inch API...");
      const params = {
        srcChainId,
        dstChainId,
        srcTokenAddress,
        dstTokenAddress,
        amount,
        enableEstimate: true,
        walletAddress: config.makerAddress,
      };
      
      const quote = await sdk.getQuote(params);
      console.log(`Quote received successfully`);
      return quote;
    } catch (error) {
      console.error("Error getting quote:", error);
      throw new Error(`Failed to get quote: ${error}`);
    }
  }

  // Step 3: Generate secrets and hash locks
  generateSecrets(secretsCount: number): SecretsData {
    try {
      console.log(`Generating ${secretsCount} secrets...`);
      const secrets = Array.from({ length: secretsCount }, () => getRandomBytes32());
      const secretHashes = secrets.map((x) => HashLock.hashSecret(x));
      
      // Convert secretHashes for MerkleLeaf[]
      const merkleLeaves = secretHashes.map((secretHash, i) =>
        solidityPackedKeccak256(["uint64", "bytes32"], [i, secretHash.toString()])
      );
      
      const hashLock = secretsCount === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(merkleLeaves as any);
      
      console.log(`Secrets and hash locks generated successfully`);
      return {
        secrets,
        secretHashes,
        merkleLeaves,
        hashLock
      };
    } catch (error) {
      console.error("Error generating secrets:", error);
      throw new Error(`Failed to generate secrets: ${error}`);
    }
  }

  // Step 4: Place order
  async placeOrder(quote: any, secretsData: SecretsData): Promise<string> {
    try {
      console.log("Placing order...");
      const quoteResponse = await sdk.placeOrder(quote, {
        walletAddress: config.makerAddress,
        hashLock: secretsData.hashLock,
        secretHashes: secretsData.secretHashes,
      });
      
      const orderHash = quoteResponse.orderHash;
      console.log(`Order successfully placed with hash: ${orderHash}`);
      return orderHash;
    } catch (error) {
      console.error("Error placing order:", error);
      throw new Error(`Failed to place order: ${error}`);
    }
  }

  // Step 5: Check order status
  async getOrderStatus(orderHash: string): Promise<OrderStatus> {
    try {
      console.log(`Checking status for order: ${orderHash}`);
      const order = await sdk.getOrderStatus(orderHash);
      console.log(`Order status: ${order.status}`);
      return {
        status: order.status,
        orderHash,
        details: order
      };
    } catch (error) {
      console.error("Error checking order status:", error);
      throw new Error(`Failed to check order status: ${error}`);
    }
  }

  // Step 6: Check for fills ready to accept
  async getReadyFills(orderHash: string): Promise<any> {
    try {
      console.log(`Checking for ready-to-accept fills for order: ${orderHash}`);
      const fillsObject = await sdk.getReadyToAcceptSecretFills(orderHash);
      console.log(`Found ${fillsObject.fills.length} fills ready to accept`);
      return fillsObject;
    } catch (error) {
      console.error("Error checking for ready fills:", error);
      throw new Error(`Failed to check for ready fills: ${error}`);
    }
  }

  // Step 7: Submit secret for a fill
  async submitSecret(orderHash: string, secret: string): Promise<any> {
    try {
      console.log(`Submitting secret for order: ${orderHash}`);
      const result = await sdk.submitSecret(orderHash, secret);
      console.log(`Secret submitted successfully`);
      return result;
    } catch (error) {
      console.error("Error submitting secret:", error);
      throw new Error(`Failed to submit secret: ${error}`);
    }
  }

  // Combined function for placing order with all steps
  async executeCompleteSwap(): Promise<any> {
    try {
      // Use default configuration
      const swapConfig: SwapConfig = {
        ...config.defaultConfig,
        amount: "1000000",
      };
      
      // Step 1: Approve token
      console.log(`Approving token ${swapConfig.srcTokenAddress} for spending... from ${swapConfig.makerAddress}`);
      
    //  await this.approveToken(swapConfig.srcTokenAddress);
      
      // Step 2: Get quote
      const quote = await this.getQuote(swapConfig);
      
      // Step 3: Generate secrets
      const secretsCount = quote.getPreset().secretsCount;
      const secretsData = this.generateSecrets(secretsCount);
      
      // Step 4: Place order
      const orderHash = await this.placeOrder(quote, secretsData);
      
      // Return data needed for monitoring
      return {
        orderHash,
        secrets: secretsData.secrets,
        status: "order_placed"
      };
    } catch (error) {
      console.error("Error executing complete swap:", error);
      throw new Error(`Failed to execute complete swap: ${error}`);
    }
  }

  // Function to monitor and handle an order until completion
  async monitorOrder(orderHash: string, secrets: string[]): Promise<void> {
    const intervalId = setInterval(async () => {
      console.log(`Polling for fills until order status is "executed"...`);
      
      try {
        // Check order status
        const order = await this.getOrderStatus(orderHash);
        if (order.status === "executed") {
          console.log(`Order is complete. Exiting.`);
          clearInterval(intervalId);
          return;
        }
        
        // Check for ready fills
        const fillsObject = await this.getReadyFills(orderHash);
        if (fillsObject.fills.length > 0) {
          for (const fill of fillsObject.fills) {
            try {
              await this.submitSecret(orderHash, secrets[fill.idx]);
              console.log(`Secret submitted for fill index: ${fill.idx}`);
            } catch (error) {
              console.error(`Error submitting secret: ${error}`);
            }
          }
        }
      } catch (error) {
        console.error(`Error monitoring order: ${error}`);
      }
    }, 5000);
  }
}

export default new OneInchService();