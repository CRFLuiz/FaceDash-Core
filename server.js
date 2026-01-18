const express = require('express');
const http = require('http');
const https = require('https'); // Add HTTPS
const fs = require('fs'); // Add FS
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// SSL Options
const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// Create HTTPS Server
const server = https.createServer(sslOptions, app);
// const server = http.createServer(app); // Replaced with HTTPS

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Routes
app.get('/arena', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'screen1.html'));
});

app.get('/studio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'screen2.html'));
});

app.get('/', (req, res) => {
    res.redirect('/studio');
});

// Game State
let players = []; 

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Identify client type
    socket.on('identify', (type) => {
        socket.join(type); // 'arena' or 'studio'
        console.log(`Socket ${socket.id} identified as ${type}`);
        
        if (type === 'arena') {
            socket.emit('current-players', players);
        }
    });

    // Player Register from Studio
    socket.on('register-player', (data) => {
        const player = {
            id: socket.id,
            name: data.name || `Player ${socket.id.substr(0,4)}`,
            photo: data.photo,
            marbles: 50
        };
        players.push(player);
        console.log('Player registered:', player.name);
        
        io.to('arena').emit('new-player', player);
        socket.emit('registration-success', { id: player.id });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const playerIndex = players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            const removedPlayer = players[playerIndex];
            players.splice(playerIndex, 1);
            io.to('arena').emit('player-left', removedPlayer.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
