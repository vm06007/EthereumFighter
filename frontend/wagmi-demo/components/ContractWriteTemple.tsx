'use client';

import { useState } from 'react';
import Wrapper from 'components/Wrapper';
import { shorten, type AddressString } from 'lib/utils';
import { useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';

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
    const contractAddress: AddressString = "0x66B0FBbEB420B63155d61ec5922293148bb796eC";

    // We're not using tokens anymore, so we don't need this logic

    const { data, error, isError, isPending, writeContract } = useWriteContract();

    // Log errors
    useEffect(() => {
        if (error) {
            console.error("Temple contract error:", error);
        }
    }, [error]);

    // Handle joining the game
    const handleJoinGame = () => {
        console.log(`Player ${playerWallet} is joining the game at temple ${templeId}`);

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
            <p className="mb-2">Chain: Polygon</p>
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
