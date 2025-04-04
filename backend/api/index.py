import certifi
import os
import re
from eth_account import Account
from dotenv import load_dotenv
from datetime import datetime
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask import request
import asyncio
import aiohttp
import ssl
import nest_asyncio
nest_asyncio.apply()

app = Flask(__name__)

os.environ["SSL_CERT_FILE"] = certifi.where()

from web3 import Web3

import os

load_dotenv()

app = Flask(__name__)

botRunning = False

CORS(app, resources={r"/*/*": {
    "origins": [
        "http://localhost:3000",
        "http://localhost:4000",
        "http://localhost:5000",
    ]}
})

default_openrouter_ai_model = "google/gemini-2.0-flash-lite-001"

class CryptoTradingAssistant:
    def __init__(self):
        self.OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
        self.OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL")
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    async def process_question(self, question, user_id, model):
        history = ""
        context = ""
        prompt = (
            f"History: {history}\n\n"
            f"Context: {context}\n\n"
            f"Question: {question}\n\n"
            "You are a crypto trading assistant EtherKombat. Your task is to extract the following information from the user's request:\n"
            "Instructions: Answer the question with the following format:\n"
            "- Use bullet points (or emojis as bullet point) to list key features or details.\n"
            "- Separate ideas into paragraphs for better readability!\n"
            "- Often include emojis to make the text more engaging.\n"
            "- If user asked to swap funds include SWAP_INFO at the end AS nicely formatted JSON OBJECT and ensure user you can invoke execution (MUST HAVE AMOUNT TO SWAP) \n"
            "- SWAP_INFO: must have all 4 parameters (from, to, amountFrom, amountTo) and displayed as JSON with each parameter on its own line, otherwise remove SWAP_INFO from response completely!\n"
            "- If SWAP_INFO contains a 'rate' field, include this information in your response to show the user the current exchange rate.\n"
        )

        response = ""
        response = await self.ask_openrouter(prompt, model)

        data = []
        interaction = {
            "user": user_id,
            "interactions": [
                {
                    "question": question,
                    "response": response,
                }
            ],
        }
        data.append(interaction)
        return response

    async def ask_openrouter(self, prompt, model):
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        headers = {"Authorization": f"Bearer {self.OPENROUTER_API_KEY}"}
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a crypto trading assistant for a EthereumFighter game where AI is pinned against each other to see who is a better trader. Use the provided history to maintain conversation context."},
                {"role": "user", "content": prompt}
            ]
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(self.OPENROUTER_API_URL, json=data, headers=headers, ssl=ssl_context) as response:
                if response.status == 200:
                    res = await response.json()
                    print(res)
                    reply = (res).get("choices", [{}])[0].get("message", {}).get("content", "No response received.")
                    logging.info(f"Received response: {reply}")
                    return reply
                else:
                    error_message = f"OpenRouter API error {response.status}: {await response.text()}"
                    logging.error(error_message)
                    return error_message

    async def ask_ai(self, question: str, input_model: str = ""):
        try:
            #@TODO: use wallet address to identify user (pass to function)
            user_id = "endpoint: "+ str(datetime.now())
            # session_id = f"{user_id}"
            response = ""
            print(f"Question: {question}")
            if input_model == "ask_nilai":
                response = await self.process_question(question, user_id, default_openrouter_ai_model)
            else:
                response = await self.process_question(question, user_id, default_openrouter_ai_model)

            return response
        except Exception as e:
            logging.error(f"Error in ask_ai: {e}")
            return "An error occurred while processing your question."

crypto_assistant = CryptoTradingAssistant()

@app.route("/")
def home():
    return "Hello, World!"

@app.route("/ask_ai/<path:question>", methods=["GET"])
def ask_ai_get(question):
    model = request.args.get("model", default_openrouter_ai_model)
    if not question:
        return jsonify({"error": "Question is empty"}), 400

    response = asyncio.run(crypto_assistant.ask_ai(question, model))
    return jsonify({"response": response})

@app.route("/ask_ai", methods=["POST", "OPTIONS"])
def ask_ai_post():
    # can handle OPTIONS manually:
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    question = data.get("question", "")
    model = data.get("model", default_openrouter_ai_model)

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    # Call your async method:
    response = asyncio.run(crypto_assistant.ask_ai(question, model))

    return jsonify({"response": response})

if __name__ == "__main__":
    app.run()
