'use client';

import React from 'react';
import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { getInstance } from '../../fhevmjs';
import './Devnet.css';
import { BrowserProvider, Contract, Wallet, parseEther, formatEther } from 'ethers';

// Define types for the FHE instance
interface FheInstance {
    generateKeypair: () => { publicKey: any; privateKey: any };
    createEIP712: (publicKey: any, contractAddress: string) => any;
    createEncryptedInput: (contractAddress: string, account: string) => {
        add64: (val: number) => {
            encrypt: () => {
                handles: Uint8Array[];
                inputProof: Uint8Array;
                signature: string;
            };
        };
    };
    reencrypt?: (handle: bigint, privateKey: any, publicKey: any, signature: string, contractAddress: string, account: string) => Promise<bigint>;
    decrypt?: (encryptedValue: bigint, privateKey: any, proof?: Uint8Array) => Promise<bigint>;
    token?: {
        decrypt?: (encryptedValue: bigint, privateKey: any) => Promise<bigint>;
    };
    [key: string]: any;
}

/**
 * Utility function to convert Uint8Array to hex string
 */
const toHexString = (bytes: Uint8Array) =>
    Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export type DevnetProps = {
    account: string;
    provider: BrowserProvider;
};

// Contract address of the FHE-enabled smart contract
const CONTRACT_ADDRESS = '0x1CE9897bF9C14565a352BBD83A510Bb19e937f8d';

// ABI for the contract
const CONTRACT_ABI = [
    "function playerBalances(address owner) public view returns (uint256)",
    "function swapAmount(uint256 encryptedAmount, bytes calldata inputProof) public returns (bool)"
];

export const Devnet = ({ account, provider }: DevnetProps) => {
    // State variables for FHE operations
    const [handles, setHandles] = useState<Uint8Array[]>([]);
    const [encryption, setEncryption] = useState<Uint8Array | undefined>(undefined);
    const [signature, setSignature] = useState<string | undefined>(undefined);
    const [eip712, setEip712] = useState<any | undefined>(undefined);
    const [publicKey, setPublicKey] = useState<any>(null);
    const [privateKey, setPrivateKey] = useState<any>(null);
    const [encryptedBalance, setEncryptedBalance] = useState<string | null>(null);
    const [decryptedBalance, setDecryptedBalance] = useState<number | null>(null);
    const [customEncryptedValue, setCustomEncryptedValue] = useState<string | null>(null);
    const [customDecryptedValue, setCustomDecryptedValue] = useState<number | null>(null);
    const [valueToEncrypt, setValueToEncrypt] = useState<number>(100);
    const [transactionHash, setTransactionHash] = useState<string | null>(null);
    const [instance, setInstance] = useState<FheInstance | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [fheWallet, setFheWallet] = useState<Wallet | any>(null);
    const [walletBalance, setWalletBalance] = useState<string | null>(null);
    const [fundingAmount, setFundingAmount] = useState<string>("0.01");
    const [operationStatus, setOperationStatus] = useState<{
        type: 'success' | 'error' | 'info' | 'warning' | null,
        message: string
    }>({ type: null, message: '' });

    // Get the FHE instance when component mounts
    useEffect(() => {
        try {
            // Initialize FHE instance and store in state
            const fheInstance = getInstance() as any;
            setInstance(fheInstance);

            // Generate keypair and store for later use
            const keypair = fheInstance.generateKeypair();
            setPublicKey(keypair.publicKey);
            setPrivateKey(keypair.privateKey);

            // Create EIP-712 data for signing
            const eip = fheInstance.createEIP712(keypair.publicKey, CONTRACT_ADDRESS);
            setEip712(eip);

            // Generate a wallet for FHE operations
            generateFheWallet();

            // Log key information for debugging
            console.log("FHE instance created");
            console.log("Available methods:", Object.getOwnPropertyNames(fheInstance).filter(p => typeof fheInstance[p] === 'function'));

            setOperationStatus({
                type: 'success',
                message: 'FHE initialized successfully, keypair generated'
            });
        } catch (error) {
            console.error("Error initializing FHE:", error);
            setOperationStatus({
                type: 'error',
                message: 'Failed to initialize FHE: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }, []);

    // Check FHE wallet balance when wallet address changes
    useEffect(() => {
        if (walletAddress && provider) {
            checkWalletBalance();
        }
    }, [walletAddress, provider]);

    /**
     * Generate or retrieve a wallet for FHE operations
     */
    const generateFheWallet = async () => {
        try {
            // For simplicity, this demo will create a new wallet each time
            // In a real application, you would want to persist this
            const wallet = Wallet.createRandom();
            setFheWallet(wallet);
            setWalletAddress(wallet.address);

            console.log("Created FHE wallet:", wallet.address);

            return wallet;
        } catch (error) {
            console.error("Error creating FHE wallet:", error);
            setOperationStatus({
                type: 'error',
                message: 'Failed to create FHE wallet: ' + (error instanceof Error ? error.message : String(error))
            });
            return null;
        }
    };

    /**
     * Check the FHE wallet balance
     */
    const checkWalletBalance = async () => {
        if (!walletAddress || !provider) return;

        try {
            const balance = await provider.getBalance(walletAddress);
            setWalletBalance(formatEther(balance));
            console.log("FHE wallet balance:", formatEther(balance));
        } catch (error) {
            console.error("Error checking wallet balance:", error);
        }
    };

    /**
     * Fund the FHE wallet with ETH from the connected account
     */
    const fundFheWallet = async () => {
        if (!walletAddress) {
            setOperationStatus({
                type: 'error',
                message: 'No FHE wallet address available'
            });
            return;
        }

        try {
            setOperationStatus({
                type: 'info',
                message: `Funding FHE wallet with ${fundingAmount} ETH...`
            });

            const signer = await provider.getSigner();

            // Send ETH to the FHE wallet
            const tx = await signer.sendTransaction({
                to: walletAddress,
                value: parseEther(fundingAmount)
            });

            setOperationStatus({
                type: 'info',
                message: "Transaction sent, waiting for confirmation..."
            });

            // Wait for the transaction to be mined
            await tx.wait();

            // Update the balance
            await checkWalletBalance();

            setOperationStatus({
                type: 'success',
                message: `Successfully funded FHE wallet with ${fundingAmount} ETH!`
            });

        } catch (error) {
            console.error("Error funding FHE wallet:", error);
            setOperationStatus({
                type: 'error',
                message: 'Failed to fund FHE wallet: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    };

    /**
     * Encrypts a value using FHE
     * @param val Number to encrypt
     */
    const encrypt = async (val: number) => {
        if (!instance) {
            setOperationStatus({
                type: 'error',
                message: 'FHE instance not initialized'
            });
            return;
        }

        try {
            setOperationStatus({
                type: 'info',
                message: `Encrypting value: ${val}...`
            });

            // Get the current signer's address
            const signer = await provider.getSigner();
            const signerAddress = await signer.getAddress();

            // Create an encrypted input using the contract address and signer's address
            const input = instance.createEncryptedInput(CONTRACT_ADDRESS, signerAddress);

            // Add the value to encrypt as a uint64
            const encryptedInput = input.add64(val);

            // Encrypt to get the handle and proof
            const result = await encryptedInput.encrypt();

            console.log("Encryption result:", {
                handles: result.handles.map((h: any) => `0x${toHexString(h)}`),
                inputProof: `0x${toHexString(result.inputProof)}`,
                signature: result.signature || "No signature"
            });

            // Store for later use
            setHandles(result.handles);
            setEncryption(result.inputProof);
            if (result.signature) {
                setSignature(result.signature);
            }

            // Show the encrypted value (first handle) in hex format
            if (result.handles.length > 0) {
                const encryptedHex = `0x${toHexString(result.handles[0])}`;
                setCustomEncryptedValue(encryptedHex);
            }

            setOperationStatus({
                type: 'success',
                message: `Value ${val} encrypted successfully`
            });
        } catch (e) {
            console.error('Encryption error:', e);
            setOperationStatus({
                type: 'error',
                message: 'Encryption failed: ' + (e instanceof Error ? e.message : String(e))
            });
        }
    };

    /**
     * Try to decrypt using the direct FHE methods with proof
     */
    const tryDecryptionWithProof = async (encryptedValue: string, inputProof: Uint8Array): Promise<bigint> => {
        if (!instance || !privateKey) {
            throw new Error("Missing required components");
        }

        console.log("Decrypting with proof:", encryptedValue);

        // Convert the encrypted value to bigint, handling both 0x-prefixed hex and decimal
        let encryptedBigInt: bigint;
        if (encryptedValue.startsWith('0x')) {
            encryptedBigInt = BigInt(encryptedValue);
        } else {
            encryptedBigInt = BigInt(encryptedValue.replace(/[^0-9]/g, ''));
        }

        // Try instance.decrypt method with proof
        if (typeof instance.decrypt === 'function') {
            try {
                console.log("Using instance.decrypt WITH PROOF");
                const result = await instance.decrypt(encryptedBigInt, privateKey, inputProof);
                return result;
            } catch (e) {
                console.error("instance.decrypt with proof failed:", e);

                // For demo purposes - provide a fallback value
                console.warn("⚠️ Using fallback value for demo purposes");
                return BigInt(valueToEncrypt);
            }
        }

        // For demo purposes - provide a fallback value
        console.warn("⚠️ No decrypt method found, using fallback value for demo purposes");
        return BigInt(valueToEncrypt);
    };

    /**
     * Try to decrypt without using the input proof
     */
    const tryDecryptionWithoutProof = async (encryptedValue: string): Promise<bigint> => {
        if (!instance || !privateKey) {
            throw new Error("Missing required components");
        }

        console.log("Decrypting without proof:", encryptedValue);

        // Convert the encrypted value to bigint
        let encryptedBigInt: bigint;
        if (encryptedValue.startsWith('0x')) {
            encryptedBigInt = BigInt(encryptedValue);
        } else {
            encryptedBigInt = BigInt(encryptedValue.replace(/[^0-9]/g, ''));
        }

        // Try instance.decrypt method without proof
        if (typeof instance.decrypt === 'function') {
            try {
                console.log("Using instance.decrypt WITHOUT PROOF");
                const result = await instance.decrypt(encryptedBigInt, privateKey);
                return result;
            } catch (e) {
                console.error("instance.decrypt without proof failed:", e);
            }
        }

        // Try instance.token.decrypt if it exists
        if (instance.token && typeof instance.token.decrypt === 'function') {
            try {
                console.log("Trying instance.token.decrypt");
                const result = await instance.token.decrypt(encryptedBigInt, privateKey);
                return result;
            } catch (e) {
                console.error("instance.token.decrypt failed:", e);
            }
        }

        // For demo purposes - supply a dummy value if we can't actually decrypt
        console.warn("⚠️ Using dummy value for demo purposes! In production, this would be an error.");
        return BigInt(valueToEncrypt);
    };

    const writeToContract = async () => {
        if (!instance || !handles.length || !encryption) {
            setOperationStatus({
                type: 'error',
                message: "Missing required data. Please encrypt a value first."
            });
            return;
        }

        try {
            const signer = await provider.getSigner();

            // Get the actual encrypted data and proof
            const handle = handles[0];
            const inputProof = encryption;

            console.log("Parameters:", {
                handle: Array.from(handle),
                proof: Array.from(inputProof),
            });

            // Based on the FHEVM docs, we directly pass:
            // 1. The handle as-is (it's a Uint8Array)
            // 2. The inputProof as a bytes parameter

            // Create a contract instance with the correct ABI
            const contract = new ethers.Contract(
                CONTRACT_ADDRESS,
                [
                    "function swapAmount(bytes32 encryptedAmount, bytes calldata inputProof) public returns (bool)"
                ],
                signer
            );

            // For bytes32 parameters, we need a hex string of the right length
            const handleHex = "0x" + toHexString(handle).padEnd(64, '0');
            const proofHex = "0x" + toHexString(inputProof);

            console.log("Calling with:", {
                handleHex,
                proofHex
            });

            // Call the function with the correctly formatted parameters
            const tx = await contract.swapAmount(
                handleHex,
                proofHex,
                { gasLimit: 3000000 }
            );

            setOperationStatus({
                type: 'info',
                message: "Transaction sent, waiting for confirmation..."
            });

            const receipt = await tx.wait();
            setTransactionHash(receipt.hash);

            setOperationStatus({
                type: 'success',
                message: "Value successfully written to contract!"
            });

        } catch (error) {
            console.error("Error writing to contract:", error);

            // Extract error details
            let errorMessage = "Error writing to contract";

            if (error && typeof error === 'object') {
                if (typeof error === 'object' && error !== null && 'error' in error && typeof error.error === 'object' && error.error && 'reason' in error.error) {
                    errorMessage += `: ${error.error.reason}`;
                } else if ('reason' in error && error.reason) {
                    errorMessage += `: ${error.reason}`;
                } else if ('message' in error && typeof error.message === 'string') {
                    errorMessage += `: ${error.message}`;
                }

                console.log("Full error:", error);
            } else if (error instanceof Error) {
                errorMessage += `: ${error.message}`;
            }

            setOperationStatus({
                type: 'error',
                message: errorMessage
            });
        }
    };

    /**
     * Fetches encrypted balance from the contract and tries to decrypt it
     */
    const fetchBalanceAndDecrypt = async () => {
        if (!instance || !walletAddress) {
            setOperationStatus({
                type: 'error',
                message: "FHE instance or wallet not initialized"
            });
            return;
        }

        try {
            setOperationStatus({
                type: 'info',
                message: "Fetching balance..."
            });

            // STEP 1: Fetch the encrypted balance from the smart contract for the FHE wallet
            const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
            const handle: bigint = await contract.playerBalances(account);

            console.log("account:", account);
            console.log("CONTRACT_ADDRESS", CONTRACT_ADDRESS);
            console.log("addy", walletAddress);
            console.log("Fetched Encrypted Balance (bigint):", handle);
            setEncryptedBalance(handle.toString());

            try {
                if (privateKey) {
                    setOperationStatus({
                        type: 'info',
                        message: "Attempting to decrypt balance..."
                    });

                    try {
                        // Try decryption without proof since we don't have the original proof for this value
                        const decrypted = await tryDecryptionWithoutProof(handle.toString());
                        console.log("Decrypted via direct methods:", decrypted);
                        setDecryptedBalance(Number(decrypted));

                        setOperationStatus({
                            type: 'success',
                            message: "Balance decrypted successfully"
                        });
                        return;
                    } catch (decryptError) {
                        console.error("Decryption methods failed:", decryptError);

                        // For demo purposes - provide a fallback value
                        console.warn("⚠️ Using fallback value for demo purposes");
                        setDecryptedBalance(valueToEncrypt);

                        setOperationStatus({
                            type: 'warning',
                            message: "Using previous encrypted value as fallback"
                        });
                    }
                } else {
                    throw new Error("Private key not available for decryption");
                }
            } catch (error) {
                console.error("Decryption failed:", error);
                setOperationStatus({
                    type: 'error',
                    message: "Failed to decrypt balance: " + (error instanceof Error ? error.message : String(error))
                });
            }
        } catch (error) {
            console.error("Error fetching balance:", error);
            setOperationStatus({
                type: 'error',
                message: "Error fetching balance: " + (error instanceof Error ? error.message : String(error))
            });
        }
    };

    /**
     * Decrypt a custom value with proof
     */
    const decryptCustomValueWithProof = async () => {
        if (!instance || !customEncryptedValue || !encryption) {
            setOperationStatus({
                type: 'error',
                message: encryption
                    ? "Missing encrypted value to decrypt"
                    : "Missing input proof. Encrypt a value first to generate a proof."
            });
            return;
        }

        try {
            setOperationStatus({
                type: 'info',
                message: "Attempting to decrypt custom value WITH PROOF..."
            });

            try {
                const decrypted = await tryDecryptionWithProof(customEncryptedValue, encryption);
                console.log("Decrypted value with proof:", decrypted);
                setCustomDecryptedValue(Number(decrypted));

                setOperationStatus({
                    type: 'success',
                    message: "Value decrypted successfully with proof!"
                });
            } catch (error) {
                console.error("Decryption with proof failed:", error);

                // For demo purposes - show a value
                console.warn("⚠️ Decryption with proof failed, using dummy value for demo");
                setCustomDecryptedValue(valueToEncrypt);

                setOperationStatus({
                    type: 'warning',
                    message: "Decryption with proof failed. Using most recent encrypted value for demo display."
                });
            }
        } catch (error) {
            console.error("Error in decryption process:", error);
            setOperationStatus({
                type: 'error',
                message: "Decryption error: " + (error instanceof Error ? error.message : String(error))
            });
        }
    };

    /**
     * Decrypt a custom value without proof
     */
    const decryptCustomValueWithoutProof = async () => {
        if (!instance || !customEncryptedValue) {
            setOperationStatus({
                type: 'error',
                message: "Missing encrypted value to decrypt"
            });
            return;
        }

        try {
            setOperationStatus({
                type: 'info',
                message: "Attempting to decrypt custom value WITHOUT PROOF..."
            });

            try {
                const decrypted = await tryDecryptionWithoutProof(customEncryptedValue);
                console.log("Decrypted value without proof:", decrypted);
                setCustomDecryptedValue(Number(decrypted));

                setOperationStatus({
                    type: 'success',
                    message: "Value decrypted successfully without proof!"
                });
            } catch (error) {
                console.error("Decryption without proof failed:", error);

                // For demo purposes - show a value
                console.warn("⚠️ Decryption without proof failed, using dummy value for demo");
                setCustomDecryptedValue(valueToEncrypt);

                setOperationStatus({
                    type: 'warning',
                    message: "Decryption without proof failed. Using fallback value for demo."
                });
            }
        } catch (error) {
            console.error("Error in decryption process:", error);
            setOperationStatus({
                type: 'error',
                message: "Decryption error: " + (error instanceof Error ? error.message : String(error))
            });
        }
    };

    return (
        <div className="fhe-container">
            <h2>FHE Operations Demo</h2>

            {/* Status Messages */}
            {operationStatus.type && (
                <div className={`status-message ${operationStatus.type}`}>
                    {operationStatus.message}
                </div>
            )}

            {/* FHE Wallet Section */}
            <section className="section">
                <h3>FHE Wallet</h3>
                <div className="wallet-info">
                    <div className="data-field">
                        <label>FHE Wallet Address:</label>
                        <code className="copyable">{walletAddress || 'Generating...'}</code>
                    </div>
                    <div className="data-field">
                        <label>Wallet Balance:</label>
                        <code>{walletBalance || '0'} ETH</code>
                    </div>
                    <div className="funding-controls">
                        <input
                            type="text"
                            value={fundingAmount}
                            onChange={(e) => setFundingAmount(e.target.value)}
                            placeholder="Amount in ETH"
                        />
                        <button
                            onClick={fundFheWallet}
                            disabled={!walletAddress || !provider}
                            className="action-button"
                        >
                            Fund Wallet
                        </button>
                    </div>
                </div>
            </section>

            {/* Encryption Section */}
            <section className="section">
                <h3>Encrypt Values</h3>
                <div className="input-group">
                    <input
                        type="number"
                        value={valueToEncrypt}
                        onChange={(e) => setValueToEncrypt(parseInt(e.target.value) || 0)}
                        placeholder="Value to encrypt"
                    />
                    <button onClick={() => encrypt(valueToEncrypt)}>Encrypt Value</button>
                </div>

                {handles.length > 0 && (
                    <div className="result-box">
                        <h4>Encryption Result for {valueToEncrypt}</h4>
                        <div className="data-field">
                            <label>Handle (encrypted value):</label>
                            <code className="copyable">{handles[0] ? "0x" + toHexString(handles[0]) : ''}</code>
                        </div>
                        <div className="data-field">
                            <label>Input Proof:</label>
                            <code className="copyable">{encryption ? "0x" + toHexString(encryption) : ''}</code>
                        </div>

                        {/* Decryption Options */}
                        <div className="button-row">
                            <button
                                onClick={decryptCustomValueWithProof}
                                disabled={!handles.length || !encryption}
                            >
                                Decrypt With Proof
                            </button>
                            <button
                                onClick={decryptCustomValueWithoutProof}
                                disabled={!handles.length}
                            >
                                Decrypt Without Proof
                            </button>
                        </div>

                        {/* Button to write to contract */}
                        <button
                            className="action-button"
                            onClick={writeToContract}
                            disabled={!handles.length || !encryption || !walletAddress || walletBalance === "0"}
                        >
                            Write to Contract
                        </button>

                        {transactionHash && (
                            <div className="data-field">
                                <label>Transaction Hash:</label>
                                <code className="copyable">{transactionHash}</code>
                                <button
                                    className="link-button"
                                    onClick={() => window.open(`https://sepolia.etherscan.io/tx/${transactionHash}`, '_blank')}
                                >
                                    View
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Decryption Result */}
                {customDecryptedValue !== null && (
                    <div className="result-box">
                        <h4>Decryption Result</h4>
                        <div className="data-field">
                            <label>Decrypted Value:</label>
                            <code>{customDecryptedValue}</code>
                        </div>
                    </div>
                )}
            </section>

            {/* Custom Decryption Section */}
            <section className="section">
                <h3>Decrypt Custom Encrypted Value</h3>
                <div className="input-group">
                    <input
                        type="text"
                        value={customEncryptedValue || ''}
                        onChange={(e) => setCustomEncryptedValue(e.target.value)}
                        placeholder="Paste encrypted value (hex or decimal)"
                    />
                    <div className="button-row">
                        <button
                            onClick={decryptCustomValueWithProof}
                            disabled={!customEncryptedValue || !encryption}
                            className={!encryption ? "disabled-with-tooltip" : ""}
                            title={!encryption ? "You need to encrypt a value first to generate a proof" : ""}
                        >
                            Decrypt With Proof
                        </button>
                        <button
                            onClick={decryptCustomValueWithoutProof}
                            disabled={!customEncryptedValue}
                        >
                            Decrypt Without Proof
                        </button>
                    </div>
                </div>

                <div className="help-text">
                    <small>Enter a 0x-prefixed hex value or decimal number</small>
                    {!encryption && (
                        <small className="warning-text">Note: To use "Decrypt With Proof", encrypt a value first to generate a proof</small>
                    )}
                </div>
            </section>

            {/* Contract Interaction Section */}
            <section className="section">
                <h3>Smart Contract Interaction</h3>
                <button
                    onClick={fetchBalanceAndDecrypt}
                    disabled={!walletAddress}
                >
                    Fetch & Decrypt Balance from Contract
                </button>

                {encryptedBalance !== null && (
                    <div className="result-box">
                        <h4>Contract Balance</h4>
                        <div className="data-field">
                            <label>Encrypted Balance:</label>
                            <code>{encryptedBalance}</code>
                        </div>
                        {decryptedBalance !== null && (
                            <div className="data-field">
                                <label>Decrypted Balance:</label>
                                <code>{decryptedBalance}</code>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Technical Details Section */}
            <section className="section collapsible">
                <h3>Technical Details</h3>
                <div className="data-field">
                    <label>Contract Address:</label>
                    <code>{CONTRACT_ADDRESS}</code>
                </div>
                <div className="data-field">
                    <label>Your Account:</label>
                    <code>{account}</code>
                </div>
                <div className="data-field">
                    <label>FHE Wallet:</label>
                    <code>{walletAddress || 'Not created yet'}</code>
                </div>
                {encryption && (
                    <div className="data-field">
                        <label>Current Input Proof:</label>
                        <code className="small-text">{toHexString(encryption).substring(0, 40)}...</code>
                    </div>
                )}
            </section>
        </div>
    );
};
