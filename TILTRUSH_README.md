# 🎮 TiltRush

**A head-controlled 3D maze speedrun game**

Control a ball through challenging mazes using your head movements (webcam) or device gyroscope. Race against the clock and compete on global leaderboards!

## ✨ Features

- **🎯 Head Tracking Controls** - Use your webcam and face detection to tilt the maze
- **📱 Gyroscope Support** - Play on mobile with device tilt controls
- **🏆 10 Progressive Levels** - From 8×8 (Starter) to 26×26 (Legend)
- **⏱️ Speedrun Timer** - Millisecond precision timing
- **🥇 Global Leaderboards** - Compete with players worldwide (Firebase)
- **🕹️ Arcade-Style Name Entry** - Classic 5-character score submission
- **🎨 Matrix Aesthetic** - Green-on-black cyberpunk vibes
- **📊 Seeded Mazes** - Same puzzles for everyone = fair competition
- **💾 Personal Bests** - Track your improvement locally

## 🎮 How to Play

### Desktop (Webcam)
1. Click "START GAME"
2. Allow webcam access
3. Move your head to tilt the maze
4. Guide the white ball from green START to red FINISH

### Mobile (Gyroscope)
1. Click "START GAME"
2. Allow motion sensor access
3. Physically tilt your device
4. Navigate to the finish line

### Keyboard (Fallback)
- **Arrow Keys** - Manual tilt control if no sensors available

## 🏗️ Tech Stack

- **Three.js** - 3D rendering
- **TensorFlow.js + BlazeFace** - Real-time face detection
- **Firebase Realtime Database** - Global leaderboards
- **Vanilla JavaScript** - No framework overhead
- **GitHub Pages** - Static hosting

## 🚀 Setup

### Basic (No Leaderboard)
Just open `game.html` in a browser - everything works locally!

### With Global Leaderboard
See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for Firebase configuration instructions.

## 📊 Game Levels

| Level | Name | Size | Difficulty |
|-------|------|------|------------|
| 1 | Starter | 8×8 | Tutorial |
| 2 | Novice | 10×10 | Easy |
| 3 | Casual | 12×12 | Easy |
| 4 | Intermediate | 14×14 | Medium |
| 5 | Skilled | 16×16 | Medium |
| 6 | Advanced | 18×18 | Hard |
| 7 | Expert | 20×20 | Hard |
| 8 | Master | 22×22 | Very Hard |
| 9 | Grandmaster | 24×24 | Extreme |
| 10 | Legend | 26×26 | Impossible |

## 🎯 Development

### File Structure
```
game.html              # Main game file
FIREBASE_SETUP.md      # Leaderboard setup guide
TILTRUSH_README.md     # This file
```

### Key Features in Code
- Seeded random maze generation (consistent levels)
- Smooth camera tracking with interpolation
- Collision detection with maze walls
- Dynamic camera positioning for different maze sizes
- Real-time leaderboard sync

## 🎨 Design Choices

### Why Head Tracking?
- Unique control scheme
- Physically engaging
- Hilarious to watch people play
- Natural tilt metaphor

### Why 5-Character Names?
- Classic arcade nostalgia
- Forces creativity
- Easy to display in compact leaderboards
- "FELIX" > "Player 1"

### Why Green/Black?
- Matrix aesthetic
- High contrast for accessibility
- Looks cyber/retro
- Easy on the eyes in dark rooms

## 🐛 Known Issues

- Lighting affects face detection quality
- Larger mazes (20+) can be brutal
- May cause neck strain (take breaks!)
- Not recommended during Zoom calls

## 📝 License

Created by Felix Flores

## 🙏 Credits

- Three.js for 3D rendering
- TensorFlow.js team for BlazeFace
- Firebase for easy backend
- Everyone who looks ridiculous playing this

---

**Ready to rush?** Open `game.html` and tilt your way to victory! 🏁
