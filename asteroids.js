class AsteroidsGame extends HTMLElement {
  constructor() {
    super();
    this.canvas = null;
    this.ctx = null;
    this.gameState = null;
    this.keyHandlers = null;
    this.animationId = null;
  }

  connectedCallback() {
    this.innerHTML = `
      <canvas width="640" height="480" style="border: 2px solid #667eea; background: #000;"></canvas>
    `;
    this.canvas = this.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.initGame();
    this.startGameLoop();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  cleanup() {
    if (this.keyHandlers) {
      window.removeEventListener('keydown', this.keyHandlers.down);
      window.removeEventListener('keyup', this.keyHandlers.up);
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  initGame() {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.gameState = {
      w, h,
      ship: { x: w/2, y: h/2, vx: 0, vy: 0, angle: -Math.PI/2, thrustPower: 0 },
      keys: {},
      bullets: [],
      asteroids: [],
      score: 0,
      gameOver: false,
      collected: {},
      emojiTypes: ['🗿', '💩', '🌮', '🍕', '🧀', '🥑', '🍆', '🌶️', '🧇', '🥓']
    };

    // Setup input handlers
    this.keyHandlers = {
      down: (e) => {
        this.gameState.keys[e.key] = true;
        if (e.key === ' ') {
          e.preventDefault();
          if (this.gameState.gameOver) {
            this.restartGame();
          } else {
            this.shoot();
          }
        }
      },
      up: (e) => this.gameState.keys[e.key] = false
    };

    window.addEventListener('keydown', this.keyHandlers.down);
    window.addEventListener('keyup', this.keyHandlers.up);

    // Spawn initial asteroids
    for (let i = 0; i < 4; i++) this.spawnAsteroid();
  }

  restartGame() {
    const { w, h } = this.gameState;
    this.gameState.ship = { x: w/2, y: h/2, vx: 0, vy: 0, angle: -Math.PI/2, thrustPower: 0 };
    this.gameState.bullets = [];
    this.gameState.asteroids = [];
    this.gameState.score = 0;
    this.gameState.gameOver = false;
    this.gameState.collected = {};
    for (let i = 0; i < 4; i++) this.spawnAsteroid();
  }

  spawnAsteroid(x, y, size = 3, emoji = null) {
    const { w, h, emojiTypes, asteroids } = this.gameState;
    const speed = (4 - size) * 0.5;
    const numPoints = 8 + Math.floor(Math.random() * 4);
    const vertices = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = 0.7 + Math.random() * 0.5;
      vertices.push({ angle, radius });
    }

    asteroids.push({
      x: x || Math.random() * w,
      y: y || Math.random() * h,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      size: size,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.05,
      vertices: vertices,
      emoji: emoji || emojiTypes[Math.floor(Math.random() * emojiTypes.length)]
    });
  }

  shoot() {
    if (this.gameState.gameOver) return;
    const { ship, bullets } = this.gameState;
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * 10,
      y: ship.y + Math.sin(ship.angle) * 10,
      vx: Math.cos(ship.angle) * 5,
      vy: Math.sin(ship.angle) * 5,
      life: 60
    });
  }

  update() {
    const { ship, keys, bullets, asteroids, w, h } = this.gameState;
    if (this.gameState.gameOver) return;

    // Ship rotation
    if (keys['ArrowLeft']) ship.angle -= 0.08;
    if (keys['ArrowRight']) ship.angle += 0.08;

    // Smooth thrust
    if (keys['ArrowUp']) {
      ship.thrustPower = Math.min(ship.thrustPower + 0.008, 1);
    } else {
      ship.thrustPower = Math.max(ship.thrustPower - 0.03, 0);
    }

    // Apply thrust
    if (ship.thrustPower > 0) {
      const thrust = ship.thrustPower * 0.15;
      ship.vx += Math.cos(ship.angle) * thrust;
      ship.vy += Math.sin(ship.angle) * thrust;
    }

    // Friction
    ship.vx *= 0.99;
    ship.vy *= 0.99;

    // Move ship
    ship.x += ship.vx;
    ship.y += ship.vy;

    // Wrap ship
    if (ship.x < 0) ship.x = w;
    if (ship.x > w) ship.x = 0;
    if (ship.y < 0) ship.y = h;
    if (ship.y > h) ship.y = 0;

    // Update bullets
    this.gameState.bullets = bullets.filter(b => {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      return b.life > 0 && b.x > 0 && b.x < w && b.y > 0 && b.y < h;
    });

    // Update asteroids
    asteroids.forEach(a => {
      a.x += a.vx;
      a.y += a.vy;
      a.angle += a.spin;
      if (a.x < 0) a.x = w;
      if (a.x > w) a.x = 0;
      if (a.y < 0) a.y = h;
      if (a.y > h) a.y = 0;

      // Check collision with ship
      if (!a.collectable) {
        const dx = ship.x - a.x;
        const dy = ship.y - a.y;
        if (Math.sqrt(dx*dx + dy*dy) < a.size * 10) {
          this.gameState.gameOver = true;
        }
      }
    });

    // Check bullet collisions
    bullets.forEach((b, bi) => {
      asteroids.forEach((a, ai) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.sqrt(dx*dx + dy*dy) < a.size * 10) {
          bullets.splice(bi, 1);

          if (a.size <= 2) {
            a.collectable = true;
            a.vx *= 0.5;
            a.vy *= 0.5;
            this.gameState.score += (4 - a.size) * 10;
          } else {
            asteroids.splice(ai, 1);
            this.gameState.score += (4 - a.size) * 10;
            this.spawnAsteroid(a.x, a.y, a.size - 1, a.emoji);
            this.spawnAsteroid(a.x, a.y, a.size - 1, a.emoji);
          }

          const hasNonCollectables = asteroids.some(ast => !ast.collectable);
          if (!hasNonCollectables) {
            for (let i = 0; i < 4; i++) this.spawnAsteroid();
          }
        }
      });
    });

    // Check ship collision with collectables
    asteroids.forEach((a, ai) => {
      if (a.collectable) {
        const dx = ship.x - a.x;
        const dy = ship.y - a.y;
        if (Math.sqrt(dx*dx + dy*dy) < 15) {
          asteroids.splice(ai, 1);
          this.gameState.score += 50;
          if (!this.gameState.collected[a.emoji]) {
            this.gameState.collected[a.emoji] = 0;
          }
          this.gameState.collected[a.emoji]++;
        }
      }
    });
  }

  render() {
    const { w, h, ship, bullets, asteroids, score, collected, gameOver } = this.gameState;
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Draw ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 6);
    ctx.closePath();
    ctx.stroke();

    // Thrust flame
    if (ship.thrustPower > 0 && !gameOver) {
      const flameLength = 7 + ship.thrustPower * 5;
      ctx.fillStyle = `rgba(255, 107, 107, ${ship.thrustPower})`;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-5 - flameLength, -3);
      ctx.lineTo(-5 - flameLength, 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Draw bullets
    ctx.fillStyle = '#fff';
    bullets.forEach(b => {
      ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    });

    // Draw asteroids
    asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);

      if (!a.collectable) {
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const r = a.size * 10;
        a.vertices.forEach((v, i) => {
          const x = Math.cos(v.angle) * r * v.radius;
          const y = Math.sin(v.angle) * r * v.radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
      }

      const size = a.collectable ? 20 : a.size * 15;
      ctx.font = `${size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.emoji, 0, 0);

      if (a.collectable) {
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 15;
        ctx.fillText(a.emoji, 0, 0);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    });

    // Score
    ctx.fillStyle = '#667eea';
    ctx.font = '16px monospace';
    ctx.fillText(`SCORE: ${score}`, 10, 25);

    // Collected emojis
    let yOffset = 50;
    Object.keys(collected).forEach(emoji => {
      ctx.fillStyle = '#fff';
      ctx.font = '18px Arial';
      ctx.fillText(`${emoji} x${collected[emoji]}`, 10, yOffset);
      yOffset += 25;
    });

    if (gameOver) {
      const messages = [
        'Destroyed by a 🌮',
        'RIP Space Captain',
        'You got memed',
        'The 💩 got you',
        'Git gud',
        'Skill issue detected'
      ];
      const msg = messages[Math.floor(Math.random() * messages.length)];

      ctx.fillStyle = '#ff6b6b';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', w/2, h/2 - 20);
      ctx.font = '18px monospace';
      ctx.fillText(msg, w/2, h/2 + 15);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#667eea';
      ctx.fillText('Press SPACE to restart', w/2, h/2 + 45);
      ctx.textAlign = 'left';
    }
  }

  startGameLoop() {
    const loop = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }
}

customElements.define('asteroids-game', AsteroidsGame);
