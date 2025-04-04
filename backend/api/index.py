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

from org_config import org_config
from secretvaults import SecretVaultWrapper, OperationType
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

default_nil_ai_model = "meta-llama/Llama-3.1-8B-Instruct"

class CryptoTradingAssistant:
    def __init__(self):
        self.NILAI_API_KEY = os.getenv("NILAI_API_KEY")
        self.NILAI_API_URL = os.getenv("NILAI_API_URL")
        self.NIL_SV_SCHEMA_ID = os.getenv("NIL_SECRET_VAULT_SCHEMA_ID")
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.DB_PATH = os.path.join(self.BASE_DIR, "tokens.db")
        self.collection = SecretVaultWrapper(
            org_config["nodes"],
            org_config["org_credentials"],
            self.NIL_SV_SCHEMA_ID,
            operation=OperationType.STORE,
        )

    async def process_question(self, question, user_id, model):
        await self.collection.init()
        history = ""
        context = ""
        prompt = (
            f"History: {history}\n\n"
            f"Context: {context}\n\n"
            f"Question: {question}\n\n"
            "You are a crypto trading assistant EthereumFighter. Your task is to extract the following information from the user's request:\n"
        )

        response = ""
        if (model == default_nil_ai_model):
            response = await self.ask_nilai(prompt, model)
        else:
            response = await self.ask_nilai(prompt, model)

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
        await self.collection.write_to_nodes(data)
        return response

    async def ask_nilai(self, prompt, model):
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        headers = {"Authorization": f"Bearer {self.NILAI_API_KEY}"}
        print(f"Prompt calling nilai: {prompt}")
        data = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a crypto trading assistant. Use the provided history to maintain conversation context."},
                {"role": "user", "content": prompt}
            ]
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(self.NILAI_API_URL, json=data, headers=headers, ssl=ssl_context) as response:
                if response.status == 200:
                    reply = (await response.json()).get("choices", [{}])[0].get("message", {}).get("content", "No response received.")
                    logging.info(f"Received response: {reply}")
                    return reply
                else:
                    error_message = f"NILAI API error {response.status}: {await response.text()}"
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
                response = await self.process_question(question, user_id, default_nil_ai_model)
            else:
                response = await self.process_question(question, user_id, default_nil_ai_model)

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
    model = request.args.get("model", default_nil_ai_model)
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
    model = data.get("model", default_nil_ai_model)

    if not question:
        return jsonify({"error": "Question is empty"}), 400

    # Call your async method:
    response = asyncio.run(crypto_assistant.ask_ai(question, model))

    return jsonify({"response": response})

if __name__ == "__main__":
    app.run()
