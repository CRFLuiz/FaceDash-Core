const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#0F0C29',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            debug: false // Set to true to see physics bodies
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let socket;
try {
    socket = io();
} catch (e) {
    console.error("Socket IO failed to initialize:", e);
}

const game = new Phaser.Game(config);

let players = {}; // id -> { name, textureKey, marblesRemaining, nextSpawnTime, interval }
let isGameActive = false;
let playerCount = 0;

// UI Elements
const startBtn = document.getElementById('start-btn');
const playerCountDisplay = document.getElementById('player-count');
const arenaUI = document.getElementById('arena-ui');

// UI Logic
startBtn.addEventListener('click', () => {
    if (Object.keys(players).length === 0) {
        alert("Wait for players to join!");
        return;
    }
    isGameActive = true;
    startBtn.style.display = 'none';
    playerCountDisplay.style.display = 'none';
    
    // Optional: Reset spawn timers so everyone starts EXACTLY now
    const now = game.getTime(); // We need to access scene time, but loop handles it
    Object.values(players).forEach(p => {
        p.nextSpawnTime = 0; // Will spawn immediately on next update
    });
});

function updatePlayerCount() {
    playerCount = Object.keys(players).length;
    playerCountDisplay.innerText = `Players Ready: ${playerCount}`;
}

function preload() {
    // Load assets if any
    // Data URIs in preload can cause issues in some environments.
    // We will generate the texture programmatically in create().
}

function create() {
    console.log("Phaser Create Started");
    const scene = this;

    // Generate 'particle' texture
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
    
    // Boundaries - Left, Right, Bottom (no top)
    scene.matter.world.setBounds(0, -200, game.config.width, game.config.height + 200, 32, true, true, true, true);

    // Create Pachinko Pegs
    createPegs(scene);

    // Socket Events
    if (socket) {
        socket.emit('identify', 'arena');

        socket.on('current-players', (currentPlayers) => {
            currentPlayers.forEach(p => addPlayer(scene, p));
        });

        socket.on('new-player', (player) => {
            addPlayer(scene, player);
        });

        socket.on('player-left', (id) => {
            if (players[id]) {
                delete players[id];
                updatePlayerCount();
            }
        });
    }
    
    // Add collision event for effects
    scene.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            // Check if marble hit peg
            if ((bodyA.label === 'marble' && bodyB.label === 'peg') || 
                (bodyB.label === 'marble' && bodyA.label === 'peg')) {
                
                const pegBody = bodyA.label === 'peg' ? bodyA : bodyB;
                const pegGameObject = pegBody.gameObject;
                
                if (pegGameObject) {
                    // Flash effect
                    pegGameObject.setFillStyle(0xFF0080); // Action Pink
                    scene.time.delayedCall(100, () => {
                        pegGameObject.setFillStyle(0x9D50BB); // Back to Electric Purple
                    });
                }
            }
        });
    });
}

function createPegs(scene) {
    const rows = 12;
    const cols = 15;
    const spacingX = game.config.width / cols;
    const spacingY = (game.config.height * 0.6) / rows;
    const startY = 150;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let x = j * spacingX + spacingX / 2;
            if (i % 2 === 1) x += spacingX / 2;
            
            // Randomize slightly
            x += Phaser.Math.Between(-5, 5);
            
            const y = startY + i * spacingY;
            
            // Create peg
            const peg = scene.add.circle(x, y, 6, 0x9D50BB); // Electric Purple
            scene.matter.add.gameObject(peg, {
                isStatic: true,
                label: 'peg',
                friction: 0.5,
                restitution: 0.8
            });
        }
    }
}

function addPlayer(scene, player) {
    if (players[player.id]) return;

    const textureKey = `player-${player.id}`;
    
    if (!scene.textures.exists(textureKey)) {
        scene.textures.addBase64(textureKey, player.photo);
    }

    players[player.id] = {
        ...player,
        textureKey: textureKey,
        marblesRemaining: 50,
        nextSpawnTime: 0,
        interval: 1000 // 1s
    };
    
    updatePlayerCount();
    console.log("Player added to Arena:", player.name);
}

function update(time, delta) {
    const scene = this;

    // Only spawn if game is active
    if (!isGameActive) return;

    // Spawn Logic
    Object.values(players).forEach(player => {
        if (player.marblesRemaining > 0 && time > player.nextSpawnTime) {
            // Check if texture is ready
            if (scene.textures.exists(player.textureKey)) {
                spawnMarble(scene, player);
                player.marblesRemaining--;
                
                // Update interval logic (reduce 0.1s every 10 marbles)
                const marblesUsed = 50 - player.marblesRemaining;
                if (marblesUsed % 10 === 0) {
                    player.interval = Math.max(600, player.interval - 100);
                }
                
                player.nextSpawnTime = time + player.interval;
            }
        }
    });
}

function spawnMarble(scene, player) {
    const x = Phaser.Math.Between(50, game.config.width - 50);
    const y = -50; // Start above screen

    const marble = scene.matter.add.image(x, y, player.textureKey, null, {
        shape: 'circle',
        friction: 0.005,
        restitution: 0.9,
        label: 'marble'
    });
    
    marble.setDisplaySize(50, 50);
    marble.setCircle(25);
}

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
