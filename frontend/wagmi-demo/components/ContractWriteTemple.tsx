'use client';

import { useState } from 'react';
import Wrapper from 'components/Wrapper';
import { shorten, type AddressString } from 'lib/utils';
import { useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';

import Button from './Button';
import MonoLabel from './MonoLabel';

// Game interaction ABI
const ABI = [
    {
        inputs: [],
        name: "joinGame",
        outputs: [
            {
                internalType: "uint8",
                name: "playerNumber",
                type: "uint8",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
] as const;

type ContractWriteTempleProps = {
    playerAddress: string;
    playerWallet: string;
    amount?: string;
    token?: string;
    templeId: number;
    onClose: () => void;
};

// Component still named ContractWriteTemple for backward compatibility
const ContractWriteTemple = ({
    playerAddress,
    playerWallet,
    amount = "100",
    token = "USDC",
    templeId,
    onClose
}: ContractWriteTempleProps) => {
    // We no longer need to track lock duration

    // Game contract address
    // joinGameContractAddress
    const contractAddress: AddressString = "0x98b65ab65f908Ca25F3D4c793Af55C3386178E5b";

    // We're not using tokens anymore, so we don't need this logic

    const router = useRouter();
    const { data, error, isError, isPending, writeContract } = useWriteContract();
    const { isSuccess } = useWaitForTransactionReceipt({
        hash: data,
    });

    // Track if we've already called the API to prevent duplicate calls
    const [apiCalled, setApiCalled] = useState(false);
    // Track if we've already redirected to prevent multiple redirects
    const [hasRedirected, setHasRedirected] = useState(false);

    // Log errors
    useEffect(() => {
        if (error) {
            console.error("Temple contract error:", error);
        }
    }, [error]);

    const entryPrice = 5;

    // Call Metal API once transaction is successful and handle redirect
    useEffect(() => {
        const handleTransactionSuccess = async () => {
            if (isSuccess && !apiCalled && playerWallet) {
                console.log(`Transaction successful - calling Metal API for ${playerWallet}`);
                // Call Metal API
                try {
                    const response = await fetch(
                        `https://api.metal.build/holder/${playerWallet}/spend`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': process.env.METAL_KEY || '',
                            },
                            body: JSON.stringify({
                                tokenAddress: '0x18c86ea247c36f534491dcd2b7abea4534cc5c23',
                                amount: entryPrice,
                            }),
                        }
                    );

                    if (response.ok) {
                        console.log('Metal API call successful');
                        setApiCalled(true); // Mark API as called to prevent duplicates

                        // Only redirect after successful API call
                        if (!hasRedirected) {
                            console.log('API call complete - redirecting to agents page...');
                            setHasRedirected(true);
                            router.push('/agents');
                        }
                    } else {
                        console.error('Metal API call failed:', await response.text());
                    }
                } catch (error) {
                    console.error('Error calling Metal API:', error);
                }
            }
        };

        handleTransactionSuccess();
    }, [isSuccess, apiCalled, playerWallet, hasRedirected, router]);

    // Handle joining the game
    const handleJoinGame = () => {
        console.log(`Player ${playerWallet} is joining the game at temple ${templeId}`);
        setApiCalled(false); // Reset API call state for new transaction
        setHasRedirected(false); // Reset redirect state for new transaction

        writeContract?.({
            abi: ABI,
            address: contractAddress,
            functionName: "joinGame",
            args: []
        });
    };

    return (
        <div className="temple-interaction bg-white p-0 rounded-lg max-w-md mx-auto text-black">
            <h2 className="text-xl font-bold mb-4">Temple {templeId} Data</h2>
            {/* 🐍 */}

            { templeId === 1 && (
                <p className="mb-2">Chain: Polygon</p>
            )}

            { templeId === 2 && (
                <p className="mb-2">Chain: Celo</p>
            )}

            { templeId === 3 && (
                <p className="mb-2">Chain: Flow</p>
            )}

            { templeId === 4 && (
                <p className="mb-2">Chain: Sepolia</p>
            )}

            { templeId === 1 && (
                <p className="mb-2">Player 1: Empty Slot</p>
            )}

            { templeId === 2 && (
                <p className="mb-2">Player 1: vitally.eth</p>
            )}

            {/*<p className="mb-2">Player 1: {shorten(playerAddress)}</p>*/}
            <p className="mb-2">Player 2: Empty Slot</p>
            <p className="mb-2">Duration: 24 Hours MAX</p>
            { templeId === 1 && (
                <p className="mb-2">Donation: 10 Tokens MIN</p>
            )}
            { templeId === 2 && (
                <p className="mb-2">Donation: 5 Tokens MIN</p>
            )}
            { templeId === 3 && (
                <p className="mb-2">Donation: 0 Tokens MIN</p>
            )}
            {/*<p className="mb-2">Wallet: {shorten(playerWallet)}</p>*/}

            {/*<div className="mb-4">
                <label className="hidden block text-sm font-medium mb-1">Amount to Lock</label>
                <div className="flex items-center">
                    <input
                        type="text"
                        value={amount}
                        onChange={(e) => setLockDuration(e.target.value)}
                        className="p-2 border rounded mr-2 w-full"
                        disabled
                    />
                    <span>{token}</span>
                </div>
            </div>*/}
            {/* No need for duration input field anymore */}
            {data && !isError && (
                <div className="mb-4 p-2 bg-green-100 rounded">
                    Transaction hash: <MonoLabel label={shorten(data)} />
                </div>
            )}

            {isError && (
                <div className="mb-4 p-2 bg-red-100 rounded">
                    Transaction failed
                </div>
            )}

            <div className="flex justify-between">
                <div>
                <div className="mt-2 ml-2 absolute gamepad-button-wrapper">
                    <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--cross gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                </div>
                <Button
                    disabled={isPending}
                    onClick_={handleJoinGame}
                    cta="Enter"
                />
                </div>
                <div>
                <div className="mt-2 ml-2 absolute gamepad-button-wrapper">
                    <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--circle gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                </div>
                <Button
                    onClick_={onClose}
                    cta="Leave"
                />
                </div>
            </div>
        </div>
    );
};

export default ContractWriteTemple;
