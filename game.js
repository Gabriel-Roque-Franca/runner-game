const GAME_WIDTH  = 1200;
const GAME_HEIGHT = 600;
const FLOOR_Y     = 536;
const PLAYER_X    = 100;
const TILE_W      = 64;

const INITIAL_SPEED   = 250;
const SPEED_INCREMENT = 20;
const JUMP_VELOCITY   = -520;

class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  preload() {
    this.load.image('walk1',   'assets/walk1.png');
    this.load.image('walk2',   'assets/walk2.png');
    this.load.image('chao',    'assets/chao.png');
    this.load.image('inimigo', 'assets/inimigo.png');

    this.load.image('morango', 'assets/morango.png');
    this.load.image('banana',  'assets/banana.png');
    this.load.image('cereja',  'assets/cereja.png');
    this.load.image('maca',    'assets/maca.png');

    this.load.audio('pulo',  'assets/pulo.ogg');
    this.load.audio('fruit', 'assets/faaah.mp3');     // fruta
    this.load.audio('hit',   'assets/galinha.mp3');   // morte
  }

  create() {
    this.speed = INITIAL_SPEED;
    this.alive = true;
    this.gameStarted = false;

    this.score = 0;

    this.jumpCount = 0;
    this.maxJumps = 2;

    this.enemySpawnTimer = 0;
    this.enemySpawnDelay = Phaser.Math.Between(800, 1600);

    this.fruitSpawnTimer = 0;
    this.fruitSpawnDelay = Phaser.Math.Between(3000, 6000);

    // fundo
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xd4e8f5, 0xd4e8f5, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // chão visual
    this.groundGroup = this.add.group();
    const tilesNeeded = Math.ceil(GAME_WIDTH / TILE_W) + 2;

    for (let i = 0; i < tilesNeeded; i++) {
      const tile = this.add.image(i * TILE_W, FLOOR_Y, 'chao').setOrigin(0, 0);
      this.groundGroup.add(tile);
    }

    // chão físico
    this.groundBody = this.add.rectangle(0, FLOOR_Y, GAME_WIDTH, 64, 0x000000, 0);
    this.groundBody.setOrigin(0, 0);
    this.physics.add.existing(this.groundBody, true);

    // animação
    this.anims.create({
      key: 'walk',
      frames: [{ key: 'walk1' }, { key: 'walk2' }],
      frameRate: 8,
      repeat: -1
    });

    // player
    this.player = this.physics.add.sprite(PLAYER_X, FLOOR_Y, 'walk1')
      .setOrigin(0.5, 1);

    this.player.setCollideWorldBounds(true);
    this.player.body.setGravityY(900);
    this.player.play('walk');

    this.physics.add.collider(this.player, this.groundBody);

    // grupo de inimigos
    this.enemies = this.physics.add.group();

    // fruta
    this.fruit = null;

    // colisões
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);

    // input
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // sons
    this.jumpSound  = this.sound.add('pulo');
    this.hitSound   = this.sound.add('hit');
    this.fruitSound = this.sound.add('fruit');

    // textos
    this.msgText = this.add.text(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      'PRESSIONE ESPAÇO PARA COMEÇAR',
      { font: 'bold 18px monospace', fill: '#000' }
    ).setOrigin(0.5);

    this.scoreText = this.add.text(10, 10, 'score: 0', {
      font: '14px monospace', fill: '#000'
    });

    this.levelText = this.add.text(GAME_WIDTH - 10, 10, 'vel: ' + this.speed, {
      font: '14px monospace', fill: '#000'
    }).setOrigin(1, 0);
  }

  spawnEnemy() {
    const posX = Phaser.Math.Between(GAME_WIDTH + 50, GAME_WIDTH + 300);

    const enemy = this.enemies.create(posX, FLOOR_Y, 'inimigo')
      .setOrigin(0.5, 1);

    enemy.body.allowGravity = false;
    enemy.passed = false;
  }

  spawnFruit() {
    const fruits = [
      { key: 'morango', value: 50 },
      { key: 'banana',  value: 30 },
      { key: 'cereja',  value: 70 },
      { key: 'maca',    value: 40 }
    ];

    const choice = Phaser.Utils.Array.GetRandom(fruits);

    const posX = Phaser.Math.Between(GAME_WIDTH + 200, GAME_WIDTH + 600);
    const height = Phaser.Math.Between(40, 160);

    this.fruit = this.physics.add.image(posX, FLOOR_Y - height, choice.key)
      .setOrigin(0.5, 1);

    this.fruit.body.allowGravity = false;
    this.fruit.value = choice.value;

    this.physics.add.overlap(this.player, this.fruit, this.collectFruit, null, this);
  }

  collectFruit(player, fruit) {
    this.score += fruit.value;
    this.scoreText.setText('score: ' + this.score);

    this.fruitSound.play();

    fruit.destroy();
    this.fruit = null;
  }

  hitEnemy() {
    if (!this.alive) return;

    this.alive = false;

    this.hitSound.play();

    this.enemies.setVelocityX(0);
    this.player.setVelocityX(0);
    this.player.anims.stop();

    this.msgText.setText(
      'GAME OVER!\nVOCÊ NÃO TEM AURA MANO\n\nESPAÇO para recomeçar'
    );
    this.msgText.setVisible(true);

    this.physics.pause();
  }

  update(time, delta) {
    const dt = delta / 1000;

    if (!this.alive) {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.scene.restart();
      }
      return;
    }

    if (!this.gameStarted) {
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        this.gameStarted = true;
        this.msgText.setVisible(false);
      }
      return;
    }

    // chão andando
    this.groundGroup.getChildren().forEach(tile => {
      tile.x -= this.speed * dt;

      if (tile.x + TILE_W < 0) {
        const rightmost = this.groundGroup.getChildren().reduce((max, t) => t.x > max.x ? t : max);
        tile.x = rightmost.x + TILE_W;
      }
    });

    // spawn inimigos
    if (time > this.enemySpawnTimer + this.enemySpawnDelay) {
      this.spawnEnemy();
      this.enemySpawnTimer = time;
      this.enemySpawnDelay = Phaser.Math.Between(800, 1600);
    }

    // spawn fruta
    if (!this.fruit && time > this.fruitSpawnTimer + this.fruitSpawnDelay) {
      this.spawnFruit();
      this.fruitSpawnTimer = time;
      this.fruitSpawnDelay = Phaser.Math.Between(3000, 6000);
    }

    // pulo duplo
    if (this.player.body.blocked.down) {
      this.jumpCount = 0;
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.jumpCount < this.maxJumps) {
      this.player.setVelocityY(JUMP_VELOCITY);
      this.jumpSound.play();
      this.jumpCount++;
    }

    // inimigos andando + score
    this.enemies.getChildren().forEach(enemy => {
      enemy.setVelocityX(-this.speed);

      if (enemy.x < PLAYER_X && !enemy.passed) {
        enemy.passed = true;

        this.score += 10;
        this.scoreText.setText('score: ' + this.score);

        this.speed += SPEED_INCREMENT * 0.5;
        this.levelText.setText('vel: ' + Math.floor(this.speed));
      }

      if (enemy.x < -100) {
        enemy.destroy();
      }
    });

    // fruta andando
    if (this.fruit) {
      this.fruit.setVelocityX(-this.speed);

      if (this.fruit.x < -50) {
        this.fruit.destroy();
        this.fruit = null;
      }
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width:  GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [GameScene]
};

new Phaser.Game(config);