const WebSocket = require('ws');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

let clients = {};
let characterStates = {};

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Generate a unique client ID
    const clientId = Math.random().toString(36).substr(2, 10);
    clients[clientId] = ws;

    // Initialize character state for this client
    characterStates[clientId] = {
        position: { x: 10, y: 20 },
        frame: 0,
        direction: 0
    };

    // Send initial character state to the client
    ws.send(JSON.stringify({
        clientId,
        position: characterStates[clientId].position
    }));

    // Send all existing characters to the new client
    for (const existingClientId in characterStates) {
        if (existingClientId !== clientId) {
            ws.send(JSON.stringify({
                clientId: existingClientId,
                characterState: characterStates[existingClientId]
            }));
        }
    }

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Handle character state updates
            if (data.clientId && data.characterState) {
                const { clientId, characterState } = data;

                if (clients[clientId] === ws) {
                    // Update character state for this client
                    characterStates[clientId] = characterState;

                    // Broadcast new character state to all clients
                    wss.clients.forEach((client) => {
                        if (client !== ws) { // Don't send back to the sender
                            client.send(JSON.stringify({
                                clientId,
                                characterState
                            }));
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected:', clientId);
        delete clients[clientId];
        delete characterStates[clientId];

        // Notify other clients that this player has left
        wss.clients.forEach((client) => {
            client.send(JSON.stringify({
                playerDisconnected: clientId
            }));
        });
    });
});

server.listen(8080, () => {
    console.log('Server listening on port 8080');
});
