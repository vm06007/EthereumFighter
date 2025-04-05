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

    // Call API endpoint after successful transaction
    useEffect(() => {
        if (isSuccess && txData && onSuccess) {
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
                                "x-api-key": "36a07914-87d1-5a8b-9e46-f1dbdb03c553",
                            },
                            body: JSON.stringify({
                                sendToAddress: playerAddress,
                                amount: 100
                            }),
                        }
                    )

                    // const distribute = await response.json();
                    console.log(response, 'response');
                    // console.log(distribute, 'distribute');

                    // replace with MINT integration
                    /*const response = await fetch('/api/mint-notification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            txHash: txData,
                            amount: finalAmount,
                            playerAddress: playerAddress || 'unknown',
                            timestamp: new Date().toISOString(),
                        }),
                    });*/

                    if (response.ok) {
                        const data = await response.json();
                        setApiResponse(data);
                        setApiCallStatus('success');
                        console.log('Mint notification sent successfully:', data);

                        // Close modal after successful API call (with a small delay for UI feedback)
                        if (onClose) {
                            setTimeout(() => {
                                onClose();
                            }, 2000);
                        }
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
    }, [isSuccess, txData, onSuccess, onClose, finalAmount, playerAddress]);

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

            {/* Action button */}
            <div className="flex justify-between items-center">
                <Button
                    cta={buttonText}
                    onClick_={() => prepareTransaction()}
                    disabled={isPending || (isAttemptingEnsResolution && isEnsLoading) || apiCallStatus === 'loading'}
                />

                {/* Transaction status */}
                <div className="ml-3">
                    {isPending && <div className="text-sm text-amber-600">Check wallet...</div>}
                    {isSuccess && <div className="text-sm text-green-600">Transaction successful!</div>}
                    {apiCallStatus === 'loading' && <div className="text-sm text-blue-600">Minting METAL tokens...</div>}
                    {apiCallStatus === 'success' && <div className="text-sm text-green-600">Tokens minted!</div>}
                    {apiCallStatus === 'error' && <div className="text-sm text-red-600">Minting API error</div>}
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