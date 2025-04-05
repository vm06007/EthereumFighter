'use client';

import { parseUnits } from 'viem';
import { useState } from 'react';
import Wrapper from 'components/Wrapper';
import { shorten, type AddressString } from 'lib/utils';
import { useEffect } from 'react';
import { sepolia } from 'viem/chains';
import { useAccount, useWriteContract } from 'wagmi';

import Button from './Button';
import MonoLabel from './MonoLabel';

// Temple interaction ABI
const ABI = [
    {
        inputs: [
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "lockDuration",
                type: "uint256",
            },
        ],
        name: "lockTokens",
        outputs: [],
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

const ContractWriteTemple = ({
    playerAddress,
    playerWallet,
    amount = "100",
    token = "USDC",
    templeId,
    onClose
}: ContractWriteTempleProps) => {
    // State to store the lock duration
    const [lockDuration, setLockDuration] = useState<string>("30"); // Default 30 days

    // USDC on Mainnet
    const contractAddress: AddressString = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const knownTokens: Record<string, AddressString> = {
        DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
    };
    const tokenDecimals: Record<string, number> = {
        [knownTokens.DAI.toLowerCase()]: 18,
        [knownTokens.USDC.toLowerCase()]: 6,
        [knownTokens.USDT.toLowerCase()]: 6
    };

    // Determine token address
    let finalAddress: AddressString | undefined;
    if (token.startsWith("0x") && token.length === 42) {
        finalAddress = token as AddressString;
    } else {
        const upper = token.toUpperCase();
        finalAddress = knownTokens[upper];
    }

    const { data, error, isError, isPending, writeContract } = useWriteContract();

    // Log errors
    useEffect(() => {
        if (error) {
            console.error("Temple contract error:", error);
        }
    }, [error]);

    // Handle locking tokens in the temple
    const handleLockTokens = () => {
        if (!amount || !lockDuration) return;

        console.log(`Player ${playerWallet} is locking ${amount} tokens at temple ${templeId}`);

        writeContract?.({
            abi: ABI,
            address: finalAddress || contractAddress,
            functionName: "lockTokens",
            args: [
                parseUnits(amount, tokenDecimals[finalAddress?.toLowerCase() || ""] ?? 6),
                BigInt(parseInt(lockDuration) * 24 * 60 * 60) // Convert days to seconds
            ]
        });
    };

    return (
        <div className="temple-interaction bg-white p-0 rounded-lg max-w-md mx-auto text-black">
            <h2 className="text-xl font-bold mb-4">Temple {templeId} Data</h2>
            {/* 🐍 */}
            <p className="mb-2">Chain: Polygon</p>
            <p className="mb-2">Player 1: Empty Slot</p>
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
            <div className="hidden mb-4">
                <label className="block text-sm font-medium mb-1">Lock Duration (days)</label>
                <input
                    type="text"
                    value={lockDuration}
                    onChange={(e) => setLockDuration(e.target.value)}
                    className="p-2 border rounded w-full"
                />
            </div>
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
                    onClick_={handleLockTokens}
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
