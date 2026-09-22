const WebSocket = require('ws');

const apiKey = 'f0fa488f2f5b45968826c6394c09e3d3';
const wsUrl = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`;
const ws = new WebSocket(wsUrl);

console.log("Connecting to TwelveData...");

ws.on('open', () => {
  console.log("Connected. Subscribing to EUR/USD...");
  ws.send(JSON.stringify({
    action: 'subscribe',
    params: {
      symbols: 'EUR/USD'
    }
  }));
});

ws.on('message', (data) => {
  console.log("Message received:", data.toString());
  const msg = JSON.parse(data.toString());
  if (msg.event === 'price') {
      console.log("Success! Price data is flowing.");
      process.exit(0);
  }
});

ws.on('close', () => {
  console.log("WebSocket closed");
  process.exit(1);
});

ws.on('error', (err) => {
  console.error("WebSocket error:", err);
  process.exit(1);
});

setTimeout(() => {
    console.log("Timeout reached");
    process.exit(1);
}, 10000);
