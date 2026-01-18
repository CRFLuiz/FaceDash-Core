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
- **Walls:** Side walls are "dead zones" (touching them respawns the marble).
- **Obstacles:**
  - Standard pegs.
  - **Moving Triangles:** Two large triangles moving horizontally in opposite directions below the pegs.
    - They are static physics bodies (unstoppable) but move via code.
    - They push marbles aside, creating a "scissor" effect.
- **Goal:** Navigate through the moving triangles to reach the green zone.

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
