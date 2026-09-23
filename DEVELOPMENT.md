# Development and project notes

[Play the live game](https://floating-island-factory.vercel.app/) · [Public GitHub repository](https://github.com/Kiril-P/floating-island-factory)

A playable 3D factory diorama: turn a grassy island into a little industrial settlement above the clouds. Built with TypeScript, Three.js, and Vite. All terrain, buildings, transport, and scenery are procedural 3D geometry.

## Run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5188**. If that port is occupied, Vite prints the available address.

```sh
npm run build    # Type-check and produce dist/
npm run preview  # Serve the production build on http://127.0.0.1:5189
npm test         # Economic, transaction, logistics, and save regression tests
npm run balance  # Simulate the full progression without granting resources
```

The production build is a static site and can be served from `dist/`. No accounts, paid services, server, or external game assets are required. Optional Google Fonts have system-font fallbacks.

## Deploy to Vercel

The live game is hosted at **https://floating-island-factory.vercel.app/**. `vercel.json` configures the Vite framework, `npm run build`, and the `dist/` output directory.

To publish an update from an account with access to the Vercel project:

```sh
npx vercel deploy --prod --project floating-island-factory
```

Automatic GitHub deployments require a [GitHub login connection in the Vercel account](https://vercel.com/docs/accounts/create-an-account#login-methods-and-connections), followed by connecting this repository to the Vercel project. Until that connection is configured, pushes to GitHub do not deploy; use the CLI command above. Local Vercel metadata and environment files are excluded from Git.

## Play

1. Click the iron outcrop to gather ore. Six successful clicks yield 12 ore.
2. Open **Stockpile** and commit the ore. Choose an **Iron drill**, then a green pad.
3. Add a smelter and workshop. Keep ore and ingots in the island inventory to feed their recipes.
4. Upgrade the drill and smelter together. Their visible tanks and additional mechanisms grow with each level.
5. Commit 30 ingots and 10 gears, then use **Islands** to bridge to Copperwind Reach.
6. Build an outpost drill with shared headquarters funds. Build one drone dock on each island.
7. Select the outpost dock, choose Hearth Island, send iron ore, and keep a source reserve. Launch the route.
8. After a real delivery, build the Sky Beacon with 70 ore, 100 ingots, and 55 gears. Continue building and open Starfall Isle.

**Resources stay local.** Buildings share only their island inventory. The headquarters stockpile pays construction, upgrades, and bridges everywhere. Committing resources to it is one way. Bridges unlock access; drones carry inventory. Conveyors automatically illustrate the local production connections.

Each drone carries at most **12 units**, takes **12 seconds each way**, and waits **4 seconds** at its source. Cargo leaves the source when the drone departs and enters the destination once on arrival. Pausing departures lets an existing flight finish. Routes can be changed and docks removed only when affected drones are home.

Removing a building refunds **60% of its original and upgrade costs**, rounded down per resource, to headquarters. Headquarters cannot be removed. There is one dock per island and one beacon per settlement.

| Control | Action |
| --- | --- |
| Left-drag | Orbit |
| Scroll | Zoom |
| WASD / arrow keys / right-drag | Pan |
| Click a deposit | Gather ore |
| Click a building | Inspect, pause, upgrade, or remove |
| 1–5 | Choose a building |
| Escape | Cancel placement or close a panel |
| Click the title | Return to the home camera |

## Progress and balance

The fixed simulation step is 0.1 seconds. Machine rates use completed production over the previous 30 seconds, excluding gathering, commitments, and cargo transfers. Idle machines retain their partial cycle progress.

The reproducible balance script uses only gathering, production, legal purchases, modest level-2 upgrades, and elapsed simulation time. It reaches:

| Milestone | Simulated time |
| --- | --- |
| First drill | 0:02, excluding time reading the interface |
| Smelter | 0:41 |
| Workshop | 1:23 |
| Level-2 drill / smelter | 2:06 / 2:35 |
| First bridge | 4:21 |
| First drone delivery | 7:42 |
| Sky Beacon | **15:41** |
| Third island with full production and dock | 20:57 |

This is a feasible route, not a forced schedule. Building more machines and upgrading changes the pace. Reserving all ingots for construction temporarily stalls workshops; pause/resume and exact resource commitments let you manage that tradeoff. Manual gathering and refunds keep recovery possible.

## Saves

The game automatically saves to this browser's local storage every 5 seconds, after purchases and other actions, and when leaving or hiding the page. Save data includes inventories, construction investment, machine levels, cycle progress, pause state, bridges, milestones, route settings, flight direction, elapsed travel, and in-flight cargo. Malformed saves are rejected rather than loaded into a broken economy.

**Settings → Reset saved game** requires confirmation. Progress is local to this browser and origin. The game intentionally rests while the tab is hidden or closed; there is no offline production or cloud sync.

## Code map

| File | Responsibility |
| --- | --- |
| `src/config.ts` | Recipes, costs, rates, upgrades, islands, and pad coordinates |
| `src/simulation.ts` | Deterministic economy, shared validation, transactions, routes, serialization |
| `src/models.ts` | Reusable procedural assets, shared geometry/materials, model animation |
| `src/world.ts` | Scene, lighting, camera, stable picking volumes, previews, conveyors, flights |
| `src/ui.ts` | Resource display, contextual journey, stockpile, inspectors, dialogs |
| `src/main.ts` | Fixed-step loop, actions, local persistence, optional sounds |
| `tests/simulation.test.ts` | Economic and save regression coverage |
| `tests/balance.ts` | End-to-end progression simulation and reproducible populated fixtures |

## Verification

- The production build passes TypeScript checking.
- Regression tests cover recipes, frame-step consistency, input starvation, affordability, overlap, shared placement validation, all three upgrade levels, invested-cost refunds, bridge gating, outpost funding, every cargo resource, finite capacity, reserves, paused flights, in-flight reloads, corruption rejection, beacon gating, and continued construction.
- A browser playthrough exercised gathering, commitment, placement, upgrades, pauses, both bridges, outpost construction, dock pairing, drone delivery across a reload, beacon completion, and all three islands. Waiting was accelerated with a development-only clock; purchases still used earned resources.
- Browser checks included removal/cancellation/refund, reset confirmation and restoration of a clean save, camera interaction, smaller desktop layout, and a populated scene. No console errors were observed.
- At 1280 × 720 with renderer pixel ratio 1.7, a 12-building settlement measured approximately 810 draw calls and 101,000 triangles. Initial measurements showed 8.3 ms median frame intervals and 9–10 ms p95; later captures at 1024 × 768 showed 33.3 ms median and 34.2 ms p95. Browser scheduling and hardware affect these intervals; this is not a benchmark of every laptop.

For repeatable local QA, visit `/?qa=1` in the development server. It uses a **separate test save** and exposes buttons to advance simulation time and load the balance script's verified settlement. Run `npm run balance` to regenerate fixtures. QA controls and application diagnostics are excluded from production builds.

## Scope

The game is designed for desktop browsers with WebGL and hardware acceleration. It has three handcrafted islands, predefined building pads, one resource per outgoing drone route, three levels per production machine, and the first beacon milestone. Conveyor routing is visual and automatic. There is no combat, power system, offline production, research tree, prestige, or further chapter beyond continued construction. Sounds are simple optional synthesized tones; there is no music soundtrack.
