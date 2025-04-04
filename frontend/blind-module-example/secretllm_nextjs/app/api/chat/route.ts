import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        console.log(body, "body");
        const response = await fetch(
            // `${process.env.NILAI_API_URL}/v1/chat/completions`,
            `http://127.0.0.1:5000/ask_ai`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.NILAI_API_KEY}`,
                },
                body: JSON.stringify({
                    // model: "meta-llama/Llama-3.1-8B-Instruct",
                    model: "",
                    // extract last message from the array
                    // messages: body.messages.slice(-1),
                    // question: "hello",
                    question: body.messages.slice(-1)[0].content,
                    // messages: body.messages,
                    temperature: 0.2,
                }),
            }
        );

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Chat error:", error);
        return NextResponse.json(
            { error: "Failed to process chat request" },
            { status: 500 }
        );
    }
}
