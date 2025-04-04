"use client";

import { useAccount, useEnsName } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { shorten } from "lib/utils";
import { useRouter } from "next/navigation";
// import { useEffect } from "react";

export default function WorldPage() {
    const router = useRouter();
    const { address } = useAccount();
    const { data: ensName } = useEnsName({ address });
    const { wallets } = useWallets();

    const player1 = address
        ? (ensName || shorten(address))
        : "Player 1";

    const secondWallet = wallets.find((wallet) => {
        return wallet.address !== address
    });

    const obj = {
        address: secondWallet?.address as `0x${string}`
    };

    const player2 = secondWallet
        ? (useEnsName(obj).data || shorten(secondWallet.address))
        : "Player 2";

    return (
        <div className="game-container min-h-screen bg-black text-white p-4">
            <div className="game-header flex justify-between items-center mb-8">
                <div className="player-info p-4 bg-red-900 rounded-lg">
                    <h2 className="text-2xl font-bold">{player1}</h2>
                    <div className="health-bar w-48 h-4 bg-gray-700 mt-2">
                        <div className="h-full bg-red-600" style={{ width: '100%' }}></div>
                    </div>
                </div>
                <div className="vs-indicator text-4xl font-bold">VS</div>
                <div className="player-info p-4 bg-blue-900 rounded-lg text-right">
                    <h2 className="text-2xl font-bold">{player2}</h2>
                    <div className="health-bar w-48 h-4 bg-gray-700 mt-2">
                        <div className="h-full bg-blue-600" style={{ width: '100%' }}></div>
                    </div>
                </div>
            </div>

            <div className="game-arena bg-gray-800 h-96 flex items-center justify-center rounded-lg">
                <div className="text-2xl">Game arena - Coming soon!</div>
            </div>

            <div className="game-controls mt-8 flex justify-center gap-4">
                <button className="bg-red-700 p-4 rounded-lg">Attack</button>
                <button className="bg-blue-700 p-4 rounded-lg">Defend</button>
                <button className="bg-green-700 p-4 rounded-lg">Special Move</button>
            </div>

            <div className="back-button mt-8">
                <button
                    className="bg-gray-700 p-2 rounded-lg"
                    onClick={() => router.push('/')}
                >
                    Back to Main Menu
                </button>
            </div>
        </div>
    );
}
