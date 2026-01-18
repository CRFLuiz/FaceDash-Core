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

let players = {}; // id -> { name, textureKey, marblesRemaining, nextSpawnTime, interval, score }
let isGameActive = false;
let playerCount = 0;

// UI Elements
const startBtn = document.getElementById('start-btn');
const playerCountDisplay = document.getElementById('player-count');
const leaderboardList = document.getElementById('leaderboard-list');

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
    const now = game.loop.now; // Use game.loop.now instead of game.getTime()
    Object.values(players).forEach(p => {
        p.nextSpawnTime = 0; 
        p.score = 0; // Reset scores
    });
    updateLeaderboard();
});

function updatePlayerCount() {
    playerCount = Object.keys(players).length;
    playerCountDisplay.innerText = `Players Ready: ${playerCount}`;
}

function updateLeaderboard() {
    // Sort players by score DESC
    const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
    
    leaderboardList.innerHTML = '';
    sortedPlayers.forEach(p => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        div.innerHTML = `<span>${p.name}</span> <span class="score">${p.score}</span>`;
        leaderboardList.appendChild(div);
    });
}

function preload() {
    // Assets generated programmatically
}

function create() {
    console.log("Phaser Create Started");
    const scene = this;

    // Generate 'particle' texture
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('particle', 8, 8);
    
    // Boundaries
    scene.matter.world.setBounds(0, -200, game.config.width, game.config.height + 200, 32, true, true, true, true);

    // 1. Spawner Funnel (Top)
    createFunnel(scene);

    // 2. Static Obstacles (Pegs)
    createPegs(scene);

    // 3. Dynamic Obstacles (Spinners)
    scene.spinners = []; // Initialize array for spinners
    createSpinners(scene);

    // 4. Goalkeeper
    createGoalkeeper(scene);

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
                updateLeaderboard();
            }
        });
    }
    
    // Collision Events
    scene.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach(pair => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            // Marble hits Peg (Flash Effect)
            if ((bodyA.label === 'marble' && bodyB.label === 'peg') || 
                (bodyB.label === 'marble' && bodyA.label === 'peg')) {
                const pegBody = bodyA.label === 'peg' ? bodyA : bodyB;
                const pegGameObject = pegBody.gameObject;
                if (pegGameObject) {
                    pegGameObject.setFillStyle(0xFF0080); // Action Pink
                    scene.time.delayedCall(100, () => {
                        pegGameObject.setFillStyle(0x9D50BB); // Back to Electric Purple
                    });
                }
            }

            // Marble hits Goal Sensor
            if ((bodyA.label === 'marble' && bodyB.label === 'goalSensor') || 
                (bodyB.label === 'marble' && bodyA.label === 'goalSensor')) {
                
                const marbleBody = bodyA.label === 'marble' ? bodyA : bodyB;
                const marbleObj = marbleBody.gameObject;

                if (marbleObj && marbleObj.getData('playerId')) {
                    const playerId = marbleObj.getData('playerId');
                    if (players[playerId]) {
                        players[playerId].score++;
                        updateLeaderboard();
                        
                        // Visual Feedback for Goal?
                        // Destroy marble
                        marbleObj.destroy();
                    }
                }
            }
        });
    });
}

function createFunnel(scene) {
    const width = game.config.width;
    const startY = -50;
    
    // Left Wall
    scene.matter.add.rectangle(width * 0.2, startY + 100, 400, 20, {
        isStatic: true,
        angle: 0.5,
        render: { fillStyle: '#00F2FE' }
    });

    // Right Wall
    scene.matter.add.rectangle(width * 0.8, startY + 100, 400, 20, {
        isStatic: true,
        angle: -0.5,
        render: { fillStyle: '#00F2FE' }
    });
}

function createPegs(scene) {
    const rows = 6; // Reduced rows to make space for spinners
    const cols = 9;
    const spacingX = game.config.width / cols;
    const spacingY = (game.config.height * 0.4) / rows;
    const startY = 200;

    // Spinner positions for exclusion zone
    const spinnerY = game.config.height * 0.6;
    const spinnerX1 = game.config.width * 0.3;
    const spinnerX2 = game.config.width * 0.7;
    const safeRadius = 130; // 80 (half length) + buffer

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let x = j * spacingX + spacingX / 2;
            if (i % 2 === 1) x += spacingX / 2;
            x += Phaser.Math.Between(-5, 5);
            const y = startY + i * spacingY;
            
            // Check exclusion zone
            const dist1 = Phaser.Math.Distance.Between(x, y, spinnerX1, spinnerY);
            const dist2 = Phaser.Math.Distance.Between(x, y, spinnerX2, spinnerY);

            if (dist1 < safeRadius || dist2 < safeRadius) {
                continue; // Skip peg creation near spinners
            }

            // Create peg
            const peg = scene.add.circle(x, y, 10, 0x9D50BB); // Increased visual radius
            scene.matter.add.gameObject(peg, {
                isStatic: true,
                shape: 'circle', // Force circular body
                radius: 10,      // Match visual radius
                label: 'peg',
                friction: 0,      // No friction to avoid sticking
                frictionStatic: 0,
                restitution: 1.5  // Super high bounciness
            });
        }
    }
}

function createSpinners(scene) {
    const startY = game.config.height * 0.6;
    const positions = [0.3, 0.7]; // Two spinners

    positions.forEach((pos, index) => {
        const x = game.config.width * pos;
        const rect = scene.add.rectangle(x, startY, 200, 20, 0xF2C94C); // Longer blades
        
        const body = scene.matter.add.gameObject(rect, {
            shape: 'rectangle',
            isStatic: false,
            ignoreGravity: true,
            friction: 0.1,      // Small friction to help push marbles
            frictionAir: 0,
            restitution: 0.8,
            density: 0.1
        });

        // Pin to background
        scene.matter.add.worldConstraint(body, 0, 1, {
            pointA: { x: x, y: startY },
            pointB: { x: 0, y: 0 },
            stiffness: 1
        });

        // Set rotation speed (Left: CCW, Right: CW to push outwards)
        body.rotationSpeed = (index === 0) ? -0.05 : 0.05;
        
        scene.spinners.push(body);
    });
}

let goalkeeper;
let goalkeeperDirection = 1;

function createGoalkeeper(scene) {
    const y = game.config.height - 100;
    const width = 100;
    const height = 30;

    // Goalkeeper Body (Kinematic)
    const rect = scene.add.rectangle(game.config.width / 2, y, width, height, 0xFF0080);
    goalkeeper = scene.matter.add.gameObject(rect, {
        isStatic: false,
        isSensor: false,
        friction: 0,
        frictionAir: 0,
        inertia: Infinity, // Prevent rotation
        ignoreGravity: true
    });
    goalkeeper.setFixedRotation();
    
    // Goal Sensor (Behind Goalkeeper)
    const sensorRect = scene.add.rectangle(game.config.width / 2, game.config.height - 20, game.config.width, 50, 0x00F2FE, 0.3);
    scene.matter.add.gameObject(sensorRect, {
        isStatic: true,
        isSensor: true,
        label: 'goalSensor'
    });
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
        interval: 1000,
        score: 0
    };
    
    updatePlayerCount();
    updateLeaderboard();
    console.log("Player added to Arena:", player.name);
}

function update(time, delta) {
    const scene = this;

    // Spinners Logic
    if (scene.spinners) {
        scene.spinners.forEach(spinner => {
            spinner.setAngularVelocity(spinner.rotationSpeed);
        });
    }

    // Goalkeeper Movement
    if (goalkeeper) {
        const speed = 5;
        const limitX = game.config.width * 0.4; // Range from center
        
        goalkeeper.x += speed * goalkeeperDirection;
        
        // Bounce logic (simple X check)
        if (goalkeeper.x > game.config.width - 50 || goalkeeper.x < 50) {
            goalkeeperDirection *= -1;
        }
        
        // Ensure body follows visual (Phaser Matter syncs automatically usually, but kinematic needs explicit velocity or position set)
        // Since we set position directly above, we are essentially teleporting. Better to set velocity.
        goalkeeper.setVelocityX(speed * goalkeeperDirection);
        goalkeeper.setVelocityY(0);
        // Correct rotation just in case
        goalkeeper.setAngle(0);
    }

    // Only spawn if game is active
    if (!isGameActive) return;

    // Spawn Logic
    Object.values(players).forEach(player => {
        if (player.marblesRemaining > 0 && time > player.nextSpawnTime) {
            if (scene.textures.exists(player.textureKey)) {
                spawnMarble(scene, player);
                player.marblesRemaining--;
                
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
    // Spawn at top center (Funnel area)
    const x = Phaser.Math.Between(game.config.width * 0.4, game.config.width * 0.6);
    const y = -100; 

    const marble = scene.matter.add.image(x, y, player.textureKey, null, {
        shape: 'circle',
        friction: 0,
        frictionAir: 0.005, // Reduce air resistance
        restitution: 1.0,   // Max restitution
        label: 'marble'
    });
    
    marble.setDisplaySize(40, 40);
    marble.setCircle(20);
    marble.setBounce(1.0); // Use setBounce for restitution in Phaser Matter wrapper
    marble.setData('playerId', player.id); // Store ID for scoring
}

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
