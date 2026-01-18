# FaceDash Core

FaceDash is a multiplayer interactive game where players control marbles with their faces (or simulated avatars).

## Arenas

The game features multiple arenas with different gameplay mechanics:

### Arena 1 (`/arena`)
- **Theme:** Classic
- **Obstacles:** Standard pegs and rotating spinners.
- **Goal:** Reach the green zone at the bottom.

### Arena 2 (`/arena2`)
- **Theme:** Spacious & Strategic
- **Marbles:** Larger size (80x80) for better visibility.
- **Physics:**
  - Fewer static obstacles (pegs) with wider spacing.
  - No funnel; random spawn across the top width.
  - **Spawn Interval:** Fixed at 2 seconds (slower pace).
- **Goal:** Reach the green zone.

### Arena 3 (`/arena3`)
- **Theme:** Dynamic Challenge
- **Win Condition:** First player to reach **50 points** wins. The game ends when all players finish.
- **Leaderboard:** 
  - Ranked by **finish time** for those who completed the 50 points.
  - Then by score for those still playing.
- **Mechanics:**
  - **Walls:** Side walls are "dead zones" (touching them respawns the marble at the top).
  - **Floor:**
    - Center (Green): **Score Zone** (+1 point).
    - Sides (Red): **Dead Zone** (respawn, no points).
  - **Obstacles:**
    - **Pegs:** Static circular bumpers with high bounce.
    - **Moving Triangles:** Two large triangles (200px wide) moving horizontally in opposite directions. They act as dynamic barriers.
    - **Goalkeeper:** A moving paddle above the score zone that blocks marbles, adding a final layer of difficulty.

## Tech Stack

- **Frontend:** Phaser 3 (Game Engine), Matter.js (Physics)
- **Backend:** Node.js, Express, Socket.io
- **Communication:** Real-time websockets for player joins and updates.

## Running the Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Access the arenas:
   - Arena 1: `https://<your-domain>:3000/arena`
   - Arena 2: `https://<your-domain>:3000/arena2`
   - Arena 3: `https://<your-domain>:3000/arena3`
   - Studio (Controller): `https://<your-domain>:3000/studio`
