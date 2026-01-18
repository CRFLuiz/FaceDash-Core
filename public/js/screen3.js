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
        p.marblesRemaining = 50; // Reset marbles
        p.finished = false; // Reset finished status
    });
    
    // Clear existing marbles
    const bodies = game.scene.scenes[0].matter.world.getAllBodies();
    bodies.forEach(body => {
        if (body.label === 'marble' && body.gameObject) {
            body.gameObject.destroy();
        }
    });

    updateLeaderboard();
});

function checkEndGame() {
    const activePlayers = Object.values(players).filter(p => !p.finished);
    const totalPlayers = Object.keys(players).length;

    // If only 1 or 0 players remain active (and there were players to begin with)
    if (activePlayers.length <= 1 && totalPlayers > 1) {
        isGameActive = false;
        startBtn.innerText = "Reiniciar Partida";
        startBtn.style.display = 'block';
        // Note: leaderboard stays visible to show final results
    }
}

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
    // createFunnel(scene); // Funnel removed for Arena 2

    // 2. Static Obstacles (Pegs)
    createPegs(scene);

    // 3. Dynamic Obstacles (Spinners)
    scene.spinners = []; // Initialize array for spinners
    createSpinners(scene);

    // 4. Side Walls
    createSideWalls(scene);

    // 5. Score Zone (Floor)
    createFloor(scene);

    // 6. Goalkeeper
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

            // Marble hits Score Zone (Green)
            if ((bodyA.label === 'marble' && bodyB.label === 'scoreZone') || 
                (bodyB.label === 'marble' && bodyA.label === 'scoreZone')) {
                
                const marbleBody = bodyA.label === 'marble' ? bodyA : bodyB;
                const marbleObj = marbleBody.gameObject;

                if (marbleObj && marbleObj.getData('playerId')) {
                    const playerId = marbleObj.getData('playerId');
                    const player = players[playerId];
                    
                    if (player && !player.finished) {
                        player.score += 1; // 1 point for scoring
                        updateLeaderboard();
                        
                        // Destroy marble
                        marbleObj.destroy();

                        // Check Win Condition (50 points)
                        if (player.score >= 50) {
                            player.finished = true;
                            
                            // Destroy all remaining marbles for this player
                            const allBodies = scene.matter.world.getAllBodies();
                            allBodies.forEach(b => {
                                if (b.label === 'marble' && b.gameObject) {
                                    const mObj = b.gameObject;
                                    if (mObj.getData('playerId') === playerId) {
                                        mObj.destroy();
                                    }
                                }
                            });

                            checkEndGame();
                        }
                    }
                }
            }

            // Marble hits Dead Zone (Red Floor)
            if ((bodyA.label === 'marble' && bodyB.label === 'deadZone') || 
                (bodyB.label === 'marble' && bodyA.label === 'deadZone')) {
                
                const marbleBody = bodyA.label === 'marble' ? bodyA : bodyB;
                const marbleObj = marbleBody.gameObject;

                // Respawn marble (move to top)
                if (marbleObj) {
                    const x = Phaser.Math.Between(50, game.config.width - 50);
                    const y = -100;
                    
                    marbleObj.setPosition(x, y);
                    marbleObj.setVelocity(0, 0);
                    marbleObj.setAngularVelocity(0);
                }
            }


        });
    });
}

function createFunnel(scene) {
    const width = game.config.width;
    const startY = -50;
    
    // Left Wall
    const leftWall = scene.add.rectangle(width * 0.2, startY + 100, 400, 20, 0x00F2FE);
    leftWall.setRotation(0.5);
    scene.matter.add.gameObject(leftWall, {
        isStatic: true,
        angle: 0.5
    });

    // Right Wall
    const rightWall = scene.add.rectangle(width * 0.8, startY + 100, 400, 20, 0x00F2FE);
    rightWall.setRotation(-0.5);
    scene.matter.add.gameObject(rightWall, {
        isStatic: true,
        angle: -0.5
    });
}

function createPegs(scene) {
    const rows = 4; // Fewer rows (was 6)
    const cols = 5; // Fewer cols (was 9)
    const spacingX = game.config.width / cols;
    const spacingY = (game.config.height * 0.4) / rows;
    const startY = 200;

    // Spinner positions for exclusion zone
    const spinnerY = game.config.height * 0.6;
    const spinnerX1 = game.config.width * 0.3;
    const spinnerX2 = game.config.width * 0.7;
    const safeRadius = 160; // Increased buffer

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let x = j * spacingX + spacingX / 2;
            if (i % 2 === 1) x += spacingX / 2;
            x += Phaser.Math.Between(-10, 10); // More randomness
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

function createSideWalls(scene) {
    const wallWidth = 40;
    const wallHeight = game.config.height; // Full height
    const y = game.config.height / 2;

    // Left Wall
    const leftWall = scene.add.rectangle(wallWidth / 2, y, wallWidth, wallHeight, 0xFF0000);
    scene.matter.add.gameObject(leftWall, {
        isStatic: true
    });

    // Right Wall
    const rightWall = scene.add.rectangle(game.config.width - wallWidth / 2, y, wallWidth, wallHeight, 0xFF0000);
    scene.matter.add.gameObject(rightWall, {
        isStatic: true
    });
}

function createFloor(scene) {
    const floorHeight = 40; // Same thickness as walls
    const y = game.config.height - floorHeight / 2;
    const width = game.config.width;
    
    // Width calculations
    const greenWidth = width * 0.3;
    const redWidth = (width - greenWidth) / 2;

    // 1. Left Red Floor
    const leftRect = scene.add.rectangle(redWidth / 2, y, redWidth, floorHeight, 0xFF0000);
    scene.matter.add.gameObject(leftRect, {
        isStatic: true,
        label: 'deadZone' // No points, just destroy
    });

    // 2. Center Green Floor (Goal)
    const centerRect = scene.add.rectangle(width / 2, y, greenWidth, floorHeight, 0x00FF00);
    scene.matter.add.gameObject(centerRect, {
        isStatic: true,
        label: 'scoreZone' // Gives points
    });

    // 3. Right Red Floor
    const rightRect = scene.add.rectangle(width - redWidth / 2, y, redWidth, floorHeight, 0xFF0000);
    scene.matter.add.gameObject(rightRect, {
        isStatic: true,
        label: 'deadZone' // No points, just destroy
    });
}

let goalkeeper;
let goalkeeperDirection = 1;
let goalkeeperSpeed = 3;
let goalRange = {};

function createGoalkeeper(scene) {
    const width = game.config.width;
    const greenWidth = width * 0.3;
    
    // Goalkeeper dimensions
    const keeperWidth = greenWidth * 0.4; // Doubled width (was 0.2)
    const keeperHeight = 10;
    
    // Position: above the floor
    const y = game.config.height - 60; 
    
    // Define movement range (relative to the green zone)
    const centerX = width / 2;
    const halfGreen = greenWidth / 2;
    goalRange = {
        min: centerX - halfGreen + keeperWidth / 2,
        max: centerX + halfGreen - keeperWidth / 2
    };

    // Create Goalkeeper
    const rect = scene.add.rectangle(centerX, y, keeperWidth, keeperHeight, 0xFFFFFF);
    goalkeeper = scene.matter.add.gameObject(rect, {
        isStatic: false,
        isSensor: false,
        friction: 0,
        frictionAir: 0,
        inertia: Infinity,
        ignoreGravity: true,
        label: 'goalkeeper',
        restitution: 1.2 // High bounciness for goalkeeper
    });
    goalkeeper.setFixedRotation();
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
        interval: 2000,
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

    // Goalkeeper Logic
    if (goalkeeper) {
        goalkeeper.setVelocityX(goalkeeperSpeed * goalkeeperDirection);
        goalkeeper.setVelocityY(0);
        goalkeeper.setAngle(0);

        // Bounce at the edges of the green zone
        if (goalkeeper.x >= goalRange.max) {
            goalkeeperDirection = -1;
            goalkeeper.x = goalRange.max; // Clamp
        } else if (goalkeeper.x <= goalRange.min) {
            goalkeeperDirection = 1;
            goalkeeper.x = goalRange.min; // Clamp
        }
    }



    // Only spawn if game is active
    if (!isGameActive) return;

    // Spawn Logic
    Object.values(players).forEach(player => {
        if (!player.finished && player.marblesRemaining > 0 && time > player.nextSpawnTime) {
            if (scene.textures.exists(player.textureKey)) {
                spawnMarble(scene, player);
                player.marblesRemaining--;
                
                // Fixed interval for Arena 2
                player.interval = 2000;
                player.nextSpawnTime = time + player.interval;
            }
        }
    });
}

function spawnMarble(scene, player) {
    // Spawn at top, random X across the width
    const x = Phaser.Math.Between(50, game.config.width - 50); // Padding to avoid walls
    const y = -100; 

    const marble = scene.matter.add.image(x, y, player.textureKey, null, {
        shape: 'circle',
        friction: 0,
        frictionAir: 0.005, // Reduce air resistance
        restitution: 1.0,   // Max restitution
        label: 'marble'
    });
    
    marble.setDisplaySize(80, 80); // Doubled size (was 40, 40)
    marble.setCircle(40); // Doubled radius (was 20)
    marble.setBounce(1.0); // Use setBounce for restitution in Phaser Matter wrapper
    marble.body.label = 'marble'; // Re-assign label after setCircle
    marble.setData('playerId', player.id); // Store ID for scoring
}

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
