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

# API Price Source Configuration
# Set to True to use 1inch API, False to use CoinGecko API
USE_1INCH_API = True

# Token address mapping for 1inch API (Ethereum mainnet addresses)
TOKEN_ADDRESS_MAPPING = {
    "ETH": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",  # Native ETH
    "WETH": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "USDC": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    "USD": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",  # Using USDC as USD equivalent
    "USDT": "0xdac17f958d2ee523a2206206994597c13d831ec7",
    "DAI": "0x6b175474e89094c44da98b954eedeac495271d0f",
    "WBTC": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    "BTC": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",  # Using WBTC for BTC
    "LINK": "0x514910771af9ca656af840dff83e8264ecf986ca",
    "UNI": "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
    "AAVE": "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
    "SNX": "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
    "MKR": "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2",
    "COMP": "0xc00e94cb662c3520282e6f5717214004a7f26888",
    "YFI": "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e",
    "SUSHI": "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
    "WISE": "0x66a0f676479cee1d7373f3dc2e2952778bff5bd6",
    "1INCH": "0x111111111117dc0aa78b770fa6a738034120c302",
    "CELO": "0x471ece3750da237f93b8e339c536989b8978a438"  # CELO token address
}

# Token mapping for CoinGecko API IDs (kept for reference only)
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
    "WISE": "wise-token",
    "CELO": "celo"  # CELO token ID for CoinGecko
}

async def get_token_price_from_coingecko(token_symbol):
    """Get token price in USD from CoinGecko API"""
    token_id = TOKEN_ID_MAPPING.get(token_symbol.upper())
    if not token_id:
        logging.warning(f"No CoinGecko mapping found for token symbol: {token_symbol}")
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
                logging.warning(f"CoinGecko: Failed to get price for {token_symbol}: {await response.text()}")
                return None
    except Exception as e:
        logging.error(f"CoinGecko: Error fetching price for {token_symbol}: {str(e)}")
        return None

async def get_token_price_from_1inch(token_symbol):
    """Get token price in USD from 1inch API"""
    token_address = TOKEN_ADDRESS_MAPPING.get(token_symbol.upper())
    if not token_address:
        logging.warning(f"No 1inch address mapping found for token symbol: {token_symbol}")
        return None

    # 1inch API for Ethereum mainnet (chain ID 1)
    url = "https://api.1inch.dev/price/v1.1/1"

    # Using the get_prices_for_addresses approach for a single token
    specific_url = f"{url}/{token_address}"

    try:
        # Create SSL context with certifi certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())

        # Create connector with the SSL context
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        # Use the connector in the ClientSession
        async with aiohttp.ClientSession(connector=connector) as session:
            # Get your API key from environment variables for better security
            api_key = os.getenv("ONEINCH_API_KEY", "jnSBv4cJLnFd4BtiSrxosxaFdasKTMV8")

            async with session.get(specific_url, headers={'Authorization': f'Bearer {api_key}'}) as response:
                if response.status == 200:
                    data = await response.json()
                    # 1inch API returns price directly for the token address
                    if token_address in data:
                        return float(data[token_address])
                    else:
                        logging.warning(f"1inch: Token address {token_address} not found in response: {data}")
                        return None
                else:
                    logging.warning(f"1inch: Failed to get price for {token_symbol}: {await response.text()}")

                    # Fallback to the POST method if GET fails
                    payload = {
                        "tokens": [token_address]
                    }

                    async with session.post(url, headers={'Authorization': f'Bearer {api_key}'}, json=payload) as post_response:
                        if post_response.status == 200:
                            data = await post_response.json()
                            if token_address in data:
                                return float(data[token_address])
                        logging.warning(f"1inch: Fallback request failed for {token_symbol}: {await post_response.text()}")
                        return None
    except Exception as e:
        logging.error(f"1inch: Error fetching price for {token_symbol}: {str(e)}")
        return None

async def get_token_price(token_symbol):
    """Get token price in USD from the configured API source (1inch or CoinGecko)"""
    # Special handling for CELO to use CoinGecko API directly
    if token_symbol.upper() == "CELO":
        logging.info(f"Using CoinGecko API for CELO token")
        price = await get_token_price_from_coingecko(token_symbol)
        if price is not None:
            return price
        
        # If no price is found for CELO, return mocked value
        logging.warning(f"No price found for CELO from CoinGecko. Using mocked price: 0.3026")
        return 0.3026
    
    # Normal flow for other tokens
    if USE_1INCH_API:
        price = await get_token_price_from_1inch(token_symbol)
        if price is not None:
            return price
        # Fallback to CoinGecko if 1inch fails and we have a mapping
        if token_symbol.upper() in TOKEN_ID_MAPPING:
            logging.info(f"Falling back to CoinGecko for {token_symbol} after 1inch failure")
            return await get_token_price_from_coingecko(token_symbol)
        return None
    else:
        price = await get_token_price_from_coingecko(token_symbol)
        if price is not None:
            return price
        # Fallback to 1inch if CoinGecko fails and we have a mapping
        if token_symbol.upper() in TOKEN_ADDRESS_MAPPING:
            logging.info(f"Falling back to 1inch for {token_symbol} after CoinGecko failure")
            return await get_token_price_from_1inch(token_symbol)
        return None

async def get_multiple_token_prices_from_coingecko(token_symbols):
    """Get prices for multiple tokens at once using CoinGecko API"""
    # Map symbols to CoinGecko IDs
    token_ids = []
    symbol_to_id_map = {}

    for symbol in token_symbols:
        token_id = TOKEN_ID_MAPPING.get(symbol.upper())
        if token_id:
            token_ids.append(token_id)
            symbol_to_id_map[token_id] = symbol.upper()
        else:
            logging.warning(f"CoinGecko: No mapping found for token symbol: {symbol}")

    if not token_ids:
        return {}

    # CoinGecko API allows fetching multiple tokens in one request
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={','.join(token_ids)}&vs_currencies=usd"

    try:
        # Create SSL context with certifi certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    # Map the CoinGecko IDs back to symbols
                    return {symbol_to_id_map[token_id]: data[token_id]['usd'] for token_id in data if token_id in symbol_to_id_map and 'usd' in data[token_id]}
                else:
                    logging.warning(f"CoinGecko: Failed to get prices: {await response.text()}")
                    return {}
    except Exception as e:
        logging.error(f"CoinGecko: Error fetching prices: {str(e)}")
        return {}

async def get_multiple_token_prices_from_1inch(token_symbols):
    """Get prices for multiple tokens at once using 1inch API"""
    # Convert token symbols to addresses
    token_addresses = []
    symbol_to_address_map = {}

    for symbol in token_symbols:
        address = TOKEN_ADDRESS_MAPPING.get(symbol.upper())
        if address:
            token_addresses.append(address)
            symbol_to_address_map[address] = symbol.upper()
        else:
            logging.warning(f"1inch: No address mapping found for token symbol: {symbol}")

    if not token_addresses:
        return {}

    # 1inch API for Ethereum mainnet (chain ID 1)
    url = "https://api.1inch.dev/price/v1.1/1"

    try:
        # Create SSL context with certifi certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        async with aiohttp.ClientSession(connector=connector) as session:
            api_key = os.getenv("ONEINCH_API_KEY", "jnSBv4cJLnFd4BtiSrxosxaFdasKTMV8")

            if len(token_addresses) == 1:
                # For a single token, use the GET endpoint
                specific_url = f"{url}/{token_addresses[0]}"
                async with session.get(specific_url, headers={'Authorization': f'Bearer {api_key}'}) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {symbol_to_address_map[addr]: float(price) for addr, price in data.items() if addr in symbol_to_address_map}
            else:
                # For multiple tokens, use the POST endpoint
                payload = {
                    "tokens": token_addresses
                }

                async with session.post(url, headers={'Authorization': f'Bearer {api_key}'}, json=payload) as response:
                    if response.status == 200:
                        data = await response.json()
                        # Convert addresses back to symbols in the result
                        return {symbol_to_address_map[addr]: float(price) for addr, price in data.items() if addr in symbol_to_address_map}
                    else:
                        logging.warning(f"1inch: Failed to get prices: {await response.text()}")

            # If we get here, both methods failed or returned no data
            return {}
    except Exception as e:
        logging.error(f"1inch: Error fetching prices: {str(e)}")
        return {}

async def get_multiple_token_prices(token_symbols):
    """Get prices for multiple tokens using the configured API source (1inch or CoinGecko)"""
    # Split CELO and other tokens
    celo_tokens = [symbol for symbol in token_symbols if symbol.upper() == "CELO"]
    other_tokens = [symbol for symbol in token_symbols if symbol.upper() != "CELO"]
    
    # Initialize prices dictionary
    prices = {}
    
    # Handle CELO tokens separately using CoinGecko
    if celo_tokens:
        logging.info(f"Using CoinGecko API for CELO token")
        celo_prices = await get_multiple_token_prices_from_coingecko(celo_tokens)
        
        # Check if CELO price was successfully retrieved
        if "CELO" not in celo_prices:
            # If no price is found for CELO, add mocked value
            logging.warning(f"No price found for CELO from CoinGecko in bulk request. Using mocked price: 0.3026")
            celo_prices["CELO"] = 0.3026
            
        prices.update(celo_prices)
    
    # Process other tokens with the normal flow
    if other_tokens:
        if USE_1INCH_API:
            inch_prices = await get_multiple_token_prices_from_1inch(other_tokens)
            prices.update(inch_prices)

            # If some tokens don't have prices from 1inch, try to get them from CoinGecko
            missing_tokens = [symbol for symbol in other_tokens if symbol.upper() not in prices]
            if missing_tokens:
                # Only try CoinGecko for tokens that have a CoinGecko mapping
                coingecko_tokens = [t for t in missing_tokens if t.upper() in TOKEN_ID_MAPPING]
                if coingecko_tokens:
                    logging.info(f"Falling back to CoinGecko for {len(coingecko_tokens)} tokens after 1inch failure")
                    cg_prices = await get_multiple_token_prices_from_coingecko(coingecko_tokens)
                    # Merge the prices
                    prices.update(cg_prices)
        else:
            cg_prices = await get_multiple_token_prices_from_coingecko(other_tokens)
            prices.update(cg_prices)

            # If some tokens don't have prices from CoinGecko, try to get them from 1inch
            missing_tokens = [symbol for symbol in other_tokens if symbol.upper() not in prices]
            if missing_tokens:
                # Only try 1inch for tokens that have a 1inch mapping
                inch_tokens = [t for t in missing_tokens if t.upper() in TOKEN_ADDRESS_MAPPING]
                if inch_tokens:
                    logging.info(f"Falling back to 1inch for {len(inch_tokens)} tokens after CoinGecko failure")
                    inch_prices = await get_multiple_token_prices_from_1inch(inch_tokens)
                    # Merge the prices
                    prices.update(inch_prices)

    return prices

async def calculate_token_rate(from_token, to_token, from_amount=1.0):
    """Calculate the exchange rate between two tokens"""
    # Special handling for CELO-USD rate if involved
    if from_token.upper() == "CELO" or to_token.upper() == "CELO":
        # Use our mocked CELO price directly for consistent results
        celo_price = 0.3026  # Our mocked CELO price in USD
        
        # If calculating CELO to USD
        if from_token.upper() == "CELO" and to_token.upper() in ["USD", "USDC", "USDT"]:
            logging.info(f"Using fixed rate for CELO to USD conversion: {celo_price}")
            # For CELO to USD, the amount of USD is simply CELO amount * CELO price in USD
            return celo_price * float(from_amount)
            
        # If calculating USD to CELO
        elif to_token.upper() == "CELO" and from_token.upper() in ["USD", "USDC", "USDT"]:
            logging.info(f"Using fixed rate for USD to CELO conversion: {1/celo_price}")
            # For USD to CELO, the amount of CELO is simply USD amount / CELO price in USD
            return float(from_amount) / celo_price
    
    # Normal flow for other tokens
    # Get prices for both tokens at once for efficiency
    prices = await get_multiple_token_prices([from_token, to_token])

    from_price = prices.get(from_token.upper())
    to_price = prices.get(to_token.upper())

    # Fallback to individual queries if bulk request failed
    if from_price is None:
        from_price = await get_token_price(from_token)
    if to_price is None:
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

@app.route("/token_price/<token_symbol>", methods=["GET"])
def get_token_price_route(token_symbol):
    """Route to get the current price of a token using the configured price API"""
    api_source = "1inch" if USE_1INCH_API else "CoinGecko"
    price = asyncio.run(get_token_price(token_symbol))
    if price is not None:
        return jsonify({
            "token": token_symbol.upper(),
            "price_usd": price,
            "source": api_source
        })
    else:
        return jsonify({"error": f"Unable to fetch price for {token_symbol}"}), 404

@app.route("/token_prices", methods=["GET", "POST"])
def get_token_prices_route():
    """Route to get the current prices of multiple tokens using the configured price API"""
    api_source = "1inch" if USE_1INCH_API else "CoinGecko"

    if request.method == "POST":
        data = request.get_json() or {}
        token_symbols = data.get("tokens", [])
    else:
        token_symbols = request.args.get("tokens", "").split(",")
        token_symbols = [symbol.strip() for symbol in token_symbols if symbol.strip()]

    if not token_symbols:
        return jsonify({"error": "No tokens specified"}), 400

    prices = asyncio.run(get_multiple_token_prices(token_symbols))
    if prices:
        return jsonify({
            "prices": prices,
            "source": api_source
        })
    else:
        return jsonify({"error": "Unable to fetch prices for the specified tokens"}), 404

@app.route("/api_source", methods=["GET", "POST"])
def api_source_route():
    """Route to get or set the current API source (1inch or CoinGecko)"""
    global USE_1INCH_API

    if request.method == "POST":
        data = request.get_json() or {}
        new_source = data.get("use_1inch", None)

        if new_source is not None:
            USE_1INCH_API = bool(new_source)
            logging.info(f"API source changed to {'1inch' if USE_1INCH_API else 'CoinGecko'}")

    return jsonify({
        "use_1inch": USE_1INCH_API,
        "current_source": "1inch" if USE_1INCH_API else "CoinGecko"
    })

@app.route("/get_exchange_quote", methods=["GET"])
def get_exchange_quote():
    """Get a real exchange quote directly from 1inch API"""
    from_token = request.args.get("from_token", "1INCH")
    to_token = request.args.get("to_token", "ETH")
    from_amount = float(request.args.get("from_amount", "10"))

    # Get real token addresses for 1inch API
    from_token_address = TOKEN_ADDRESS_MAPPING.get(from_token.upper())
    to_token_address = TOKEN_ADDRESS_MAPPING.get(to_token.upper())

    if not from_token_address or not to_token_address:
        return jsonify({"error": f"Token address not found for {from_token} or {to_token}"}), 400

    # Convert amount to wei (1inch API expects amount in wei)
    # For 1INCH token with 18 decimals
    decimals = 18  # Most ERC20 tokens use 18 decimals
    amount_in_wei = int(from_amount * (10 ** decimals))

    # Directly query 1inch swap API for a real quote
    try:
        # Use 1inch Swap API to get a quote
        # We'll use Ethereum mainnet (chain ID 1)
        result = asyncio.run(get_1inch_quote(
            from_token_address,
            to_token_address,
            amount_in_wei
        ))

        if result and "toAmount" in result:
            # Convert the result amount from wei to ETH (decimal)
            to_amount = float(result["toAmount"]) / (10 ** decimals)

            # Calculate exchange rate per token
            exchange_rate = to_amount / from_amount

            # Get token prices for USD values
            from_price_usd = asyncio.run(get_token_price(from_token))
            to_price_usd = asyncio.run(get_token_price(to_token))

            # Calculate USD values
            from_value_usd = from_price_usd * from_amount if from_price_usd else None
            to_value_usd = to_price_usd * to_amount if to_price_usd else None

            # Get estimated gas fee
            estimated_gas = int(result.get("estimatedGas", 200000))
            gas_price_wei = 30000000000  # 30 gwei as default

            # Calculate network fee in ETH
            network_fee_eth = (estimated_gas * gas_price_wei) / 1e18
            # Convert to USD
            network_fee_usd = network_fee_eth * to_price_usd if to_price_usd else 0.16

            logging.info(f"1inch quote: {from_amount} {from_token} = {to_amount} {to_token}")
            return jsonify({
                "from": {
                    "token": from_token.upper(),
                    "amount": from_amount,
                    "value_usd": from_value_usd,
                    "price_usd": from_price_usd
                },
                "to": {
                    "token": to_token.upper(),
                    "amount": to_amount,
                    "value_usd": to_value_usd,
                    "price_usd": to_price_usd
                },
                "exchange_rate": exchange_rate,
                "network_fee_usd": network_fee_usd,
                "timestamp": datetime.now().isoformat(),
                # Include raw 1inch response for reference
                "raw_response": result
            })
        else:
            logging.error(f"Invalid response from 1inch API: {result}")
            return jsonify({"error": "Failed to get quote from 1inch API"}), 500
    except Exception as e:
        logging.error(f"Error getting 1inch quote: {str(e)}")
        return jsonify({"error": str(e)}), 500

async def get_1inch_quote(from_token_address, to_token_address, amount_in_wei):
    """Get an actual swap quote from 1inch API"""
    # 1inch Swap API endpoint for quotes
    url = "https://api.1inch.dev/swap/v5.2/1/quote"

    # Get your API key from environment variables
    api_key = os.getenv("ONEINCH_API_KEY", "")

    params = {
        "src": from_token_address,
        "dst": to_token_address,
        "amount": str(amount_in_wei),
        "includeTokensInfo": "true",
        "includeProtocols": "true"
    }

    try:
        # Create SSL context with certifi certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        connector = aiohttp.TCPConnector(ssl=ssl_context)

        async with aiohttp.ClientSession(connector=connector) as session:
            async with session.get(url, headers={
                'Authorization': f'Bearer {api_key}',
                'Accept': 'application/json'
            }, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    error_text = await response.text()
                    logging.error(f"1inch API error: {response.status} - {error_text}")
                    return None
    except Exception as e:
        logging.error(f"Error in 1inch API request: {str(e)}")
        return None

if __name__ == "__main__":
    app.run()
