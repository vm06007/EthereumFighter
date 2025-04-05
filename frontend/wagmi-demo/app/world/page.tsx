"use client";

import { useAccount, useEnsName } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { shorten } from "lib/utils";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import ContractWriteTemple from '../../components/ContractWriteTemple';
import SendTransactionMint from '../../components/SendTransactionMint';

const vibrateController = () => {
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        const gamepad = Array.from(gamepads).find(gp => gp !== null);

        if (!gamepad) {
            console.log("No gamepad detected");
            return;
        }

        if (gamepad.vibrationActuator && 'playEffect' in gamepad.vibrationActuator) {
            gamepad.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: 500,
                weakMagnitude: 1.0,
                strongMagnitude: 1.0
            });
        }
    }
};


// Generate a 80x80 map filled with 0s
const generateMap = () => {

    const map = Array(80).fill(0).map(() => Array(80).fill(0));
    // Walls
    [
        [4, 4], [8, 8], [47, 8], [46, 8], [45, 8], [44, 8], [43, 8], [42, 8], [41, 8],
        [40, 8], [39, 8], [38, 8], [37, 8], [37, 16], [37, 15], [37, 14], [37, 13],
        [37, 12], [37, 11], [37, 10], [37, 9], [36, 8], [36, 12], [37, 20], [37, 19], [37, 18], [37, 16],
        [35, 8], [34, 8], [33, 8], [32, 8], [31, 8], [30, 8], [29, 8], [28, 8],
        [27, 8], [26, 8], [25, 8], [24, 8], [23, 8], [22, 8], [21, 8], [20, 8], [19, 8],
        [18, 8], [17, 8], [16, 8], [15, 8], [14, 8], [13, 8], [12, 8], [11, 8], [11, 9],
        [11, 10], [11, 11], [11, 12], [23, 32], [22, 32], [21, 32], [20, 32], [19, 32],
        [18, 32], [17, 32], [23, 31], [22, 31], [21, 31], [20, 31], [19, 31], [18, 31],
        [17, 31], [23, 41], [22, 41], [21, 41], [20, 41], [19, 41], [18, 41], [17, 41],
        [23, 42], [22, 42], [21, 42], [20, 42], [19, 42], [18, 42], [17, 42], [44, 14],
        [44, 15], [44, 16], [22, 40], [21, 40], [20, 40], [19, 40], [18, 40], [23, 39],
        [22, 39], [21, 39], [20, 39], [19, 39], [18, 39], [23, 38], [22, 38], [21, 38],
        [20, 38], [19, 38], [18, 38], [17, 38], [23, 37], [22, 37], [21, 37], [20, 37],
        [19, 37], [19, 38], [18, 38], [17, 38], [22, 36], [23, 36], [21, 36], [20, 36],
        [19, 36], [18, 36], [17, 36], [22, 35], [23, 35], [21, 35], [20, 35], [19, 35],
        [18, 35], [17, 35], [23, 34], [22, 34], [21, 34], [20, 34], [19, 34], [18, 34],
        [17, 34], [23, 33], [22, 33], [21, 33], [20, 33], [19, 33], [18, 33], [17, 33], [40, 44]
    ].forEach(([y, x]) => {
        map[y][x] = 3; // Wall
    });

    // Temples
    [
        [44, 14],
        [44, 15],
        [44, 16],
        [23, 36],
        [23, 37],
        [23, 38],
        [23, 35],
        [16, 53],
        [16, 52],
        [16, 54],
        [16, 66],
        [16, 67],
    ].forEach(([y, x]) => {
        map[y][x] = 1; // Temple
    });

    // Add some rivers (4) and bridges (5)
    for (let i = 10; i < 50; i++) {
        map[i][77] = 4; // River
    }

    for (let i = 10; i < 50; i++) {
        map[50][i] = 4; // River
    }

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
        content = '';
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
                    type === 2 ? 'rgba(200, 200, 200, 1)' :
                        type === 3 ? 'rgba(200, 200, 200, 1)' :
                            type === 4 ? 'rgba(30, 144, 255, 0.0)' :
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

    // Vibrate when modal is first displayed
    useEffect(() => {
        if (isOpen) {
            vibrateController();
        }
    }, [isOpen]);

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
                minWidth: '360px'
            }}
        >
            <ContractWriteTemple
                playerAddress={playerAddress}
                playerWallet={playerWallet}
                amount="0.1"
                token="ETH"
                templeId={templeId}
                onClose={onClose}
            />
            {/*<button onClick={onClose}>Leave</button>*/}
        </div>
    );
};

// Bridge modal component
const BridgeModal = ({
    isOpen,
    onClose,
    position,
    playerAddress,
    playerWallet,
    onMint,  // Added parameter to receive the mint handler
    fetchBalances  // Add function to fetch token balances
}: {
    isOpen: boolean,
    onClose: () => void,
    position: { x: number, y: number },
    playerAddress: string,
    playerWallet: string,
    onMint?: () => void,  // Optional to keep backward compatibility
    fetchBalances?: () => Promise<void>  // Function to refresh token balances
}) => {
    if (!isOpen) return null;

    // Vibrate when modal is first displayed
    useEffect(() => {
        if (isOpen) {
            vibrateController();
        }
    }, [isOpen]);

    // Transaction success handler
    const handleTransactionSuccess = (txHash: string, amount: string) => {
        console.log(`Transaction successful! Hash: ${txHash}, Amount: ${amount}`);
        // Refresh token balances after successful transaction
        if (fetchBalances) {
            fetchBalances();
        }
        // If there's a global mint handler, also call it
        if (onMint) {
            // onMint();
        }
    };

    return (
        <div
            className="modal bridge-modal"
            id="bridge-modal"
            style={{
                position: 'absolute',
                left: `${position.x * 10 + 20}px`,
                top: `${position.y * 10}px`,
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '5px',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
                zIndex: 20,
                minWidth: '300px'
            }}
        >
            <div className="bridge-modal-content">
                <div className="flex gap-2">
                <div>
                    <img width="30" src="https://ethglobal.b-cdn.net/organizations/t2nc8/square-logo/default.png"></img>
                </div>
                <h2 className="text-xl font-bold text-gray-800">Forge Tokens</h2>
                </div>
                <p className="mb-4 text-gray-600">
                    Forge game tokens using Metal Service
                </p>
                <div style={{paddingBottom: "1px"}} className="bg-blue-50 px-3 pt-3 rounded-md text-sm">
                    <p className="text-blue-600">
                        Deposit 0.01 ETH to forge 100 PT tokens
                    </p>
                </div>

                {/* SendTransactionMint component instead of buttons */}
                <div id="bridge-mint-button">
                    <SendTransactionMint
                        to="0x641AD78BAca220C5BD28b51Ce8e0F495e85Fe689"
                        amount="0.01"
                        // warning="We recommend doing this on a testnet (Sepolia)."
                        buttonText="Mint"
                        onSuccess={handleTransactionSuccess}
                        onClose={onClose}
                        playerAddress={playerWallet}
                    />
                </div>

                {/*<div className="mt-4 text-center">
                    <button
                        id="bridge-leave-button"
                        className="leave-button py-2 px-4 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                        onClick={onClose}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <div className="gamepad-button-wrapper">
                                <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--circle gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CIRCLE</i>
                            </div>
                            Cancel
                        </div>
                    </button>
                </div>*/}
            </div>
        </div>
    );
};

export default function WorldPage() {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { data: ensName } = useEnsName({ address });
    const { wallets } = useWallets();
    const { setActiveWallet } = useSetActiveWallet();

    // State for token balances
    const [tokenBalances, setTokenBalances] = useState<{[address: string]: number}>({});

    // Function to fetch token holders and balances
    const fetchTokenBalances = async () => {
        try {
            const response = await fetch(
                'https://api.metal.build/token/0x18c86ea247c36f534491dcd2b7abea4534cc5c23',
                {
                    headers: {
                        'x-api-key': process.env.METAL_KEY || '',
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                // Process and map token balances by wallet address
                const balances: {[address: string]: number} = {};

                // Assuming the API returns an array of holders with their balances
                // The actual structure will depend on the Metal API response format
                if (data.holders) {
                    data.holders.forEach((holder: any) => {
                        // Convert addresses to lowercase for case-insensitive comparison
                        balances[holder.address.toLowerCase()] = holder.balance || 0;
                    });
                }

                setTokenBalances(balances);
            } else {
                console.error('Failed to fetch token balances:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching token balances:', error);
        }
    };

    // State for game map
    const [map] = useState(() => generateMap());

    // State for player positions
    const [player1Position, setPlayer1Position] = useState({ x: 21, y: 30 });
    const [player1Frame, setPlayer1Frame] = useState(0);
    const [player1Direction, setPlayer1Direction] = useState(0); // 0=down, -128=up, -64=right, -192=left

    // State for player 2
    const [player2Position, setPlayer2Position] = useState({  x: 10, y: 20 });
    const [player2Frame, setPlayer2Frame] = useState(0);
    const [player2Direction, setPlayer2Direction] = useState(0);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [bridgeModalOpen, setBridgeModalOpen] = useState(false);
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
    const [activePlayerNumber, setActivePlayerNumber] = useState<1 | 2>(1);
    const [templeId, setTempleId] = useState(1);

    // Bridge modal mint function - centralized handler
    const handleBridgeMint = () => {
        console.log("Executing bridge mint from global handler");
        // alert("Minting tokens is currently simulated. This would connect to METAL token contract.");
        setBridgeModalOpen(false);
    };

    // State for bottom mapper
    const [showBottomMapper, setShowBottomMapper] = useState(false);

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

    // Fetch token balances when component mounts or wallet addresses change
    useEffect(() => {
        if (address || secondWallet?.address) {
            fetchTokenBalances();
        }
    }, [address, secondWallet?.address]);

    // Check if a position is next to a temple
    const isNextToTemple = (position: { x: number, y: number }) => {
        const { x, y } = position;
        const positions = [
            [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
        ];
        return positions.some(([px, py]) =>
            map[py] && map[py][px] === 1
        );
    };

    // Check if a position is next to a bridge
    const isNextToBridge = (position: { x: number, y: number }) => {
        const { x, y } = position;
        const positions = [
            [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
        ];
        return positions.some(([px, py]) =>
            map[py] && map[py][px] === 5
        );
    };

    // Check if a position is on or next to water
    const isNearWater = (position: { x: number, y: number }) => {
        const { x, y } = position;
        // Check current position and adjacent positions
        const positions = [
            [x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
        ];
        return positions.some(([px, py]) =>
            map[py] && map[py][px] === 4
        );
    };

    // Open modal function
    const openModal = (position: { x: number, y: number }, playerNum: 1 | 2) => {
        const { x, y } = position;
        const positions = [
            [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
        ];

        // Check for temple
        const templePos = positions.find(([px, py]) =>
            map[py] && map[py][px] === 1
        );

        if (templePos) {
            const [tx, ty] = templePos;
            // Calculate temple ID based on position (simplified logic)
            // const calculatedTempleId = (tx + ty) % 3 + 1; // This will give values 1, 2, or 3
            console.log(tx)
            console.log(ty)
            let calculatedTempleId = 1; // This will give values 1, 2, or 3

            if (tx > 50) {
                calculatedTempleId = 2;
            }
            if (tx > 60) {
                calculatedTempleId = 3;
            }

            if (tx > 50) {
                calculatedTempleId = 4;
            }

            // Set the active wallet based on which player is interacting
            if (playerNum === 1) {
                // Player 1's wallet should already be active
                console.log("Player 1 interacting with temple");
            } else if (playerNum === 2 && secondWallet) {
                // Activate player 2's wallet
                console.log("Activating player 2's wallet for temple interaction");
                setActiveWallet(secondWallet);
            }

            setTempleId(calculatedTempleId);
            setModalPosition({ x: tx, y: ty });
            setActivePlayerNumber(playerNum);

            setModalOpen(true);
            return true;
        }

        // Check for bridge
        const bridgePos = positions.find(([px, py]) =>
            map[py] && map[py][px] === 5
        );

        if (bridgePos) {
            const [bx, by] = bridgePos;

            // Set the active wallet based on which player is interacting
            if (playerNum === 1) {
                console.log("Player 1 interacting with bridge");
            } else if (playerNum === 2 && secondWallet) {
                console.log("Activating player 2's wallet for bridge interaction");
                setActiveWallet(secondWallet);
            }

            setModalPosition({ x: bx, y: by });
            setActivePlayerNumber(playerNum);
            setBridgeModalOpen(true);
            return true;
        }

        return false;
    };

    // Move character function
    const moveCharacter = (
        playerNum: 1 | 2,
        dx: number,
        dy: number
    ) => {
        // Determine which player state to update
        const setPosition = playerNum === 1 ? setPlayer1Position : setPlayer2Position;
        const setFrame = playerNum === 1 ? setPlayer1Frame : setPlayer2Frame;
        const setDirection = playerNum === 1 ? setPlayer1Direction : setPlayer2Direction;
        const position = playerNum === 1 ? player1Position : player2Position;
        const frame = playerNum === 1 ? player1Frame : player2Frame;

        // Calculate direction based on movement
        let direction = 0;
        if (dx === 1) direction = -64; // Right
        if (dx === -1) direction = -192; // Left
        if (dy === 1) direction = 0; // Down
        if (dy === -1) direction = -128; // Up

        // Update direction
        setDirection(direction);

        // Update animation frame
        setFrame((frame + 1) % 4);

        // Calculate new position
        const newX = position.x + dx;
        const newY = position.y + dy;

        // Check if the move is valid - prevent movement over temples, walls, rivers, and bridges
        if (newX >= 0 && newY >= 0 && newX < 80 && newY < 80 &&
            ![1, 3, 4, 5].includes(map[newY][newX])) {
            // Update position
            setPosition({ x: newX, y: newY });

            // Check for water proximity and update bottom mapper
            const newPosition = { x: newX, y: newY };
            if (isNearWater(newPosition)) {
                setShowBottomMapper(true);
            } else if (playerNum === 1 && !isNearWater(player2Position) ||
                playerNum === 2 && !isNearWater(player1Position)) {
                setShowBottomMapper(false);
            }
        }
    };

    // Update after any position changes
    useEffect(() => {
        // Check both players for water proximity
        if (isNearWater(player1Position) || isNearWater(player2Position)) {
            setShowBottomMapper(true);
        } else {
            setShowBottomMapper(false);
        }
    }, [player1Position, player2Position]);

    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (keyState.current[event.code]) return; // Prevent key repeat
            keyState.current[event.code] = true;

            // Modal interactions have priority
            if (modalOpen || bridgeModalOpen) {
                switch (event.key) {
                    case 'Enter':
                    case ' ': // Space key
                        if (modalOpen) {
                            // Temple modal interaction
                            console.log('Temple modal open: Attempting to trigger lock tokens from keyboard');

                            try {
                                // Find all buttons in the temple modal
                                const buttons = document.querySelectorAll('.modal button');
                                if (buttons.length > 0) {
                                    // Click the first button (which should be the Lock Tokens/Enter button)
                                    console.log('Found button in temple modal - clicking it');
                                    (buttons[0] as HTMLButtonElement).click();
                                } else {
                                    console.log('No buttons found in temple modal');
                                }
                            } catch (err) {
                                console.error('Error triggering temple modal action:', err);
                            }
                        } else if (bridgeModalOpen) {
                            // Bridge modal interaction - find and click the mint button
                            console.log('Bridge modal open: Finding and clicking the mint button');

                            try {
                                // Try to find the button in SendTransactionMint component
                                const mintButton = document.querySelector('#bridge-mint-button button') as HTMLButtonElement;
                                if (mintButton) {
                                    console.log('Found mint button in SendTransactionMint - clicking it');
                                    mintButton.click();
                                } else {
                                    console.log('Mint button not found in SendTransactionMint');
                                    // Fallback to the global handler if button not found
                                    handleBridgeMint();
                                }
                            } catch (err) {
                                console.error('Error triggering bridge modal mint:', err);
                                // Fallback to the global handler if any error occurs
                                handleBridgeMint();
                            }
                        }
                        break;
                    case 'Escape':
                        setModalOpen(false);
                        setBridgeModalOpen(false);
                        break;
                    case 'q':
                            setModalOpen(false);
                            setBridgeModalOpen(false);
                            break;
                }
                return; // Exit early for modal interactions
            }

            // Normal gameplay controls when modal is not open

            // Player 1 controls - Arrow keys
            switch (event.key) {
                case 'ArrowUp':
                    moveCharacter(1, 0, -1);
                    break;
                case 'ArrowDown':
                    moveCharacter(1, 0, 1);
                    break;
                case 'ArrowLeft':
                    moveCharacter(1, -1, 0);
                    break;
                case 'ArrowRight':
                    moveCharacter(1, 1, 0);
                    break;
                case 'Enter':
                    // Check for temples or bridges
                    if (isNextToTemple(player1Position) || isNextToBridge(player1Position)) {
                        openModal(player1Position, 1);
                    }
                    break;
                case 'Escape':
                    setModalOpen(false);
                    setBridgeModalOpen(false);
                    break;
            }

            // Player 2 controls - WASD keys (only if two wallets are connected)
            if (hasTwoWallets) {
                switch (event.key) {
                    case 'w':
                    case 'W':
                        moveCharacter(2, 0, -1);
                        break;
                    case 's':
                    case 'S':
                        moveCharacter(2, 0, 1);
                        break;
                    case 'a':
                    case 'A':
                        moveCharacter(2, -1, 0);
                        break;
                    case 'd':
                    case 'D':
                        moveCharacter(2, 1, 0);
                        break;
                    case ' ': // Space key
                        // Check for temples or bridges
                        if (isNextToTemple(player2Position) || isNextToBridge(player2Position)) {
                            openModal(player2Position, 2);
                        }
                        break;
                }
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            keyState.current[event.code] = false;
        };

        // Add event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Cleanup
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [player1Position, player2Position, hasTwoWallets, map, modalOpen, bridgeModalOpen, handleBridgeMint]);

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
                        // overflow: 'hidden',
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
                    {/* Temple modal */}
                    <TempleModal
                        isOpen={modalOpen}
                        onClose={() => setModalOpen(false)}
                        position={modalPosition}
                        playerAddress={activePlayerNumber === 1 ? player1Display : player2Display}
                        playerWallet={activePlayerNumber === 1 ?
                            (player1WalletInfo.address || address || '') :
                            (player2WalletInfo.address || secondWallet?.address || '')
                        }
                        templeId={templeId}
                    />
                    {/* Bridge modal */}
                    <BridgeModal
                        isOpen={bridgeModalOpen}
                        onClose={() => setBridgeModalOpen(false)}
                        position={modalPosition}
                        playerAddress={activePlayerNumber === 1 ? player1Display : player2Display}
                        playerWallet={activePlayerNumber === 1 ?
                            (player1WalletInfo.address || address || '') :
                            (player2WalletInfo.address || secondWallet?.address || '')
                        }
                        onMint={handleBridgeMint} // Pass the global mint handler
                        fetchBalances={fetchTokenBalances} // Pass token balance refresh function
                    />
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
                                            Tokens: {tokenBalances[wallet.address.toLowerCase()] || 5} PT
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
                    {/* Bottom mapper that shows only when near water */}
                    {showBottomMapper && (
                        <div className="bottom-mapper text-center text-xs bg-black bg-opacity-70 p-1 rounded">
                            {/*<p>Player 1: Arrow Keys | Player 2: WASD</p>*/}
                            <p>The Bridge is not build yet - use 1INCH Fusion+</p>
                            <button
                                className="bb-button  mt-1 bg-gray-700 p-1 rounded"
                                onClick={() => router.push('/')}
                            >
                                Bridge My ETH Now!
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}