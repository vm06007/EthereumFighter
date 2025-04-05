import certifi
import os
import re
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

# Token mapping for CoinGecko API IDs
# consider to use 1inch API service later
TOKEN_ID_MAPPING = {
    "ETH": "ethereum",
    "WETH": "weth",
    "USDC": "usd-coin",
    "USD": "usd-coin",
    "USDT": "tether",
    "DAI": "dai",
    "WBTC": "wrapped-bitcoin",
    "BTC": "bitcoin",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "AAVE": "aave",
    "SNX": "synthetix-network-token",
    "MKR": "maker",
    "COMP": "compound-governance-token",
    "YFI": "yearn-finance",
    "SUSHI": "sushi",
    "WISE": "wise-token"
}

async def get_token_price(token_symbol):
    """Get token price in USD from CoinGecko API"""
    token_id = TOKEN_ID_MAPPING.get(token_symbol.upper())
    if not token_id:
        logging.warning(f"No mapping found for token symbol: {token_symbol}")
        return None

    url = f"https://api.coingecko.com/api/v3/simple/price?ids={token_id}&vs_currencies=usd"
    try:
        # Create SSL context with certifi certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())

        # Create connector with the SSL context
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        # Use the connector in the ClientSession
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    if token_id in data and 'usd' in data[token_id]:
                        return data[token_id]['usd']
                logging.warning(f"Failed to get price for {token_symbol}: {await response.text()}")
                return None
    except Exception as e:
        logging.error(f"Error fetching price for {token_symbol}: {str(e)}")
        return None

async def calculate_token_rate(from_token, to_token, from_amount=1.0):
    """Calculate the exchange rate between two tokens"""
    from_price = await get_token_price(from_token)
    to_price = await get_token_price(to_token)

    if from_price is None or to_price is None:
        return None

    # Calculate how much of to_token you get for from_amount of from_token
    rate = (from_price / to_price) * float(from_amount)
    return rate

class CryptoTradingAssistant:
    def __init__(self):
        self.OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
        self.OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL")
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    async def process_question(self, question, user_id, model):
        history = ""
        context = ""
        swap_info = await self.recognize_swap_request_with_ai(question, model)

        # If we have input token, input amount, and output token but no output amount,
        # try to calculate the expected output amount
        print(swap_info)
        print("nextot ifff")
        if (swap_info["inputToken"] and
            swap_info["inputAmount"] and
            swap_info["outputToken"] and
            not swap_info["outputAmount"]):
            try:
                # Calculate expected output amount
                print("making rate")
                rate = await calculate_token_rate(
                    swap_info["inputToken"],
                    swap_info["outputToken"],
                    float(swap_info["inputAmount"])
                )
                if rate:
                    swap_info["outputAmount"] = f"{rate:.6f}"
                    swap_info["rate"] = f"1 {swap_info['inputToken']} ≈ {rate/float(swap_info['inputAmount']):.6f} {swap_info['outputToken']}"
            except Exception as e:
                logging.error(f"Error calculating rate: {e}")

        print(swap_info)
        prompt = (
            f"History: {history}\n\n"
            f"Context: {context}\n\n"
            f"SWAP_INFO: {swap_info}\n\n"
            f"Question: {question}\n\n"
            "You are a crypto trading assistant EthereumFighter. Your task is to extract the following information from the user's request:\n"
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
        # Create SSL context with certifi certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        headers = {"Authorization": f"Bearer {self.OPENROUTER_API_KEY}"}
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a crypto trading assistant for a EthereumFighter game where AI is pinned against each other to see who is a better trader. Use the provided history to maintain conversation context."},
                {"role": "user", "content": prompt}
            ]
        }
        # Create connector with the SSL context
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        # Use the connector in the ClientSession
        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.post(self.OPENROUTER_API_URL, json=data, headers=headers) as response:
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

    async def recognize_swap_request_with_ai(self, request, model):
        """Use AI to extract tokens from the user's request."""
        prompt = (
            "You are a crypto trading assistant. Your task is to extract the following information from the user's request:\n"
            "1. TokenA: The token symbol the user wants to swap FROM (e.g., WISE, ETH, BTC).\n"
            "2. TokenB: The token symbol the user wants to swap TO (e.g., USDT, ETH, DAI).\n"
            "3. AmountA: The amount of TokenA the user wants to swap. If unspecified, return an empty string ''.\n"
            "4. AmountB: The amount of TokenB the user wants to receive. If unspecified, return an empty string ''.\n\n"
            "IMPORTANT:\n"
            "- If the user wants to 'sell' or 'swap' a token, TokenA is the token being sold/swapped, and AmountA is the amount.\n"
            "- If the user wants to 'buy' a token, TokenB is the token being bought, and AmountB is the amount.\n"
            "- Return the extracted values in this exact format: TokenA: <TokenA>, TokenB: <TokenB>, AmountA: <AmountA>, AmountB: <AmountB>\n"
            "- If any value is missing or not provided by the user, replace it with an empty string ''.\n\n"
            f"User's request: {request}\n\n"
            "Return only the extracted values without any extra text."
        )

        response = await self.ask_openrouter(prompt, model)

        # Try to parse the response with labels
        pattern = re.compile(
            r"TokenA:\s*(?:\"([^\"]*)\"|'([^']*)'|([\w-]*)|())\s*,\s*"
            r"TokenB:\s*(?:\"([^\"]*)\"|'([^']*)'|([\w-]*)|())\s*,\s*"
            r"(?:AmountA:\s*(?:\"?([0-9.,]*)\"?)\s*,?\s*)?"
            r"(?:AmountB:\s*(?:\"?([0-9.,]*)\"?)\s*,?\s*)?"
            r"|(?:AmountB:\s*(?:\"?([0-9.,]*)\"?)\s*,?\s*)?"
            r"(?:AmountA:\s*(?:\"?([0-9.,]*)\"?)\s*,?\s*)?"
        )
        match = pattern.search(response)

        if match:
            tokenA = (match.group(1) or match.group(2) or match.group(3) or '').upper()
            tokenB = (match.group(5) or match.group(6) or match.group(7) or '').upper()
            amountA = (match.group(9) or match.group(12) or '').rstrip(',')
            amountB = (match.group(10) or match.group(11) or '').rstrip(',')

            return { "inputToken": tokenA, "inputAmount": amountA, "outputToken": tokenB, "outputAmount": amountB }

        return {
            "inputToken": "",
            "inputAmount": "",
            "outputToken": "",
            "outputAmount": "",
        }

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
