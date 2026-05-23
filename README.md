# Dino Dash v3

**Premium endless-runner + themed-levels mashup** of Chrome Dino + Geometry Dash + 10 other classic games. Zero runtime dependencies. PWA-installable. Plays offline.

> 🚀 **Live:** _(see Netlify deploy — auto-builds from main)_
> 📦 **Repo:** [arnoldshapiro-del/dino-dash](https://github.com/arnoldshapiro-del/dino-dash)

---

## 🎮 Features

### 5 Geometry Dash modes (with full physics)
- **Cube** — variable jump, coyote time, jump buffer, crouch, 90° rotation per jump
- **Ship** — hold to thrust, release to fall, ±30° visual tilt with thrust trail
- **Ball** — instant gravity flip on tap, rolls on current surface
- **Spider** — instant teleport to opposite surface + streak line
- **Wave** — 45° sawtooth angle with fading trail

### Mid-run mechanics
- **7 portal types** — 5 mode portals + speed (0.5/1/2/3/4x) + mini + dual
- **7 orbs** (tap when overlapping) — yellow, red, blue, pink, green, spider, dash
- **5 pads** (auto-trigger) — yellow, pink, red, blue, spider
- **8 power-ups** — shield, magnet, slow-mo, 2x score, jetpack, mini, mystery box, phase shift
- **3 coin tiers** — yellow (1pt), blue (5pt), gold secret (100pt) — combo SFX pitch-ramps

### Game modes
- **Endless Run** — infinite procedural chunks (15 obstacle types, score-gated difficulty, day/night cycle every 1500 score)
- **16 Themed Levels across 4 worlds** — each genuinely distinct:
  - **W1 Dawn Riders:** Genesis (Chrome Dino tribute), First Flight (ship), Spider Crawl, Bouncing Ball, Wave Rider
  - **W2 Crossroads:** Geometric Beat, Flappy Skies, Tunnel Surfer (3-lane), Pixel Platform, Helix Tower
  - **W3 Apocalypse:** Jetpack Madness, Pac-Maze (ghosts + pellets), Crossy Path, Tron Cycle, Wave Tunnel (4x)
  - **W4 The End:** T-Rex Rex 3-phase boss battle
- **Practice Mode** — checkpoint system, auto-checkpoint every 200 progress

### Progression
- **Shop** with 4 tabs: 8 upgrades × 3 tiers, 6 consumables, 10 skins, 5 trails
- **Dual currency** — coins (collected mid-run) + Dash Points (level stars + achievements)
- **20 achievements** with toast + skin/DP rewards
- **3 rotating missions** from pool of 25, all-3-complete bonus
- **Daily challenge** — date-seeded, resets midnight, 500c + 50 DP reward
- **3-star rating** per level: complete / ≤2 deaths / 0 deaths + all coins

### Polish
- Procedural Web Audio: BPM-synced kick/hi-hat + per-mode lead synth, 17 SFX, music ducks 40% on death
- 3-layer parallax: 200 twinkling stars (10%) + triangular mountains (40%) + Tron grid floor (100%)
- 500-particle object pool + +N float text + radial bursts + ring expanders
- Screen shake (death 12f×8 / portal 3f×3 / shield 4f×5) + hit-stop on impact
- Full responsive 16:9 letterbox canvas — 320×180 minimum, scales to 4K
- PWA with service worker caching all 24 assets for offline play

### Accessibility
Reduced motion, high contrast, color-blind mode, FPS overlay, hitbox debug, skip-tutorial — all in Options menu.

### Easter eggs
- **Konami code** (↑↑↓↓←→←→BA) on title — unlocks Rainbow Dino skin + 500 DP
- **Every 50,000 score** in endless — 5-sec 10x multiplier zone
- Type `rubrub` anywhere — toggles debug overlay
- Type `dawn` on title — +5000 coins (dev cheat)

---

## 🎯 Controls

| Action | Keyboard | Mouse | Touch |
|---|---|---|---|
| Action (jump / thrust / flip / teleport / wave-up) | Space, ↑, W | Click | Tap |
| Crouch | ↓, S | — | Swipe down |
| Lane left (Tunnel Surfer) | ←, A | — | Swipe left |
| Lane right (Tunnel Surfer) | →, D | — | Swipe right |
| Pause | Esc | — | Long-press |
| Mute | M | — | — |
| Restart | R | — | — |
| Practice toggle | P | — | — |
| Manual checkpoint | C | — | — |
| Remove last checkpoint | X | — | — |

Gamepad supported (A button = action, dpad-down = crouch).

---

## 🛠️ Tech Stack

- **HTML5 Canvas 2D** + **vanilla ES6 modules**
- **Web Audio API** for procedural music + SFX (zero audio files)
- **localStorage** for all persistence (keys prefixed `dinoDash_`)
- **Service Worker** for offline play
- **Google Fonts:** Oxanium (400/600/800), Space Mono
- **ZERO runtime dependencies** — no npm, no bundler, no framework

Pure static site. Netlify serves the folder as-is from `main`.

---

## 📁 Structure

```
dino-dash/
├── index.html          # Entry point
├── style.css           # All styles (no Tailwind)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker
├── netlify.toml        # Cache-control headers
├── icon.svg            # PWA icon
└── js/                 # 25 ES6 modules
    ├── main.js         # Game loop + state dispatch
    ├── game.js         # Central state machine
    ├── player.js       # Player entity
    ├── modes.js        # 5 GD modes physics
    ├── input.js        # Unified keyboard/mouse/touch/gamepad
    ├── parallax.js     # 3-layer background
    ├── ui.js           # HUD + screens helper
    ├── obstacles.js    # 15 obstacle types
    ├── portals.js      # 7 portal types
    ├── orbs.js         # 7 orbs + 5 pads
    ├── powerups.js     # 8 power-ups + mystery box
    ├── coins.js        # Yellow / blue / gold secret
    ├── particles.js    # 500-particle pool + float text + rings
    ├── chunkgen.js     # Procedural endless mode
    ├── audio.js        # Web Audio synthesis + music engine
    ├── achievements.js # 20 achievements
    ├── missions.js     # 3-from-25 rotating
    ├── daily.js        # Date-seeded daily challenge
    ├── stats.js        # Lifetime stats
    ├── economy.js      # Dual currency + upgrades
    ├── shop.js         # Shop UI (4 tabs)
    ├── levels.js       # 16 level definitions
    ├── worldmap.js     # World map UI
    ├── levelplayer.js  # Discrete level runner
    ├── speciallevels.js# L7-L14 + L16 boss mechanics
    ├── practice.js     # Checkpoint system
    ├── tutorial.js     # First-run briefings
    ├── skins.js        # 10 procedural skins
    └── storage.js      # localStorage wrapper
```

---

Built with vibe coding via Claude Code. 🦖
