import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Define types
interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  exchangeQuote: any;
  walletAddress: string;
}

// API endpoint URL
const API_URL = 'http://localhost:3000/api'; // Using relative URL for same-origin requests

const OneInchSwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  fromToken = "1INCH",
  toToken = "USDC",
  fromAmount = "1",
  exchangeQuote,
  walletAddress,
}) => {
  // State for tracking the swap progress
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [orderHash, setOrderHash] = useState('');
  const [swapStatus, setSwapStatus] = useState('');
  const [error, setError] = useState('');

  // Skip processing if modal is not open
  if (!isOpen) return null;

  // Function to execute the swap
  const executeSwap = async () => {
    setIsLoading(true);
    setCurrentStep(1);
    setError('');

    try {
      // Step 1: Health check
      setCurrentStep(1);
      toast.loading("Checking 1inch API connection...");
      const healthResp = await axios.get(`${API_URL}/health`);
      if (!healthResp.data || !healthResp.data.success) {
        throw new Error("API is not available. Please try again later.");
      }
      toast.success("Connected to 1inch API");
      
      // Step 2: Check token approval status and approve if needed
      setCurrentStep(2);
    //   const tokenAddress = exchangeQuote?.from?.tokenAddress || "0x3a8B787f78D775AECFEEa15706D4221B40F345AB"; // 1INCH on Base
      
    //   if (tokenAddress) {
    //     toast.loading("Checking token approval status...");
        
    //     // First check if token is already approved
    //     const checkApprovalResp = await axios.get(`${API_URL}/check-approval?tokenAddress=${tokenAddress}&walletAddress=${walletAddress}`);
        
    //     if (checkApprovalResp.data && checkApprovalResp.data.success && checkApprovalResp.data.isApproved) {
    //       toast.success("Token already approved");
    //     } else {
    //       // Token needs approval
    //       toast.loading("Approving token for spending...");
    //       const approveResp = await axios.post(`${API_URL}/approve-token`, { 
    //         tokenAddress,
    //         walletAddress 
    //       });
          
    //       if (approveResp.data && approveResp.data.success) {
    //         toast.success("Token approval confirmed");
    //       } else {
    //         throw new Error("Failed to approve token. Please try again.");
    //       }
    //     }
    //   } else {
    //     toast.success("No token approval needed");
    //   }
      
      // Step 3: Get quote
      setCurrentStep(3);
      toast.loading("Getting quote from 1inch Fusion+...");
      
      const quoteConfig = {
        srcChainId: exchangeQuote?.from?.chainId || 8453, // Base
        dstChainId: exchangeQuote?.to?.chainId || 10,  // Optimism
        srcTokenAddress: exchangeQuote?.from?.tokenAddress || "0x3a8B787f78D775AECFEEa15706D4221B40F345AB", // 1INCH on Base
        dstTokenAddress: exchangeQuote?.to?.tokenAddress || "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on Optimism
        amount: (parseFloat(fromAmount) * 1e18).toString(), // Convert to wei
        walletAddress: walletAddress || undefined
      };
      
      const quoteResp = await axios.post(`${API_URL}/get-quote`, quoteConfig);
      if (!quoteResp.data || !quoteResp.data.success) {
        throw new Error("Failed to get quote. Please try again.");
      }
      
      const quote = quoteResp.data.quote;
      toast.success("Quote received successfully!");
      
      // Step 4: Generate secrets
      setCurrentStep(4);
      toast.loading("Generating cryptographic secrets...");
      
      const secretsResp = await axios.post(`${API_URL}/generate-secrets`);
      if (!secretsResp.data || !secretsResp.data.success) {
        throw new Error("Failed to generate secrets. Please try again.");
      }
      
      const secretsData = secretsResp.data.secretsData;
      toast.success(`Generated ${secretsData.secrets.length} secrets for secure swap`);
      
      // Step 5: Place order
      setCurrentStep(5);
      toast.loading("Placing order with 1inch Fusion+...");
      
      const placeResp = await axios.post(`${API_URL}/place-order`, {
        quote,
        secretsData,
        walletAddress
      });
      
      if (!placeResp.data || !placeResp.data.success) {
        throw new Error("Failed to place order. Please try again.");
      }
      
      const hash = placeResp.data.orderHash;
      setOrderHash(hash);
      toast.success(`Order placed! Hash: ${hash.substring(0, 10)}...`);
      
      // Step 6: Check order status
      setCurrentStep(6);
      toast.loading("Checking order status...");
      
      const statusResp = await axios.get(`${API_URL}/order/${hash}`);
      if (!statusResp.data || !statusResp.data.success) {
        throw new Error("Failed to check order status. Please try again.");
      }
      
      const orderStatus = statusResp.data.order.status;
      setSwapStatus(orderStatus);
      toast.success(`Current status: ${orderStatus}`);
      
      // Step 7: Start monitoring in the background
      setCurrentStep(7);
      toast.loading("Starting monitoring process...");
      
      const monitorResp = await axios.post(`${API_URL}/monitor`, {
        orderHash: hash,
        secrets: secretsData.secrets
      });
      
      if (!monitorResp.data || !monitorResp.data.success) {
        console.warn("Monitoring may not have started correctly", monitorResp.data);
      }
      
      toast.success("Monitoring started! Your swap is being processed.");
      
      // Helper function to wait
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // Wait and check for fills
      setCurrentStep(8);
      toast.loading("Waiting for swap execution...");
      await wait(5000);
      
      try {
        const fillsResp = await axios.get(`${API_URL}/fills/${hash}`);
        
        if (fillsResp.data && fillsResp.data.success) {
          const fills = fillsResp.data.fills || [];
          toast.success(`Found ${fills.length} fills ready for acceptance`);
          
          // Submit secrets for any fills
          if (fills.length > 0) {
            for (const fill of fills) {
              toast.loading(`Submitting secret for fill ${fill.idx}...`);
              
              const secretResp = await axios.post(`${API_URL}/submit-secret`, {
                orderHash: hash,
                secret: secretsData.secrets[fill.idx]
              });
              
              if (secretResp.data && secretResp.data.success) {
                toast.success(`Secret submitted successfully`);
              }
            }
          }
        }
      } catch (fillError: any) {
        console.error(`Error checking for fills: ${fillError.message}`);
        toast.error(`Error checking for fills: ${fillError.message}`);
      }
      
      // Wait again and check final status
      setCurrentStep(9);
      toast.loading("Finalizing swap...");
      await wait(5000);
      
      try {
        const finalStatusResp = await axios.get(`${API_URL}/order/${hash}`);
        
        if (finalStatusResp.data && finalStatusResp.data.success) {
          const finalStatus = finalStatusResp.data.order.status;
          setSwapStatus(finalStatus);
          
          if (finalStatus === "executed") {
            toast.success("Swap completed! Tokens have been transferred successfully!");
          } else {
            toast.success(`Swap initiated! Current status: ${finalStatus}`);
            toast.success("The swap will complete shortly. You can close this window.");
          }
        }
      } catch (statusError: any) {
        console.error(`Error checking final status: ${statusError.message}`);
        toast.error(`Error checking final status: ${statusError.message}`);
      }
      
      // Close modal after successful initiation
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error during swap:', error.message);
      setError(error.message);
      toast.error(`Swap failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Alternative simpler approach using the execute-swap endpoint
  const executeSwapSimple = async () => {
    setIsLoading(true);
    setCurrentStep(1);
    setError('');

    try {
      toast.loading("Checking approval status...");
      
      // Check if token needs approval
      const tokenAddress = exchangeQuote?.from?.tokenAddress || "0x3a8B787f78D775AECFEEa15706D4221B40F345AB"; // 1INCH on Base
      if (tokenAddress) {
        const checkApprovalResp = await axios.get(`${API_URL}/check-approval?tokenAddress=${tokenAddress}&walletAddress=${walletAddress}`);
        
        if (checkApprovalResp.data && checkApprovalResp.data.success && !checkApprovalResp.data.isApproved) {
          // Token needs approval
          toast.loading("Approving token for spending...");
          const approveResp = await axios.post(`${API_URL}/approve-token`, { 
            tokenAddress,
            walletAddress 
          });
          
          if (approveResp.data && approveResp.data.success) {
            toast.success("Token approval confirmed");
          } else {
            throw new Error("Failed to approve token. Please try again.");
          }
        } else {
          toast.success("Token already approved");
        }
      }
      
      toast.loading("Initiating cross-chain swap...");
      
      // Use the all-in-one endpoint
      const response = await axios.post(`${API_URL}/execute-swap`, {
        srcChainId: exchangeQuote?.from?.chainId || 8453, // Base
        dstChainId: exchangeQuote?.to?.chainId || 10, // Optimism
        srcTokenAddress: exchangeQuote?.from?.tokenAddress || "0x3a8B787f78D775AECFEEa15706D4221B40F345AB", // 1INCH on Base
        dstTokenAddress: exchangeQuote?.to?.tokenAddress || "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on Optimism
        amount: (parseFloat(fromAmount) * 1e18).toString(),
        walletAddress: walletAddress || undefined
      });
      
      if (response.data && response.data.success) {
        const hash = response.data.orderHash;
        setOrderHash(hash);
        
        toast.success("Swap initiated successfully!");
        toast.success("Order is being processed in the background");
        
        // Close modal after successful initiation
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error("Failed to initiate swap. Please try again.");
      }
    } catch (error: any) {
      console.error('Error during swap:', error.message);
      setError(error.message);
      toast.error(`Swap failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Steps for the progress indicator
  const steps = [
    "Starting",
    "Checking Connection",
    "Approving Token",
    "Getting Quote",
    "Generating Secrets",
    "Placing Order",
    "Checking Status",
    "Starting Monitor",
    "Processing",
    "Finalizing"
  ];

  // Set default data for display
  const defaultExchangeQuote = {
    from: {
      chainName: "Base",
      token: "1INCH",
      amount: 1,
      value_usd: 0.98,
      tokenAddress: "0x3a8B787f78D775AECFEEa15706D4221B40F345AB"
    },
    to: {
      chainName: "Optimism",
      token: "USDC",
      amount: 1,
      value_usd: 1.00,
      tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"
    },
    exchange_rate: 1.02,
    network_fee_usd: 0.12
  };

  // Use provided exchange quote or default
  const displayQuote = exchangeQuote || defaultExchangeQuote;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Bridge with 1inch Fusion+</h2>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>

        {!isLoading ? (
          <>
            <div className="mb-4">
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">From: {displayQuote.from.chainName}</span>
                  <img src="https://cryptologos.cc/logos/1inch-1inch-logo.png" alt="1INCH" className="h-6 w-6" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">
                    {displayQuote.from.amount} {displayQuote.from.token}
                  </span>
                  <span className="text-gray-500">
                    ≈ ${displayQuote.from.value_usd.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">To: {displayQuote.to.chainName}</span>
                  <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.svg" alt="USDC" className="h-6 w-6" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">
                    {displayQuote.to.amount.toFixed(2)} {displayQuote.to.token}
                  </span>
                  <span className="text-gray-500">
                    ≈ ${displayQuote.to.value_usd.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>Exchange Rate:</span>
                <span>
                  1 {displayQuote.from.token} ≈ {displayQuote.exchange_rate.toFixed(2)} {displayQuote.to.token}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Network Fee:</span>
                <span>${displayQuote.network_fee_usd.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="w-1/2 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={executeSwapSimple}
                className="w-1/2 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                Confirm Swap
              </button>
            </div>
          </>
        ) : (
          <div className="py-4">
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>
              </div>
              <p className="text-center mt-2 text-gray-600">
                {steps[currentStep]}
              </p>
            </div>
            
            <div className="text-center mb-4">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-700 font-medium">Processing your cross-chain swap</p>
              {orderHash && (
                <p className="text-xs text-gray-500 mt-1">
                  Order: {orderHash.substring(0, 8)}...{orderHash.substring(orderHash.length - 8)}
                </p>
              )}
              {swapStatus && (
                <p className="text-sm text-blue-600 mt-1">
                  Status: {swapStatus}
                </p>
              )}
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}
            
            <p className="text-xs text-gray-500 text-center">
              Please don't close this window while your transaction is processing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OneInchSwapModal;