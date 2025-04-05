'use client';

import { useAccount, useEnsName } from 'wagmi';
import { useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { shorten } from 'lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { characters } from './characters';
import './styles.css';

type PlayerState = {
    focusIndex: number;
    confirmed: boolean;
    selecting: boolean;
};

// Character info component for the detailed display below the roster
const CharacterInfoPanel = ({ character, player }: {character: any, player: any}) => {
    if (!character) return <div className="character-info-empty">Select a character</div>;

    const baseColor = player === 'p1'
        ? 'rgba(227, 35, 30, 0.7)'
        : 'rgba(30, 104, 227, 0.7)';

    return (
        <div className={`character-info-panel ${player}`} style={{ color: 'white' }}>
            <div className="flex items-start mb-3 gap-3">
                <div className="w-24 h-28 overflow-hidden rounded-md" style={{ border: `3px solid ${baseColor}` }}>
                    <img
                        src={`/${character.name}.avif`}
                        alt={character.displayName}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex-1">
                    <h3 className="text-l font-bold" style={{ color: baseColor, textShadow: '0 0 3px black' }}>
                        {character.displayName}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="font-semibold">Agent Type:</span> {character.modelType}
                        </div>
                        <div>
                            <span className="font-semibold">LLM Model:</span> {character.llmModel}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-2">
                <h4 className="text-sm font-bold mb-1" style={{ color: baseColor }}>Features</h4>
                <div className="flex flex-wrap gap-1">
                    {character.features.map((feature: any, idx: any) => (
                        <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-md"
                            style={{ background: baseColor }}
                        >
                            {feature}
                        </span>
                    ))}
                </div>
            </div>

            <div className="mb-2">
                <h4 className="text-sm font-bold mb-1" style={{ color: baseColor }}>Capabilities</h4>
                <ul className="list-disc pl-5 text-xs">
                    {character.capabilities.map((capability: any, idx: any) => (
                        <li key={idx}>{capability}</li>
                    ))}
                </ul>
            </div>

            <div className="mb-2">
                <h4 className="text-sm font-bold mb-1" style={{ color: baseColor }}>Limitations</h4>
                <ul className="list-disc pl-5 text-xs">
                    {character.limitations.map((limitation: any, idx: any) => (
                        <li key={idx}>{limitation}</li>
                    ))}
                </ul>
            </div>

            <div>
                <h4 className="text-sm font-bold mb-1" style={{ color: baseColor }}>Historical Background</h4>
                <p className="text-xs">{character.background}</p>
            </div>
        </div>
    );
};

export default function AgentSelectPage() {
    // Router for navigation
    const router = useRouter();

    // Wallet connections
    const { address, isConnected } = useAccount();
    const { data: ensName } = useEnsName({ address });
    const { wallets } = useWallets();
    const { setActiveWallet } = useSetActiveWallet();

    // Check if two wallets are connected
    const hasTwoWallets = wallets.length > 1;

    // Find the second wallet (the one that's not active)
    const secondWallet = wallets.find((wallet) => {
        return wallet.address !== address
    });

    // Player wallets display
    const player1Display = address ? (ensName || shorten(address)) : 'Player 1';
    const { data: player2EnsName } = useEnsName({
        address: secondWallet?.address as `0x${string}`,
        query: { enabled: !!secondWallet }
    });
    const player2Display = secondWallet ? (player2EnsName || shorten(secondWallet.address)) : 'Player 2';

    // Game state
    const [state, setState] = useState({
        p1: {
            focusIndex: 0,
            confirmed: false,
            selecting: true
        } as PlayerState,
        p2: {
            focusIndex: hasTwoWallets ? 8 : 0,  // Start P2 at a different position
            confirmed: false,
            selecting: hasTwoWallets
        } as PlayerState,
        finalCountdown: null as NodeJS.Timeout | null,
        selectionFinal: false
    });

    // Grid layout constants
    const gridCols = 8;
    const gridRows = Math.ceil(characters.length / gridCols);

    // Audio references
    const selectSoundRef = useRef<HTMLAudioElement | null>(null);
    const confirmSoundRef = useRef<HTMLAudioElement | null>(null);

    // Modal for final confirmation
    const [showStartModal, setShowStartModal] = useState(false);
    const [selectedCharacters, setSelectedCharacters] = useState({ p1: '', p2: '' });

    // Key state tracking
    const keyState = useRef<Record<string, boolean>>({});


    // Watch for both players confirming and start 2-second window
    useEffect(() => {
        // Only trigger when both players have confirmed and no countdown is running
        if (state.p1.confirmed && state.p2.confirmed && !state.finalCountdown && !state.selectionFinal) {
            console.log("BOTH PLAYERS CONFIRMED - WAITING BEFORE TRIGGERING 2-SECOND WINDOW");

            if (selectSoundRef.current) selectSoundRef.current.volume = 0.3;
            if (confirmSoundRef.current) confirmSoundRef.current.volume = 0.4;
        }

        // Redirect if not connected
        if (!isConnected) {
            router.push('/');
        }
    }, [isConnected, router]);

    const playSoundPlayer = (character: any) => {
        try {
            const p = new Audio(`audio/${character.name}.mp3`);
            p.volume = 0.8
            p.play();
        } catch (err) {
            console.error("Error playing sound:", err);
        }
    };

    // Update focus for a player
    const updateFocus = (player: 'p1' | 'p2') => {
        // Avoid out-of-bounds errors
        if (state[player].focusIndex >= characters.length) {
            setState(prev => ({
                ...prev,
                [player]: {
                    ...prev[player],
                    focusIndex: 0
                }
            }));
            return;
        }

        // Clear focus for this player from all characters
        const characterElements = document.querySelectorAll('.character');
        characterElements.forEach(char => {
            char.classList.remove(`focus-${player}`);
        });

        // Set new focus on the selected character
        const selectedElement = characterElements[state[player].focusIndex];
        if (selectedElement) {
            selectedElement.classList.add(`focus-${player}`);
        }

        // Play sound effect
        playSoundSelect();
    };

    // Move player focus
    const movePlayer = (player: 'p1' | 'p2', direction: 'up' | 'down' | 'left' | 'right') => {
        // Calculate grid position
        const row = Math.floor(state[player].focusIndex / gridCols);
        const col = state[player].focusIndex % gridCols;

        let newRow = row;
        let newCol = col;

        // Update position based on direction
        switch (direction) {
            case 'up':
                newRow = (row - 1 + gridRows) % gridRows;
                break;
            case 'down':
                newRow = (row + 1) % gridRows;
                break;
            case 'left':
                newCol = (col - 1 + gridCols) % gridCols;
                break;
            case 'right':
                newCol = (col + 1) % gridCols;
                break;
        }

        let newIndex = newRow * gridCols + newCol;

        // Ensure index is within range
        if (newIndex >= characters.length) {
            newIndex = (newRow * gridCols) + (characters.length % gridCols) - 1;
            if (newIndex < 0) newIndex = characters.length - 1;
        }

        // Update state
        setState(prev => ({
            ...prev,
            [player]: {
                ...prev[player],
                focusIndex: newIndex
            }
        }));

        // Update focus
        updateFocus(player);
    };

    // Confirm character selection
    const confirmSelection = (player: 'p1' | 'p2') => {
        // Skip if already confirmed
        if (state[player].confirmed) return;

        console.log(`${player.toUpperCase()} CONFIRMING SELECTION`);

        // Get the selected character
        const selectedChar = characters[state[player].focusIndex];

        // Play confirmation sound
        playSoundPlayer(selectedChar);

        // Add confirmation flash effect - using a different name to avoid shadowing
        const characterElements = document.querySelectorAll('.character');
        const selectedElement = characterElements[state[player].focusIndex] as any;
        if (selectedElement) {
            // Apply flash effect using the flash animation from HTML
            // We're directly manipulating the element style to use the flash animation
            selectedElement.style.animation = 'flash 600ms linear';
            setTimeout(() => {
                selectedElement.style.animation = '';
            }, 700);

            // Add confirmation highlight
            selectedElement.classList.add(`confirmed-${player}`);
            setTimeout(() => {
                selectedElement.classList.remove(`confirmed-${player}`);
            }, 500);

            // Also add active class to show selection
            characterElements.forEach(char => {
                char.classList.remove(`active-${player}`);
            });
            selectedElement.classList.add(`active-${player}`);
        }

        // Update state - this is crucial for the 2-second window to work
        setState(prev => ({
            ...prev,
            [player]: {
                ...prev[player],
                confirmed: true,
                selecting: false
            }
        }));

        // Since setState is asynchronous, we'll use the updated state in
        // the useEffect hook that watches for confirmed state changes.
        // This function will just log info.
        const otherPlayer = player === 'p1' ? 'p2' : 'p1';
        const otherPlayerConfirmed = player === 'p1' ? state.p2.confirmed : state.p1.confirmed;

        console.log(`${player.toUpperCase()} CONFIRMED, ${otherPlayer.toUpperCase()} CONFIRMED: ${otherPlayerConfirmed}`);
    };

    // Cancel selection
    const cancelSelection = (player: 'p1' | 'p2') => {
        console.log(`Attempting to cancel for ${player}. Final: ${state.selectionFinal}, Countdown: ${!!state.finalCountdown}`);

        // IMPORTANT: If selection is final (2-second window has passed), cancel is not allowed
        if (state.selectionFinal) {
            console.log('Cannot cancel - selections are final after 2-second window');
            return;
        }

        // If the countdown is running (we're in the 2-second window), allow cancellation
        if (state.finalCountdown) {
            console.log('Canceling during 2-second countdown window');

            // Stop the countdown timer
            clearTimeout(state.finalCountdown);

            // Also clear any backup timers that might be running
            // Find and clear all interval timers (this is a safety measure)
            const highestId = window.setTimeout(() => {}, 0);
            for (let i = highestId; i >= 0; i--) {
                // Clear any intervals that might be our backup timer
                window.clearInterval(i);
            }

            // Remove the countdown display
            const countdownContainer = document.getElementById('countdown-container');
            if (countdownContainer && countdownContainer.parentNode) {
                countdownContainer.parentNode.removeChild(countdownContainer);
            }

            // Update player statuses in the UI
            const p1Status = document.querySelector('.player-status.p1');
            const p2Status = document.querySelector('.player-status.p2');

            const p1Char = characters[state.p1.focusIndex];
            const p2Char = characters[state.p2.focusIndex];

            if (p1Status) {
                p1Status.textContent = player === 'p1'
                    ? `P1 ${p1Char.displayName}`
                    : `P1 ${p1Char.displayName}`;
            }

            if (p2Status) {
                p2Status.textContent = player === 'p2'
                    ? `P2 ${p2Char.displayName}`
                    : `P2 ${p2Char.displayName}`;
            }

            // Reset the countdown state
            setState(prev => ({
                ...prev,
                finalCountdown: null
            }));
        }
        // If the other player hasn't confirmed yet, allow normal cancellation
        else {
            const otherPlayer = player === 'p1' ? 'p2' : 'p1';
            const otherPlayerConfirmed = state[otherPlayer].confirmed;

            if (!otherPlayerConfirmed) {
                console.log('Normal cancellation - other player has not confirmed');
                // Allow normal cancellation
            } else {
                // Both confirmed but somehow no countdown is running - safety check
                console.log('WARNING: Both confirmed but no countdown - should not happen');
                return; // Don't allow cancellation in this unexpected state
            }
        }

        // Proceed with cancellation

        // Clear active selection but maintain focus
        const characterElements = document.querySelectorAll('.character');
        characterElements.forEach(char => {
            char.classList.remove(`active-${player}`);
        });

        // Re-apply focus to the current index
        const selectedElement = characterElements[state[player].focusIndex];
        if (selectedElement) {
            selectedElement.classList.add(`focus-${player}`);
        }

        // Update state
        setState(prev => ({
            ...prev,
            [player]: {
                ...prev[player],
                confirmed: false,
                selecting: true
            }
        }));

        // Play sound to indicate cancellation
        // playSound(selectSoundRef.current);
    };
    // Reset game selections
    const resetGame = () => {
        // Clear all selections and states
        const characterElements = document.querySelectorAll('.character');
        characterElements.forEach((char) => {
            char.classList.remove('active-p1', 'active-p2', 'focus-p1', 'focus-p2');
        });

        // Hide the modal, ready message and reset button
        setShowStartModal(false);

        const readyMessage = document.querySelector('.ready-message') as any;
        const resetButton = document.querySelector('.reset-button') as any;

        if (readyMessage) {
            // Animate out
            readyMessage.style.transition = 'all 0.3s ease-in';
            readyMessage.style.transform = 'scale(0.8)';
            readyMessage.style.opacity = '0';

            // Then hide
            setTimeout(() => {
                readyMessage.classList.add('hidden');
                readyMessage.style.animation = '';
            }, 300);
        }

        if (resetButton) {
            // Animate out the reset button
            resetButton.style.transition = 'all 0.2s ease-in';
            resetButton.style.opacity = '0';
            resetButton.style.transform = 'translateY(20px)';

            // Then hide it
            setTimeout(() => {
                resetButton.style.display = 'none';
            }, 200);
        }

        // Also remove any countdown container that might be present
        const countdownContainer = document.getElementById('countdown-container');
        if (countdownContainer && countdownContainer.parentNode) {
            countdownContainer.parentNode.removeChild(countdownContainer);
        }

        // Clear any backup timers that might be running
        // Find and clear all interval timers (this is a safety measure)
        const highestId = window.setTimeout(() => {}, 0);
        for (let i = highestId; i >= 0; i--) {
            // Clear any intervals
            window.clearInterval(i);
        }

        // Reset state
        setState({
            p1: {
                focusIndex: state.p1.focusIndex,
                confirmed: false,
                selecting: true
            },
            p2: {
                focusIndex: state.p2.focusIndex,
                confirmed: false,
                selecting: hasTwoWallets
            },
            finalCountdown: null,
            selectionFinal: false
        });

        // Set initial focus for both players
        setTimeout(() => {
            updateFocus('p1');
            if (hasTwoWallets) updateFocus('p2');
        }, 50);
    };

    // Start game with selected characters
    const startGame = () => {
        // Navigate to the world page with selected characters as query params
        router.push(`/round?p1=${encodeURIComponent(selectedCharacters.p1)}&p2=${encodeURIComponent(selectedCharacters.p2)}`);
    };


    // Generate character grid classes
    const getCharacterClass = (index: number) => {
        const isP1Focus = state.p1.focusIndex === index && !state.p1.confirmed;
        const isP2Focus = state.p2.focusIndex === index && !state.p2.confirmed;
        const isP1Active = state.p1.focusIndex === index && state.p1.confirmed;
        const isP2Active = state.p2.focusIndex === index && state.p2.confirmed;

        return `character ${isP1Focus ? 'focus-p1' : ''} ${isP2Focus ? 'focus-p2' : ''} ${isP1Active ? 'active-p1' : ''} ${isP2Active ? 'active-p2' : ''}`;
    };

    // Handle character click
    const handleCharacterClick = (index: number) => {
        if (!state.selectionFinal) {
            if (!state.p1.confirmed) {
                setState(prev => ({
                    ...prev,
                    p1: {
                        ...prev.p1,
                        focusIndex: index
                    }
                }));
                updateFocus('p1');
                confirmSelection('p1');
            } else if (hasTwoWallets && !state.p2.confirmed) {
                setState(prev => ({
                    ...prev,
                    p2: {
                        ...prev.p2,
                        focusIndex: index
                    }
                }));
                updateFocus('p2');
                confirmSelection('p2');
            }
        }
    };

    return (
        <div className="min-h-screen w-full flex justify-center items-center"
            style={{
                background: "url('/default.jpg')",
                backgroundSize: 'cover',
                backdropFilter: 'brightness(0.2) blur(2px)',
                height: '100%'
            }}>
            <div style={{ position: 'absolute', backgroundColor: "#000000aa", backdropFilter: 'brightness(0.2) blur(2px)', height: '100vh', width: '100%', }}>

            </div>
            <div
            style={{
                background: "url('/world-0.jpg')",
                backgroundSize: 'contain',
                backdropFilter: 'brightness(0.2) blur(2px)',
            }}
            className="bg-black bg-opacity-70 h-screen">
                <div

                style={{
                    backgroundSize: 'cover',
                    backdropFilter: 'brightness(0.2) blur(2px)',
                }}

                className="inner w-full h-full backdrop-blur-sm backdrop-brightness-[0.2] p-4">
                {/* Add CSS for character selection states */}
                    {<h1 className="font-bold mb-2 text-white" style={{textAlign: "center"}}>
                        AI AGENT SELECT
                    </h1>}
                    {/*<div className="controls-help text-center text-xs bg-black bg-opacity-50 p-2 rounded-md mb-4 max-w-[860px] mx-auto">
                        <p>P1 ({player1Display}): WASD to move, SPACE to select, BACKSPACE to cancel</p>
                        {hasTwoWallets && (
                            <p>P2 ({player2Display}): Arrow keys to move, ENTER to select, ESC to cancel</p>
                        )}
                    </div>*/}
                    <div className="status-display text-left text-base font-bold my-4 max-w-[860px] mx-auto text-shadow-md">
                        <span style={{width: "46%", textAlign: "left"}} className="player-status p1 inline-block py-1 px-3 mx-1 rounded bg-red-700 bg-opacity-70 text-xs">
                            {`P1 ${state.p1.confirmed
                                ? `${characters[state.p1.focusIndex].displayName}`
                                : state.p1.focusIndex < characters.length
                                    ? characters[state.p1.focusIndex].displayName
                                    : 'Selecting'}`}
                        </span>
                        {hasTwoWallets && (
                            <span style={{width: "46%", textAlign: "right"}} className="player-status p2 inline-block py-1 px-3 mx-1 rounded bg-blue-700 bg-opacity-70 text-xs">
                                {`${state.p2.confirmed
                                    ? `${characters[state.p2.focusIndex].displayName}`
                                    : state.p2.focusIndex < characters.length
                                        ? characters[state.p2.focusIndex].displayName
                                        : 'Selecting'}`} :P2
                            </span>
                        )}
                    </div>
                    <div className="select-container w-[850px] mx-auto my-4 p-[4px_4px_0px]" id="select-container" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 100px)',
                        gridTemplateRows: 'repeat(2, 120px)',
                        gap: '7px',
                        paddingBottom: '7px',
                        background: 'rgba(255, 255, 255, 0.5)',
                        justifyContent: 'center'
                    }}>
                        {characters.map((char, index) => (
                            <div
                                key={char.name}
                                className={getCharacterClass(index)}
                                onClick={() => handleCharacterClick(index)}
                                data-name={char.name}
                                style={{
                                    width: '100px',
                                    height: '120px',
                                    background: 'rgba(255, 255, 255, 0.5)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    textAlign: 'center',
                                    transition: 'all 0.2s ease-in-out',
                                    overflow: 'hidden'
                                }}
                                // rel={char.displayName}
                            >
                                <div className="img-container" style={{
                                    position: 'relative',
                                    width: '100px',
                                    height: '120px',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    justifyContent: 'center'
                                }}>
                                    <img
                                        className="character__img"
                                        src={`/${char.name}.avif`}
                                        alt={char.displayName}
                                        style={{
                                            filter: 'grayscale(0.99)',
                                            height: '120px',
                                            width: 'auto',
                                            margin: 0,
                                            padding: 0
                                        }}
                                    />
                                    <p className="character__name" style={{
                                        position: 'absolute',
                                        width: '100%',
                                        bottom: 0,
                                        display: 'none',
                                        margin: 0,
                                        padding: 0
                                    }}>
                                        {char.displayName}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Character info panels - Below the character grid */}
                    <div className="character-info-container mt-6 mx-auto" style={{ maxWidth: '860px' }}>
                        <div className="flex justify-between gap-4">
                            {/* Player 1 Character Info */}
                            <div className="w-1/2 p-4 rounded-md" style={{
                                background: 'rgba(20, 20, 20, 0.7)',
                                border: '2px solid rgba(227, 35, 30, 0.7)',
                                minHeight: '290px',
                                maxHeight: '290px',
                                overflow: 'auto'
                            }}>
                                <CharacterInfoPanel
                                    character={characters[state.p1.focusIndex]}
                                    player="p1"
                                />
                            </div>

                            {/* Player 2 Character Info */}
                            <div className="w-1/2 p-4 rounded-md" style={{
                                background: 'rgba(20, 20, 20, 0.7)',
                                border: '2px solid rgba(30, 104, 227, 0.7)',
                                minHeight: '290px',
                                maxHeight: '290px',
                                overflow: 'auto'
                            }}>
                                {hasTwoWallets ? (
                                    <CharacterInfoPanel
                                        character={characters[state.p2.focusIndex]}
                                        player="p2"
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">
                                        <div className="text-center">
                                            <p className="mb-2 text-lg">Connect a second wallet</p>
                                            <p className="text-sm">to enable Player 2 selection</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

            {/* Modal for starting the game */}
            {showStartModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-100">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl w-full">
                        <h2 className="text-2xl font-bold text-yellow-400 mb-4 text-center">AI Agents Selected!</h2>
                        <div className="flex justify-between mb-6 gap-6">
                            {/* Player 1 Character */}
                            <div className="w-1/2">
                                <div className="text-center mb-4">
                                    <div className="bg-red-900 bg-opacity-70 p-2 rounded-md mb-2 inline-block">
                                        <img
                                            src={`/${selectedCharacters.p1}.avif`}
                                            alt={selectedCharacters.p1}
                                            style={{
                                                width: '100px',
                                                height: '120px',
                                                objectFit: 'cover',
                                                objectPosition: 'top center'
                                            }}
                                            className="mx-auto"
                                        />
                                    </div>
                                    <p className="text-white">{player1Display}</p>
                                </div>
                            </div>

                            <div className="flex-center text-white text-4xl font-bold">VS</div>

                            {/* Player 2 Character */}
                            <div className="w-1/2">
                                <div className="text-center mb-4">
                                    <div className="bg-blue-900 bg-opacity-70 p-2 rounded-md mb-2 inline-block">
                                        <img
                                            src={`/${selectedCharacters.p2}.avif`}
                                            alt={selectedCharacters.p2}
                                            style={{
                                                width: '100px',
                                                height: '120px',
                                                objectFit: 'cover',
                                                objectPosition: 'top center'
                                            }}
                                            className="mx-auto"
                                        />
                                    </div>
                                    <p className="text-white">{player2Display}</p>
                                </div>

                                {/* Character Info */}
                                <div className="p-3 rounded-md bg-gray-900 text-white text-sm">
                                    {(() => {
                                        const char = characters.find(c => c.name === selectedCharacters.p2);
                                        return char ? (
                                            <>
                                                <div className="font-bold text-blue-400 mb-1">{char.displayName}</div>
                                                <div className="mb-2 text-xs">
                                                    <span className="text-gray-400">Model:</span> {char.modelType} ({char.llmModel})
                                                </div>
                                                {/*<div className="mb-2">
                                                    <div className="text-gray-400 text-xs">Specialties:</div>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {char.features.map((feature, idx) => (
                                                            <span key={idx} className="text-xs px-1.5 py-0.5 bg-blue-900 rounded">
                                                                {feature}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>*/}
                                            </>
                                        ) : null;
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between gap-4 mt-6">
                            <button
                                className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md text-lg"
                                onClick={startGame}
                            >
                                Start Game
                            </button>
                            <button
                                className="w-1/2 bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-4 rounded-md text-lg"
                                onClick={resetGame}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}