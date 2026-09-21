import WebSocket from 'ws';

const socket = new WebSocket('wss://ws.finnhub.io?token=daoh0chr01qh3po2nnsg');

socket.addEventListener('open', function (event) {
    socket.send(JSON.stringify({'type':'subscribe', 'symbol': 'OANDA:EUR_USD'}))
    socket.send(JSON.stringify({'type':'subscribe', 'symbol': 'BINANCE:BTCUSDT'}))
});

socket.addEventListener('message', function (event) {
    console.log('Message from server ', event.data);
    setTimeout(() => process.exit(0), 3000);
});
