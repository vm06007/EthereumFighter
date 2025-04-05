"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatMessage as ChatMessageType } from "./lib/types/api";
import ChatMessage from "./ChatMessage";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { shorten } from 'lib/utils';
import { useAccount, useEnsName } from 'wagmi';

export default function Home() {
    // Get connected account information
    const { address, isConnected } = useAccount();
    // Try to get ENS name for the connected address
    const { data: ensName } = useEnsName({ address });

    // For second player (in a real app, this would come from another connection)
    const [player2Address, setPlayer2Address] = useState<string | null>(null);

    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [messages2, setMessages2] = useState<ChatMessageType[]>([]);

    const [input, setInput] = useState("");
    const [input2, setInput2] = useState("");

    const [loading, setLoading] = useState(false);
    const [loading2, setLoading2] = useState(false);

    // State for initial page loading animation
    const [isPageLoading, setIsPageLoading] = useState(true);
    // State for image reveal animation (0-100%)
    const [imageRevealPercent, setImageRevealPercent] = useState(0);

    // New states for streaming responses
    const [streamedResponse, setStreamedResponse] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [streamedResponse2, setStreamedResponse2] = useState("");
    const [isTyping2, setIsTyping2] = useState(false);

    // New state for help overlay
    const [showHelpOverlay, setShowHelpOverlay] = useState(false);
    // New state for selected suggestion index
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    // State to store chat window dimensions
    const [chatWindowDimensions, setChatWindowDimensions] = useState({ top: 0, left: 0, width: 0, height: 0 });

    const [player1EyeOpen, setPlayer1EyeOpen] = useState(true);
    const [player2EyeOpen, setPlayer2EyeOpen] = useState(true);
    const [blurModeActive, setBlurModeActive] = useState(false);

    // State to track active player (for blur effect when both eyes closed)
    const [activePlayer, setActivePlayer] = useState('p1');

    // State for suggested commands that can be updated
    const [commands, setCommands] = useState([
        { text: "Swap 10 USD for ETH ", category: "usd_to_eth", valueIndex: 1, step: 5 },
        { text: "Swap 0.5 ETH for USD", category: "eth_to_usd", valueIndex: 1, step: 0.1 },
        { text: "Buy 10 ETH with USD", category: "buy_eth", valueIndex: 1, step: 5 },
        { text: "Check market prices", category: "check_balance" },
        { text: "Increase stake by 0.1 ETH", category: "action_stake_increase", valueIndex: 1, step: 0.1 }
    ]);

    const messagesEndRef1 = useRef<HTMLDivElement>(null);
    const messagesEndRef2 = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const chatWindowRef = useRef<HTMLDivElement>(null);

    // Effect for simulating loading animation when page first loads
    useEffect(() => {
        // Generate a random address for player 2 right away
        const randomAddress = `0x${Array.from({length: 40}, () => 
            Math.floor(Math.random() * 16).toString(16)).join('')}`;
        setPlayer2Address(randomAddress);
        
        // Simulate initial loading delay (5 seconds)
        const loadingTimer = setTimeout(() => {
            setIsPageLoading(false);
            
            // Start the image reveal animation
            let percent = 0;
            const revealInterval = setInterval(() => {
                percent += 1;
                setImageRevealPercent(percent);
                
                // When animation reaches 100%, clear the interval
                if (percent >= 100) {
                    clearInterval(revealInterval);
                }
            }, 25); // 25ms per percent = ~2.5 seconds for full reveal
            
        }, 5000);

        // Clean up timeout on unmount
        return () => clearTimeout(loadingTimer);
    }, []);

    // Effect to update chat window dimensions when showing overlay
    useEffect(() => {
        if (showHelpOverlay && chatWindowRef.current) {
            const rect = chatWindowRef.current.getBoundingClientRect();
            setChatWindowDimensions({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
        }
    }, [showHelpOverlay]);

    // Helper function to extract and update numeric value in a command
    interface Command {
        text: string;
        category: string;
        valueIndex?: number;
        step?: number;
    }

    const updateCommandValue = (commandText: string, step: number): string => {
        // Regular expression to find a number in the command
        const numberRegex = /(\d+(\.\d+)?)/;
        const match = commandText.match(
            numberRegex
        );

        if (match) {
            const currentValue = parseFloat(
                match[0]
            );

            // Prevent negative values
            const newValue = Math.max(0, currentValue + step);

            // Format to keep decimal places if original had them
            const formattedNewValue = match[0].includes('.') ?
                newValue.toFixed(match[0].split('.')[1].length) :
                Math.floor(newValue);

            return commandText.replace(numberRegex, String(formattedNewValue));
        }

        return commandText;
    };

    // Helper function to simulate chunked responses
    const simulateChunkedResponse = (text: string): string[] => {
        // Break text into chunks of 1-3 characters
        const chunks: string[] = [];
        let i = 0;

        while (i < text.length) {
            const chunkSize = Math.floor(Math.random() * 30) + 10; // 1-3 characters per chunk
            chunks.push(text.slice(i, i + chunkSize));
            i += chunkSize;
        }

        return chunks;
    };

    // Effect for keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Enter key for send when not in help overlay

            if (e.key === 'Enter' && !showHelpOverlay) {
                e.preventDefault();
                handleSubmit(new Event('submit') as any);
            }

            // 'H' key for help - only if input is NOT focused
            if ((e.key === 'Escape') && document.activeElement !== inputRef.current) {
                e.preventDefault();
                setShowHelpOverlay(prev => !prev);
                // Reset selection when opening help
                if (!showHelpOverlay) {
                    setSelectedSuggestion(0);
                }
            }

            // Handle navigation in help overlay
            if (showHelpOverlay) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSuggestion(prev =>
                        prev === 0 ? commands.length - 1 : prev - 1
                    );
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSuggestion(prev =>
                        prev === commands.length - 1 ? 0 : prev + 1
                    );
                } else if (e.key === 'Enter' || e.key === 'x' || e.key === 'X') {
                    e.preventDefault();
                    addSuggestedCommand(commands[selectedSuggestion].text);
                } else if (e.key === 'h' || e.key === 'H') {
                    e.preventDefault();
                    setShowHelpOverlay(false);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    // Handle value adjustment for numeric commands
                    const selectedCommand = commands[selectedSuggestion];

                    // Skip if command doesn't have a step (non-numeric commands)
                    if (!selectedCommand.step) return;

                    const step = e.key === 'ArrowRight'
                        ? selectedCommand.step
                        : -selectedCommand.step;

                    // Update the command text
                    const updatedText = updateCommandValue(
                        selectedCommand.text,
                        step
                    );

                    // Create a new array with the updated command
                    const updatedCommands = [...commands];
                    updatedCommands[selectedSuggestion] = {
                        ...selectedCommand,
                        text: updatedText
                    };

                    // Update state to trigger re-render
                    setCommands(updatedCommands);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [input, showHelpOverlay, selectedSuggestion, commands]);

    useEffect(() => {
        const handleResize = () => {
            if (showHelpOverlay) {
                setShowHelpOverlay(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [showHelpOverlay]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: ChatMessageType = { role: "user", content: input };
        setMessages((prev) => [
            ...prev,
            userMessage
        ]);
        setInput('');
        setLoading(true);
        setIsTyping(true);
        setStreamedResponse(""); // Reset the streamed response

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        ...messages,
                        userMessage
                    ],
                }),
            });

            const data = await res.json();

            // Simulate streaming by breaking the response into chunks
            const responseText = data.response;
            const chunks = simulateChunkedResponse(responseText);

            for (let i = 0; i < chunks.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 60 + Math.random() * 80));
                setStreamedResponse(prev => prev + chunks[i]);
            }

            // Once completed, add to messages
            const assistantMessage: ChatMessageType = {
                role: "assistant",
                content: responseText,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
            setIsTyping(false);
        }
    };

    // Helper function to add suggested commands to input
    const addSuggestedCommand = (command: string) => {
        setInput(command);
        setShowHelpOverlay(false);
        // inputRef.current?.focus();
    };

    const scrollToBottom = () => {
        messagesEndRef1.current?.scrollIntoView({
            behavior: "smooth"
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom2 = () => {
        messagesEndRef2.current?.scrollIntoView({
            behavior: "smooth"
        });
    };

    useEffect(() => {
        scrollToBottom2();
    }, [messages2]);

    const handleSubmit2 = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input2.trim()) return;

        const userMessage: ChatMessageType = { role: "user", content: input2 };
        setMessages2((prev) => [...prev, userMessage]);
        setInput2("");
        setLoading2(true);
        setIsTyping2(true);
        setStreamedResponse2(""); // Reset the streamed response

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        ...messages2,
                        userMessage
                    ],
                }),
            });

            const data = await res.json();

            // Simulate streaming by breaking the response into chunks
            const responseText = data.response;
            const chunks = simulateChunkedResponse(responseText);

            for (let i = 0; i < chunks.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 40)); // Random delay between 30-70ms
                setStreamedResponse2(prev => prev + chunks[i]);
            }

            // Once completed, add to messages
            const assistantMessage: ChatMessageType = {
                role: "assistant",
                content: responseText,
            };
            setMessages2((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading2(false);
            setIsTyping2(false);
        }
    };

    const handleBlind = () => {
        // Toggle eye icon visibility
        const eye = document.querySelector(".eye-on");
        const eye2 = document.querySelector(".eye-off");
        if (eye && eye2) {
            eye.classList.toggle("hidden");
            eye2.classList.toggle("hidden");
        }

        // Get the new state (toggled)
        const newEyeState = !player1EyeOpen;

        // Update player 1 eye status
        setPlayer1EyeOpen(newEyeState);

        // When player 1 clicks eye, set them as active player
        setActivePlayer('p1');

        // Special blur mode handling:
        if (!blurModeActive) {
            // If we're not in blur mode yet, check if both eyes are now closed
            if (!newEyeState && !player2EyeOpen) {
                // Both players have closed eyes, activate blur mode
                setBlurModeActive(true);
                console.log("BLUR MODE ACTIVATED - Both players must open eyes to deactivate");
            }
        } else {
            // We're already in blur mode - check if both eyes are now open
            if (newEyeState && player2EyeOpen) {
                // Both players have opened eyes, deactivate blur mode
                setBlurModeActive(false);
                console.log("BLUR MODE DEACTIVATED - Both players opened eyes");
            }
        }
    }

    const handleBlind2 = () => {
        // Toggle eye icon visibility
        const eye = document.querySelector(".eye-on-2");
        const eye2 = document.querySelector(".eye-off-2");
        if (eye && eye2) {
            eye.classList.toggle("hidden");
            eye2.classList.toggle("hidden");
        }

        // Get the new state (toggled)
        const newEyeState = !player2EyeOpen;

        // Update player 2 eye status
        setPlayer2EyeOpen(newEyeState);

        // When player 2 clicks eye, set them as active player
        setActivePlayer('p2');

        // Special blur mode handling:
        if (!blurModeActive) {
            // If we're not in blur mode yet, check if both eyes are now closed
            if (!newEyeState && !player1EyeOpen) {
                // Both players have closed eyes, activate blur mode
                setBlurModeActive(true);
                console.log("BLUR MODE ACTIVATED - Both players must open eyes to deactivate");
            }
        } else {
            // We're already in blur mode - check if both eyes are now open
            if (newEyeState && player1EyeOpen) {
                // Both players have opened eyes, deactivate blur mode
                setBlurModeActive(false);
                console.log("BLUR MODE DEACTIVATED - Both players opened eyes");
            }
        }
    }

    const handleConfirmSwap = (swapInfo: any) => {
        // Determine which chat the swap was from based on the swapInfo
        // or use some other logic if needed

        // For P1
        const swapMessage: ChatMessageType = {
            role: "user",
            content: `Confirm swap: ${JSON.stringify(swapInfo)}`,
        };
        setMessages((prev) => [...prev, swapMessage]);
    }

    const handleRejectSwap = (swapInfo: any) => {
        // For P1
        const rejectMessage: ChatMessageType = {
            role: "user",
            content: `Reject swap: ${JSON.stringify(swapInfo)}`,
        };
        setMessages((prev) => [...prev, rejectMessage]);
    }

    // Add handlers for Player 2's swaps
    const handleConfirmSwap2 = (swapInfo: any) => {
        const swapMessage: ChatMessageType = {
            role: "user",
            content: `Confirm swap: ${JSON.stringify(swapInfo)}`,
        };
        setMessages2((prev) => [...prev, swapMessage]);
    }

    const handleRejectSwap2 = (swapInfo: any) => {
        const rejectMessage: ChatMessageType = {
            role: "user",
            content: `Reject swap: ${JSON.stringify(swapInfo)}`,
        };
        setMessages2((prev) => [...prev, rejectMessage]);
    }

    return (
        <div className="flex flex-row min-h-screen backdrop">
            <main
                className="flex-1 upper-holder flex flex-col max-w-2xl mx-auto w-full py-10"
                style={{
                    filter: (blurModeActive && activePlayer !== 'p1') ? 'blur(7px)' : 'none',
                    transition: 'filter 0.3s ease'
                }}
            >
                <div className="sticky top-0 z-50 backdrop-blur-sm">
                    <div
                        style={{justifyContent: "space-between"}}
                        className={`max-w-2xl mx-auto flex items-center ${(blurModeActive && activePlayer === 'p1') ? '' : ''}`}
                    >
                        <div className="text-white">
                            P1: {isConnected ? (
                                <span>{ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected")}</span>
                            ) : "Connect your wallet"} 100 ETH 100,000 USD
                        </div>
                        <img className="eye-on" onClick={() => {handleBlind()}} width="40" src="./eye-on.png" />
                        <img className="eye-off hidden" onClick={() => {handleBlind()}} width="40" src="./eye-off.png" />
                    </div>
                    <div className="mb-3 text-white">
                        Agent: {isConnected && address ? shorten(address) : "0x123...321"} claude/llamahaiku3.6
                    </div>
                </div>

                {/* Messages container with position relative for visibility context */}
                <div
                    ref={chatWindowRef}
                    style={{
                        background: isPageLoading ? "none" : "url(./vitalik.jpg)",
                        backgroundSize: "cover",
                        position: "relative",
                        backgroundColor: isPageLoading ? "rgba(0,0,0,0.5)" : "transparent",
                        // Add reveal animation clipping when not loading
                        clipPath: !isPageLoading ? `inset(0 0 ${100 - imageRevealPercent}% 0)` : "none",
                        transition: "clip-path 0.3s ease-out"
                    }}
                    className="flex-1 chat-window bg-cover overflow-y-auto p-4 space-y-4 border-2 border-gray-600 border-gray-600 rounded-xl">
                    {isPageLoading ? (
                        <div className="flex h-full justify-center items-center">
                            <div className="bg-gray-800 bg-opacity-80 rounded-lg px-6 py-4 text-white">
                                <div className="flex flex-col items-center gap-2">
                                    <img width="80" height="80" src="./snail.gif"></img>
                                    <span className="text-lg font-semibold mt-2">Generating...</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message, index) => (
                                <ChatMessage
                                    key={index}
                                    message={message}
                                    onConfirmSwap={handleConfirmSwap}
                                    onRejectSwap={handleRejectSwap}
                                    isLatestMessage={index === messages.length - 1}
                                    player="p1"
                                />
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-800 rounded-lg px-4 py-2 text-white">
                                        {isTyping && streamedResponse ? (
                                            <div className="markdown prose prose-invert max-w-none">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({node, ...props}) => <p className="whitespace-pre-wrap mb-4" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4" {...props} />,
                                                        li: ({node, ...props}) => <li className="mb-1" {...props} />
                                                    }}
                                                >
                                                    {streamedResponse}
                                                </ReactMarkdown>
                                                <span className="inline-block animate-pulse">▋</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <img width="50" height="50" src="./snail.gif"></img>
                                                <span>Thinking...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef1} />

                    {/* Help Overlay - using fixed positioning with exact dimensions of the chat window */}
                    {showHelpOverlay && (
                        <div
                            className="fixed bg-black bg-opacity-90 backdrop-blur-md rounded-xl z-50"
                            style={{
                                top: chatWindowDimensions.top - 13,
                                left: chatWindowDimensions.left + 2,
                                width: chatWindowDimensions.width - 4,
                                height: chatWindowDimensions.height - 5,
                                overflow: 'auto',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div className="p-4 h-full flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-white text-xl font-bold">Suggested Prompts</h2>
                                    <button
                                        onClick={() => setShowHelpOverlay(false)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {commands.map((command, index) => (
                                        <div
                                            key={index}
                                            onClick={() => {
                                                setSelectedSuggestion(index);
                                                addSuggestedCommand(command.text);
                                            }}
                                            className={`
                                                flex items-center justify-between
                                                p-4 rounded-lg cursor-pointer
                                                transition-colors
                                                ${selectedSuggestion === index
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
                                            `}
                                        >
                                            <span className="flex-1">{command.text}</span>
                                            <div className="flex items-center">
                                                {command.step && selectedSuggestion === index && (
                                                    <div className="flex items-center mr-3">
                                                        {/*<span className="text-xs mr-2">Adjust:</span>*/}
                                                        <div className="gamepad-button-wrapper">
                                                            <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--dpad-left gamepad-button-playstation--variant-ps1 gamepad-button--clickable">←</i>
                                                        </div>
                                                        <div className="gamepad-button-wrapper mx-1">
                                                            <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--dpad-right gamepad-button-playstation--variant-ps1 gamepad-button--clickable">→</i>
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedSuggestion === index && (
                                                    <div className="gamepad-button-wrapper">
                                                        <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--cross gamepad-button-playstation--variant-ps1 gamepad-button--clickable">X</i>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 text-sm text-gray-400 flex justify-between flex-wrap">
                                    <span>↑/↓: Navigate</span>
                                    <span>←/→: Adjust value</span>
                                    <span>X: Select</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input form */}
                <div className="p-4">
                    <form
                        onSubmit={handleSubmit}
                        className="flex gap-2 max-w-2xl mx-auto"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isPageLoading}
                            className="flex-1 px-4 py-2 rounded-lg border
                                bg-gray-800 border-gray-700
                                focus:outline-none focus:ring-2 focus:ring-gray-500
                                text-white disabled:opacity-70"
                            placeholder="What is your next order?"
                        />
                        <button
                            type="submit"
                            disabled={loading || isPageLoading}
                            className="px-4 flex-center py-2 bg-black bg-white text-black
                            rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                            <div className="gamepad-button-wrapper">
                                <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--triangle gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                            </div>
                            <div>Send</div>
                        </button>
                        <button
                            type="button"
                            disabled={isPageLoading}
                            onClick={() => {
                                setShowHelpOverlay(true);
                                setSelectedSuggestion(0);
                            }}
                            className="px-4 flex-center py-2 bg-black bg-white text-black
                            rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <div className="gamepad-button-wrapper">
                                <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--circle gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                            </div>
                            <div>Help</div>
                        </button>
                    </form>
                </div>
            </main>
            <div className="fixed inset-0 flex justify-center items-center pointer-events-none z-50">
                <div style={{ transform: "translateY(-40px)" }}>
                    <img style={{ width: "220px", margin: "0 auto" }} src="https://png.pngtree.com/png-vector/20221216/ourmid/pngtree-luxury-vs-versus-challenge-against-transparent-clipart-background-png-image_6527640.png" alt="vs" />

                    {/* Notification when blur mode is active */}
                    {/*blurModeActive && (
                        <div className="text-white text-xs bg-black bg-opacity-70 p-2 rounded-md mt-2 text-center animate-pulse">
                            {activePlayer === 'p1'
                                ? "P1 view active. BOTH players must open eyes to exit blind mode."
                                : "P2 view active. BOTH players must open eyes to exit blind mode."}
                        </div>
                    )*/}
                </div>
            </div>

            <main
                className="flex-1 upper-holder flex flex-col max-w-2xl mx-auto w-full py-10"
                style={{
                    filter: (blurModeActive && activePlayer !== 'p2') ? 'blur(7px)' : 'none',
                    transition: 'filter 0.3s ease'
                }}
            >
                <div className="sticky top-0 z-10 backdrop-blur-sm">
                    <div
                        style={{justifyContent: "space-between"}}
                        className={`flex max-w-2xl mx-auto items-center ${(blurModeActive && activePlayer === 'p2') ? '' : ''}`}
                    >
                        <img className="eye-on-2"  onClick={() => {handleBlind2()}} width="40" src="./eye-on.png" />
                        <img className="eye-off-2 hidden" onClick={() => {handleBlind2()}} width="40" src="./eye-off.png" />
                        <div style={{textAlign: "right"}} className="text-white">
                            P2: {player2Address ? `${player2Address.slice(0, 6)}...${player2Address.slice(-4)}` : "0x123...321"} 100 ETH 100,000 USD
                        </div>
                    </div>
                    <div className="mb-3 text-white" style={{textAlign: "right"}}>
                        Agent: { shorten(player2Address || "") || "0x123...321"} claude/llamahaiku3.6
                    </div>
                </div>
                <div
                    style={{
                        background: isPageLoading ? "none" : "url(./vitalik2.jpg)",
                        backgroundColor: isPageLoading ? "rgba(0,0,0,0.5)" : "transparent",
                        backgroundSize: "cover",
                        // Add reveal animation clipping when not loading
                        clipPath: !isPageLoading ? `inset(0 0 ${100 - imageRevealPercent}% 0)` : "none",
                        transition: "clip-path 0.3s ease-out"
                    }}
                    className="flex-1 bg-cover chat-window overflow-y-auto p-4 space-y-4 border-2 border-gray-600 border-gray-600 rounded-xl">
                    {isPageLoading ? (
                        <div className="flex h-full justify-center items-center">
                            <div className="bg-gray-800 bg-opacity-80 rounded-lg px-6 py-4 text-white">
                                <div className="flex flex-col items-center gap-2">
                                    <img width="80" height="80" src="./snail.gif"></img>
                                    <span className="text-lg font-semibold mt-2">Generating...</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages2.map((message, index) => (
                                <ChatMessage
                                    key={index}
                                    message={message}
                                    onConfirmSwap={handleConfirmSwap2}
                                    onRejectSwap={handleRejectSwap2}
                                    isLatestMessage={index === messages2.length - 1}
                                    player="p2"
                                />
                            ))}
                            {loading2 && (
                                <div className="flex justify-end">
                                    <div className="bg-gray-800 rounded-lg px-4 py-2 text-white">
                                        {isTyping2 && streamedResponse2 ? (
                                            <div className="markdown prose prose-invert max-w-none">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        p: ({node, ...props}) => <p className="whitespace-pre-wrap mb-4" {...props} />,
                                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-4" {...props} />,
                                                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-4" {...props} />,
                                                        li: ({node, ...props}) => <li className="mb-1" {...props} />
                                                    }}
                                                >
                                                    {streamedResponse2}
                                                </ReactMarkdown>
                                                <span className="inline-block animate-pulse">▋</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <img width="50" height="50" src="./snail.gif"></img>
                                                <span>Thinking...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef2} />
                </div>

                {/* Input form */}
                <div className="p-4">
                    <form
                        onSubmit={handleSubmit2}
                        className="flex gap-2 max-w-2xl mx-auto"
                    >
                        <button
                            type="button"
                            disabled={isPageLoading}
                            onClick={() => {
                                // setShowHelpOverlay(true);
                                // setSelectedSuggestion(0);
                            }}
                            className="px-4 flex-center py-2 bg-black bg-white text-black
                            rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            <div className="gamepad-button-wrapper">
                                <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--circle gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                            </div>
                            <div>Help</div>
                        </button>
                        <button
                            type="submit"
                            disabled={loading2 || isPageLoading}
                            className="px-4 flex-center py-2 bg-black bg-white text-black
                            rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                            <div>Send</div>
                            <div className="gamepad-button-wrapper">
                                <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--triangle gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                            </div>
                        </button>
                        <input
                            type="text"
                            value={input2}
                            onChange={(e) => setInput2(e.target.value)}
                            disabled={isPageLoading}
                            className="flex-1 px-4 py-2 rounded-lg border
                                bg-gray-800 border-gray-700
                                focus:outline-none focus:ring-2 focus:ring-gray-500
                                text-white disabled:opacity-70"
                            placeholder="What is your next order?"
                        />
                    </form>
                </div>
            </main>
        </div>
    );
}
