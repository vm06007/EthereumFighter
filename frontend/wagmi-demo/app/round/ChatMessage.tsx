import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

interface ChatMessageProps {
    message: Message;
    onConfirmSwap: (swapInfo: any) => void;
    onRejectSwap: (swapInfo: any) => void;
    isLatestMessage?: boolean;
    player?: 'p1' | 'p2'; // Identify which player's chat window
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    onConfirmSwap,
    onRejectSwap,
    isLatestMessage = false,
    player = 'p1' // Default to player 1 if not specified
}) => {
    // Create refs for the confirm and reject buttons
    const confirmButtonRef = useRef<HTMLButtonElement>(null);
    const rejectButtonRef = useRef<HTMLButtonElement>(null);

    // Function to extract swap info from message content
    const extractSwapInfo = (content: string): any | null => {
        try {
            // Try to find JSON with SWAP_INFO key
            let match = content.match(/({[\s\S]*"SWAP_INFO"[\s\S]*})/);
            if (match) {
                const json = JSON.parse(match[0]);
                if (json && json.SWAP_INFO) {
                    return json;
                }
            }

            // Try to find JSON with inputToken/outputToken format
            match = content.match(/({[\s\S]*"inputToken"[\s\S]*"outputToken"[\s\S]*})/);
            if (match) {
                const json = JSON.parse(match[0]);
                if (json && json.inputToken && json.outputToken) {
                    // Wrap in SWAP_INFO object for consistent handling
                    return { SWAP_INFO: json };
                }
            }

            // Try to find any JSON block that might be related to swaps
            const jsonBlocks = content.match(/({[\s\S]*})/g) || [];
            for (const block of jsonBlocks) {
                try {
                    const json = JSON.parse(block);
                    // Check if it has swap-related properties
                    if (json && (
                        (json.from_token && json.to_token) ||
                        (json.fromToken && json.toToken) ||
                        (json.from && json.to) ||
                        (json.input && json.output)
                    )) {
                        return { SWAP_INFO: json };
                    }
                } catch (e) {
                    // Continue to next block if parsing fails
                    continue;
                }
            }

            return null;
        } catch (error) {
            console.error("Error parsing SWAP_INFO:", error);
            return null;
        }
    };

    // Extract SWAP_INFO from message if it exists
    const swapInfo = message.role === "assistant"
        ? extractSwapInfo(message.content)
        : null;

    // Process message content to highlight JSON
    const processMessageContent = (content: string) => {
        // Regular expression to find JSON blocks
        const jsonRegex = /```json\s*([\s\S]*?)```|({[\s\S]*?})/g;
        const parts: Array<{type: 'text' | 'json', content: string}> = [];

        let lastIndex = 0;
        let match;

        while ((match = jsonRegex.exec(content)) !== null) {
            // Add text before the JSON
            if (match.index > lastIndex) {
                parts.push({
                    type: 'text',
                    content: content.substring(lastIndex, match.index)
                });
            }

            // Add the JSON part
            let jsonContent = match[1] || match[2];
            try {
                // Try to parse and prettify the JSON
                const parsed = JSON.parse(jsonContent);
                jsonContent = JSON.stringify(parsed, null, 2);
            } catch (e) {
                // If parsing fails, use the original content
                console.log('Failed to parse JSON:', e);
            }

            parts.push({
                type: 'json',
                content: jsonContent
            });

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text after last JSON block
        if (lastIndex < content.length) {
            parts.push({
                type: 'text',
                content: content.substring(lastIndex)
            });
        }

        // If no JSON was found, return the whole content as text
        if (parts.length === 0) {
            parts.push({
                type: 'text',
                content: content
            });
        }

        return parts;
    };

    // Process the message content
    const processedContent = message.role === "assistant"
        ? processMessageContent(message.content)
        : [{ type: 'text', content: message.content }];

    let justifyClass = message.role === "user"
        ? "justify-end"
        : "justify-start";

    let justifyClassAssistant = "justify-start";
    if (player === 'p2') {
        // Adjust justification for player 1
        justifyClassAssistant = "justify-end"
    }


    if (player === 'p2') {
        // Adjust justification for player 2
        justifyClass = message.role === "user"
            ? "justify-start"
            : "justify-end";
    }

    return (
        <div
            className={`flex ${message.role === "user" ? justifyClass : justifyClassAssistant}`}
        >
            <div
                className={`
                    no-overflow
                    max-w-[80%] rounded-lg px-4 py-2
                    ${message.role === "user"
                        ? "bg-white text-black"
                        : "bg-gray-800 text-white"
                    }
                `}
            >
                {message.role === "user" ? (
                    message.content
                ) : (
                    <div className="flex flex-col">
                        {processedContent.map((part, i) => (
                            part.type === 'json' ? (
                                <div key={i} className="my-2 p-3 rounded-md bg-gray-900 border border-gray-700 overflow-auto font-mono text-xs">
                                    <pre className="text-green-400 whitespace-pre-wrap">{part.content}</pre>
                                </div>
                            ) : (
                                <div key={i} className="markdown prose prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-4" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-4" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-4" {...props} />,
                                            li: ({ node, ...props }) => <li className="mb-1" {...props} />
                                        }}
                                    >
                                        {part.content}
                                    </ReactMarkdown>
                                </div>
                            )
                        ))}

                        {/* Render confirm/reject buttons if swap info is detected */}
                        {swapInfo && (
                            <div>
                                {isLatestMessage && (
                                    <p className="text-xs text-gray-400 mb-2">
                                        {/*{player === 'p1' ? (
                                            <>Press Space to confirm or Enter to reject</>
                                        ) : (
                                            <>Press Del/Ins to confirm or End/PageDown to reject</>
                                        )}*/}
                                    </p>
                                )}
                                <div className={`flex mt-2 mb-4 space-x-2 ${justifyClassAssistant}`}>
                                    <button
                                        ref={confirmButtonRef}
                                        onClick={() => onConfirmSwap(swapInfo)}
                                        className="flex-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                    >
                                        <div className="gamepad-button-wrapper">
                                            <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--square gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                                        </div>
                                        Confirm
                                    </button>
                                    <button
                                        ref={rejectButtonRef}
                                        onClick={() => onRejectSwap(swapInfo)}
                                        className="flex flex-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                    >
                                        <div className="gamepad-button-wrapper">
                                            <i className="gamepad-button gamepad-button-playstation gamepad-button-playstation--cross gamepad-button-playstation--variant-ps1 gamepad-button--clickable">CROSS</i>
                                        </div>
                                        <div>Reject</div>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;
