"use client";

import { useAccount, useEnsName } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { shorten } from "lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
// import ContractWriteTemple from '../../components/ContractWriteTemple';
// import SendTransactionMint from '../../components/SendTransactionMint';
// Generate a 80x80 map filled with 0s
const generateMap = () => {

    const map = Array(80).fill(0).map(() => Array(80).fill(0));
    // Wall
    // Add Metal Stone Bridge
    map[15][45] = 5;
    map[30][45] = 5;

    return map;
};

// Character component
const Character = ({ position, nameLabel, frame, direction }: {
    position: { x: number, y: number },
    nameLabel: string,
    frame: number,
    direction: number
}) => {
    return (
        <div
            className="character"
            style={{
                width: '40px',
                height: '64px',
                backgroundImage: `url('https://s3-us-west-2.amazonaws.com/s.cdpn.io/21542/DemoRpgCharacter.png')`,
                backgroundSize: '160px 256px',
                backgroundPosition: `-${frame * 40}px ${direction}px`,
                position: 'absolute',
                transform: `translate(${position.x * 10}px, ${position.y * 10}px)`,
                zIndex: 10,
                transformOrigin: 'center bottom',
                marginLeft: '-15px',
                marginTop: '-54px',
                transition: 'transform 0.3s ease-in-out',
                imageRendering: 'pixelated'
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: '#fff',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                }}
            >
                {nameLabel}
            </div>
        </div>
    );
};

// Tile component
const Tile = ({ type, x, y }: { type: number, x: number, y: number }) => {
    let className = 'tile';
    let content = '';

    // Only show visible elements, walls are invisible and serve as boundaries
    if (type === 1) {
        className += ' temple';
        content = '🏯';
    } else if (type === 2) {
        className += 'road';
    } else if (type === 4) {
        className += 'river';
        // content = '🌊';
        content = '🌊';
    } else if (type === 5) {
        className += 'bridge';
        content = '🌉';
    } else if (type === 3) {
        content = '🧱';
        className += 'wall';
        // Walls are invisible, so we return null for walls
        return null;
    }

    return (
        <div
            className={className}
            style={{
                width: '10px',
                height: '10px',
                position: 'absolute',
                top: `${y * 10}px`,
                left: `${x * 10}px`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                // visibility: 'hidden',
                fontSize: '8px',
                backgroundColor: type === 1 ? 'rgba(200, 0, 0, 0.7)' :
                    type === 2 ? 'rgba(200, 200, 200, 0.5)' :
                        type === 3 ? 'rgba(200, 200, 200, 0.5)' :
                            type === 4 ? 'rgba(30, 144, 255, 0.7)' :
                                type === 5 ? 'rgba(139, 69, 19, 0.7)' : 'transparent'
            }}
        >
            {content}
        </div>
    );
};

// Temple modal component
const TempleModal = ({
    isOpen,
    onClose,
    position,
    playerAddress,
    playerWallet,
    templeId = 1
}: {
    isOpen: boolean,
    onClose: () => void,
    position: { x: number, y: number },
    playerAddress: string,
    playerWallet: string,
    templeId?: number
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="modal"
            style={{
                position: 'absolute',
                left: `${position.x * 10 + 20}px`,
                top: `${position.y * 10}px`,
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '5px',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
                zIndex: 20,
                minWidth: '350px'
            }}
        >
            {/*<ContractWriteTemple
                playerAddress={playerAddress}
                playerWallet={playerWallet}
                amount="0.1"
                token="ETH"
                templeId={templeId}
                onClose={onClose}
            />*/}
            {/*<button onClick={onClose}>Leave</button>*/}
        </div>
    );
};

export default function WorldPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { data: ensName } = useEnsName({ address });
    const { wallets } = useWallets();
    const { setActiveWallet } = useSetActiveWallet();

    // State for game map
    const [map] = useState(() => generateMap());

    // State for player positions
    const [player1Position, setPlayer1Position] = useState({ x: 10, y: 20 });
    const [player1Frame, setPlayer1Frame] = useState(0);
    const [player1Direction, setPlayer1Direction] = useState(0); // 0=down, -128=up, -64=right, -192=left

    // State for player 2
    const [player2Position, setPlayer2Position] = useState({ x: 15, y: 20 });
    const [player2Frame, setPlayer2Frame] = useState(0);
    const [player2Direction, setPlayer2Direction] = useState(0);

    // Modal state
    const [bridgeModalOpen, setBridgeModalOpen] = useState(false);

    // State to store fixed wallet information for each player
    const [player1WalletInfo, setPlayer1WalletInfo] = useState({ address: '', ensName: '' });
    const [player2WalletInfo, setPlayer2WalletInfo] = useState({ address: '', ensName: '' });

    // References
    const gameContainerRef = useRef<HTMLDivElement>(null);

    // Key state tracking
    const keyState = useRef<Record<string, boolean>>({});

    // Check if two wallets are connected
    const hasTwoWallets = wallets.length > 1;

    // Find the second wallet (the one that's not active)
    const secondWallet = wallets.find(wallet => wallet.address !== address);

    // Get ENS name for player 2
    const { data: player2EnsName } = useEnsName({
        address: secondWallet?.address as `0x${string}`,
        query: { enabled: !!secondWallet }
    });

    // Display player info (use stored values if available, otherwise calculate)
    const player1Display = player1WalletInfo.ensName || (address ? (ensName || shorten(address)) : 'Player 1');
    const player2Display = player2WalletInfo.ensName || (secondWallet ?
        (player2EnsName || shorten(secondWallet.address)) : 'Player 2');

    // Redirect if not connected
    useEffect(() => {
        if (!isConnected) {
            router.push('/');
        }
    }, [isConnected, router]);

    // Store wallet information when it becomes available
    useEffect(() => {
        if (address && !player1WalletInfo.address) {
            setPlayer1WalletInfo({
                address: address,
                ensName: ensName || shorten(address)
            });
        }
    }, [address, ensName, player1WalletInfo.address]);

    // Store player 2 wallet info separately to avoid update conflicts
    useEffect(() => {
        if (secondWallet && !player2WalletInfo.address) {
            setPlayer2WalletInfo({
                address: secondWallet.address,
                ensName: player2EnsName || shorten(secondWallet.address)
            });
        }
    }, [secondWallet, player2EnsName, player2WalletInfo.address]);


    return (
        <>
            <div style={{
                backdropFilter: 'brightness(0.2) blur(2px)',
                backgroundSize: 'cover',
                margin: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '110vh',
                overflow: 'hidden',
            }}>
                <div
                    className="game-container"
                    ref={gameContainerRef}
                    style={{
                        position: 'fixed',
                        height: '100vh',
                        overflow: 'hidden',
                        transform: 'scale(1.1)',
                        filter: 'brightness(0.8) contrast(1.4)',
                        backgroundImage: "url('/world-0.jpg')",
                        width: '800px',
                        backgroundSize: 'contain',
                        backgroundColor: '#2e8b57',
                        margin: '0 auto',
                        left: '50%',
                        marginLeft: '-400px'
                    }}
                >
                    {/* Render map tiles */}
                    {map.map((row, y) =>
                        row.map((tile, x) =>
                            tile > 0 ? <Tile key={`${x}-${y}`} type={tile} x={x} y={y} /> : null
                        )
                    )}

                    {/* Render player 1 */}
                    <Character
                        position={player1Position}
                        nameLabel={player1Display}
                        frame={player1Frame}
                        direction={player1Direction}
                    />

                    {/* Render player 2 if two wallets are connected */}
                    {hasTwoWallets && (
                        <Character
                            position={player2Position}
                            nameLabel={player2Display}
                            frame={player2Frame}
                            direction={player2Direction}
                        />
                    )}
                </div>

                {/* Game UI/HUD */}
                <div className="game-hud" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    padding: '10px',
                    color: 'white',
                    zIndex: 100
                }}>
                    <div className="game-layout flex flex-col md:flex-row justify-between p-4">
                        {/* Left side - Player 1 */}
                        <div style={{visibility: "hidden"}} className="player-info p-2 bg-red-900 bg-opacity-80 rounded-lg">
                            <h2 className="text-xl font-bold">{player1Display}</h2>
                            <div className="health-bar w-32 h-3 bg-gray-700 mt-1">
                                <div className="h-full bg-red-600" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        {/* Right side - Connected wallets stacked vertically */}
                        <div className="wallets-container flex flex-col gap-2" style={{ maxWidth: '250px' }}>
                            {/* Display all connected wallets */}
                            {wallets.map((wallet, index) => {
                                // Get display name (ENS or shortened address)
                                const isActiveWallet = wallet.address === address;
                                const displayName = isActiveWallet ? player1Display :
                                    (wallet.address === secondWallet?.address ? player2Display : shorten(wallet.address));

                                return (
                                    <div key={wallet.address}
                                        className={`wallet-card p-2 rounded-lg ${index === 0 ? 'bg-red-900' : 'bg-blue-900'} bg-opacity-80
                                        ${isActiveWallet ? 'border-2 border-yellow-400' : ''}`}>
                                        <div className="flex justify-between items-center">
                                            {/*<span className="text-sm mr-2">Player {index+1}</span>*/}
                                            <h2 className="text-lg font-medium">{displayName}</h2>
                                        </div>
                                        <div className="health-bar w-full h-2 bg-gray-700 mt-0">
                                            <div className={`h-full ${index === 0 ? 'bg-red-600' : 'bg-blue-600'}`}
                                                style={{ width: '100%' }}></div>
                                        </div>
                                        <div className="mt-2 text-sm">
                                            Tokens: 5 PT
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Show placeholder for Player 2 if no second wallet */}
                            {wallets.length === 1 && (
                                <div className="wallet-card p-2 rounded-lg bg-blue-900 bg-opacity-80">
                                    <div className="flex justify-between items-center">
                                        {/*<span className="text-sm mr-2">Player 2</span>*/}
                                        <h2 className="text-lg font-medium">Not Connected</h2>
                                    </div>
                                    <div className="health-bar w-full h-2 bg-gray-700 mt-1">
                                        <div className="h-full bg-blue-600" style={{ width: '0%' }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}