import React, { useRef } from "react";
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
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    onConfirmSwap,
    onRejectSwap,
    isLatestMessage = false
}) => {

    // Create a ref for the confirm button
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

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

    const displayContent = message.content;

    return (
        <div
            className={`flex ${message.role === "user"
                ? "justify-end"
                : "justify-start"}`
            }
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
                    displayContent
                ) : (
                    <div className="flex flex-col">
                        <div className="markdown prose prose-invert max-w-none">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-4" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-4" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-4" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />
                                }}
                            >
                                {displayContent}
                            </ReactMarkdown>
                        </div>

                        {/* Render confirm/reject buttons if swap info is detected */}
                        {swapInfo && (
                            <div>
                                {isLatestMessage && (
                                    <p className="text-xs text-gray-400 mb-2">
                                        Press spacebar to confirm (when not typing)
                                    </p>
                                )}
                                <div className="flex mt-2 mb-4 space-x-2">
                                    <button
                                        ref={confirmButtonRef}
                                        onClick={() => onConfirmSwap(swapInfo)}
                                        className="flex-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => onRejectSwap(swapInfo)}
                                        className="flex flex-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                    >
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
