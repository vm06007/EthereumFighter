"use client";

import Button from "components/Button";
import Wrapper from "components/Wrapper";
import { parseEther } from "viem";
import type { Config } from "wagmi";
import { useSendTransaction, useEnsAddress, useAccount } from "wagmi";
import type { SendTransactionVariables } from "wagmi/query";
import { useEffect, useState } from "react";

interface SendTransactionMintProps {
    to: string;
    amount: string;
    warning?: string;
    buttonText?: string;
    onSuccess?: (txHash: string, amount: string) => void;
    onClose?: () => void;
    playerAddress?: string;
}

const SendTransactionMint = ({
    to,
    amount,
    warning,
    buttonText = "Confirm Transaction",
    onSuccess,
    onClose,
    playerAddress
}: SendTransactionMintProps) => {
    const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | undefined>(undefined);
    const [currentEnsName, setCurrentEnsName] = useState<string | undefined>(undefined);
    const [apiCallStatus, setApiCallStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [apiResponse, setApiResponse] = useState<any>(null);

    // Get the current account address
    const { address: connectedAddress } = useAccount();

    // Default values
    const defaultTo = "0x641AD78BAca220C5BD28b51Ce8e0F495e85Fe689";
    const defaultAmount = "0.01";

    // Determine ENS resolution strategy
    useEffect(() => {
        if (!to) {
            setCurrentEnsName(undefined);
            setResolvedAddress(defaultTo as `0x${string}`);
            return;
        }

        if (to.startsWith('0x')) {
            setCurrentEnsName(undefined);
            setResolvedAddress(to as `0x${string}`);
            return;
        }

        // If it already has .eth, use it directly
        if (to.includes('.eth')) {
            setCurrentEnsName(to);
            return;
        }

        // If it doesn't have .eth and doesn't look like an address, try adding .eth
        if (!to.startsWith('0x')) {
            setCurrentEnsName(`${to}.eth`);
            return;
        }
    }, [to]);

    // Always call useEnsAddress hook unconditionally
    const { data: ensAddress, isLoading: isEnsLoading, isError: isEnsError } = useEnsAddress({
        name: currentEnsName,
        query:  {
            enabled: !!currentEnsName
        }
    });

    // Update resolved address when ENS resolution completes
    useEffect(() => {
        if (ensAddress) {
            setResolvedAddress(ensAddress as any);
        } else if (isEnsError && currentEnsName && to && !to.includes('.eth')) {
            // If ENS resolution fails and we were trying to resolve a name with .eth added,
            // fall back to the default address
            setResolvedAddress(defaultTo as `0x${string}`);
        }
    }, [ensAddress, isEnsError, currentEnsName, to]);

    const finalAmount = amount || defaultAmount;

    const { data: txData, isPending, isSuccess, sendTransaction } = useSendTransaction();

    // Track whether we've already processed this transaction
    const [processedTxHash, setProcessedTxHash] = useState<string | null>(null);

    // Call API endpoint after successful transaction
    useEffect(() => {
        // Only proceed if we have a successful transaction and a transaction hash
        if (isSuccess && txData && onSuccess) {
            // Check if we've already processed this transaction
            if (processedTxHash === txData) {
                return; // Skip if we've already processed this tx hash
            }

            // Mark this transaction as processed
            setProcessedTxHash(txData);

            // Call the success callback with transaction hash and amount
            onSuccess(txData, finalAmount);

            // Make API call to notify about successful minting
            const notifyMintSuccess = async () => {
                try {
                    setApiCallStatus("loading");

                    const response = await fetch(
                        "https://api.metal.build/token/0x18c86ea247c36f534491dcd2b7abea4534cc5c23/distribute",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "x-api-key": process.env.METAL_KEY || "",
                            },
                            body: JSON.stringify({
                                sendToAddress: playerAddress,
                                amount: 100
                            }),
                        }
                    )

                    console.log(response, 'response');

                    if (response.ok) {
                        const data = await response.json();
                        setApiResponse(data);
                        setApiCallStatus('success');
                        console.log('Mint notification sent successfully:', data);
                    } else {
                        setApiCallStatus('error');
                        console.error('Failed to send mint notification:', await response.text());
                    }
                } catch (error) {
                    setApiCallStatus('error');
                    console.error('Error sending mint notification:', error);
                }
            };

            notifyMintSuccess();
        }
    }, [isSuccess, txData, onSuccess, processedTxHash]);

    // Prepare transaction only when we have a resolved address
    const prepareTransaction = () => {
        if (!resolvedAddress) return;

        const transactionRequest: SendTransactionVariables<Config, number> = {
            to: resolvedAddress,
            value: parseEther(finalAmount),
            type: "eip1559",
        };

        sendTransaction(transactionRequest);
    };

    // Determine what to display in the UI
    const isAttemptingEnsResolution = !!currentEnsName;
    const isExplicitEns = to && to.includes('.eth');
    const isImplicitEns = isAttemptingEnsResolution && !isExplicitEns;

    return (
        <Wrapper title="">
            {warning && (
                <div className="rounded bg-red-400 px-2 py-1 text-sm text-white mb-2">
                    {warning}
                </div>
            )}

            {/* ENS Resolution UI */}
            {isAttemptingEnsResolution && isEnsLoading && (
                <div className="text-sm mb-2">Resolving ENS name: {currentEnsName}...</div>
            )}
            {isAttemptingEnsResolution && ensAddress && (
                <div className="text-sm mb-2">
                    Resolved {isImplicitEns ? `${to} (${currentEnsName})` : currentEnsName} to {ensAddress}
                </div>
            )}
            {isAttemptingEnsResolution && !isEnsLoading && !ensAddress && (
                <div className="text-sm text-red-500 mb-2">Could not resolve ENS name: {currentEnsName}</div>
            )}
            {/*to && to.startsWith('0x') && (
                <div className="text-sm mb-2">Using address: {to}</div>
            )*/}

            {/* Transaction amount */}
            {/*<div className="text-sm mb-3">
                Amount: <span className="font-medium">{finalAmount} ETH</span>
            </div>*/}

            {/* Transaction status */}
            <div>
                {isPending && <div className="text-sm text-amber-600">Check wallet...</div>}
                {isSuccess && <div className="text-sm text-green-600">Successful!</div>}
                {apiCallStatus === 'loading' && <div className="text-sm text-blue-600">Minting...</div>}
                {apiCallStatus === 'success' && <div className="text-sm text-green-600">Tokens minted!</div>}
                {/*apiCallStatus === 'error' && <div className="text-sm text-red-600">Minting API error</div>*/}
            </div>

            {/* Action button */}
            <div className="flex justify-between items-center">
                <div className="flex-center">
                    <div style={{left: "30px"}} className="absolute gamepad-button-wrapper">
                        <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--cross gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                    </div>
                    <Button
                        cta={buttonText}
                        onClick_={() => prepareTransaction()}
                        disabled={isPending || (isAttemptingEnsResolution && isEnsLoading) || apiCallStatus === 'loading'}
                    />
                    <div style={{left: "180px"}} className="absolute gamepad-button-wrapper">
                        <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--circle gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                    </div>
                    <Button
                        cta={"Leave"}
                        onClick_={() => {
                            if (onClose) {
                                onClose();
                            }
                        }}
                        disabled={isPending || (isAttemptingEnsResolution && isEnsLoading) || apiCallStatus === 'loading'}
                    />
                </div>
            </div>

            {/* Transaction details (only show for successful txs) */}
            {isSuccess && txData && (
                <div className="mt-3 text-xs text-gray-500 break-all">
                    TX: {txData}
                </div>
            )}
        </Wrapper>
    );
};

export default SendTransactionMint;