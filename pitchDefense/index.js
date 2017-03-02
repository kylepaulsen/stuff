(function() {

    /* global Phaser, waveletPitch, co */
    const width = 506;
    const height = 810;
    const rad2ang = 180 / Math.PI;
    let game;

    let audioContext;
    let bg;
    let rockets;
    let explosions;
    let ui;
    let score;
    let scoreText;
    let soundWaves;
    let soundWaveDiameters = [];

    const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const freqs = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392, 415.30, 440, 466.16, 493.88];

    let gameState = 'micSetup';
    let playPitchHint = true;
    let maxRocketWaitTime = 7000;
    let rocketWaitTime = maxRocketWaitTime;
    let currentSingingNote;

    const maxRockets = 10;
    const rocketSpeed = 50;
    const rocketMaxLife = 50;

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function addTween(what, toArgs) {
        return new Promise(function(res) {
            const tween = game.add.tween(what);
            tween.to.apply(tween, toArgs);
            tween.onComplete.add(res);
        });
    }

    function sleep(ms) {
        return new Promise(function(res) {
            setTimeout(res, ms);
        });
    }

    function getNoteIndex() {
        return randInt(0, noteStrings.length - 1);
    }

    function fireRocket() {
        const rocket = rockets.getFirstExists(false);
        if (rocket) {
            const noteIdx = getNoteIndex();
            rocket.note = noteStrings[noteIdx];
            rocket.noteText.setText(rocket.note);
            if (playPitchHint) {
                playFreq(freqs[noteIdx]);
            }

            rocket.life = rocketMaxLife;
            rocket.updateLifeBar();
            rocket.exploding = false;
            const xPos = randInt(10, width - 10);
            if (xPos < width / 2) {
                rocket.noteText.angle = 90;
                rocket.noteText.x = -2;
            } else {
                rocket.noteText.angle = -90;
                rocket.noteText.x = 3;
            }

            // HACK to get around this problem:
            // https://github.com/photonstorm/phaser/issues/2995
            rocket.alpha = 0;
            setTimeout(function() {
                rocket.alpha = 1;
            }, 100);

            rocket.reset(xPos, -60);
            let xMidDiff = width / 2 - xPos;
            if (!xMidDiff) {
                xMidDiff = 1;
            }
            let angle = Math.atan((height - rocket.body.y - 250) / xMidDiff) * rad2ang + 90;
            if (angle > 90) {
                angle += 180;
            }
            rocket.angle = angle;
            game.physics.arcade.velocityFromAngle(rocket.angle + 90, rocketSpeed, rocket.body.velocity);
        }
    }

    const startGame = co.wrap(function*() {
        if (gameState === 'menu') {
            gameState = 'setup';
            playPitchHint = true;
            rocketWaitTime = maxRocketWaitTime;
            score = 0;
            scoreText.setText('Score: ' + score);

            yield addTween(ui, [{alpha: 0}, 1000, 'Linear', true]);
            ui.y = -height;
            yield Promise.all([
                addTween(bg, [{y: -height}, 2000, 'Linear', true]),
                addTween(explosions, [{y: -height}, 2000, 'Linear', true])
            ]);
            gameState = 'playing';
            yield sleep(2000);
            while (gameState === 'playing') {
                fireRocket();
                yield sleep(rocketWaitTime);
            }
        } else if (gameState === 'micSetup') {
            alert('Please grant this page microphone access.');
        }
    });

    const createExplosion = co.wrap(function*(x, y, speed) {
        speed = speed || 100;
        const fire = game.add.sprite(x, y + height, 'particle');
        explosions.add(fire);
        fire.alpha = 0;
        fire.anchor.x = 0.5;
        fire.anchor.y = 0.5;
        fire.scale.x = 0.1;
        fire.scale.y = 0.1;
        yield sleep(100);
        fire.alpha = 1;
        yield addTween(fire.scale, [{x: 1, y: 1}, speed, 'Linear', true]);
        yield addTween(fire, [{alpha: 0}, speed, 'Linear', true]);
        fire.destroy();
    });

    const blowUpSpeaker = co.wrap(function*() {
        const minY = 510;
        const maxY = 700;
        const minX = 220;
        const maxX = 280;

        for (let x = 0; x < 30; x++) {
            createExplosion(randInt(minX, maxX), randInt(minY, maxY), 300);
            yield sleep(100);
        }
    });

    const resetGame = co.wrap(function*() {
        rockets.forEachAlive(function(rocket) {
            rocket.explode();
        });
        yield sleep(2000);
        ui.alpha = 1;
        yield Promise.all([
            addTween(bg, [{y: 0}, 2000, 'Linear', true]),
            addTween(ui, [{y: 0}, 2000, 'Linear', true]),
            addTween(explosions, [{y: 0}, 2000, 'Linear', true])
        ]);
        gameState = 'menu';
    });


    /* ===================== Main Phaser Functions ===================== */


    function preload() {
        // game.load.crossOrigin = 'Anonymous';
        game.load.image('bg', 'img/bg.png');
        game.load.image('title', 'img/title.png');
        game.load.image('startBtn', 'img/startBtn.png');
        game.load.image('help', 'img/help.png');
        game.load.image('rocket', 'img/rocket.png');
        game.load.image('particle', 'img/particle.png');
    }

    function create() {
        //game.time.advancedTiming = true;
        game.tweens.frameBased = true;
        game.stage.disableVisibilityChange = true;
        game.scale.scaleMode = Phaser.ScaleManager.USER_SCALE;
        game.scale.setResizeCallback(function() {
            const pixRatio = window.devicePixelRatio || 1;
            const s = Math.min(pixRatio * window.innerHeight / height, 1);
            game.scale.setUserScale(s, s);
        });

        bg = game.add.sprite(0, 0, 'bg');

        ui = game.add.group();
        ui.add(game.add.sprite(5, 100, 'title'));
        ui.add(game.add.button(80, 410, 'startBtn', startGame));
        ui.add(game.add.sprite(18, 600, 'help'));

        scoreText = game.add.text(180, 750, 'Score: 0');
        scoreText.fill = '#ffffff';

        rockets = game.add.group();
        rockets.enableBody = true;
        rockets.physicsBodyType = Phaser.Physics.ARCADE;
        rockets.createMultiple(maxRockets, 'rocket');
        rockets.setAll('anchor.x', 0.5);
        rockets.setAll('anchor.y', 1);
        rockets.forEach(function(rocket) {
            const emitter = game.add.emitter(0, -70, 20);
            emitter.makeParticles('particle');
            emitter.gravity = 0;
            emitter.maxParticleScale = 0.1;
            emitter.minParticleScale = 0.1;
            emitter.setXSpeed(-20, 20);
            emitter.setYSpeed(-50, -30);
            emitter.start(false, 500, 50);
            rocket.addChild(emitter);

            rocket.explode = co.wrap(function*() {
                if (!rocket.exploding) {
                    rocket.exploding = true;
                    createExplosion(rocket.x, rocket.y, 300);
                    yield sleep(300);
                    rocket.kill();
                }
            });

            const graphics = game.add.graphics(-25, -60);
            rocket.addChild(graphics);
            rocket.updateLifeBar = function() {
                const lifePercent = rocket.life / rocketMaxLife;
                graphics.clear();
                let color = 0x00FF00;
                if (lifePercent < 0.5) {
                    color = 0xFFFF00;
                }
                if (lifePercent < 0.25) {
                    color = 0xFF0000;
                }
                graphics.beginFill(color);
                graphics.drawRect(0, 0, 5, 50 * lifePercent);
                graphics.endFill();
            };

            const noteText = game.add.text(-2, -40, 'A', {fontSize: 12});
            noteText.fill = '#FFFFFF';
            noteText.angle = 90;
            noteText.anchor.x = 0.5;
            noteText.anchor.y = 0.5;
            rocket.addChild(noteText);
            rocket.noteText = noteText;

        }, this);

        soundWaves = game.add.graphics(0, 0);
        explosions = game.add.group();

        setUpMicrophone();
    }

    function update() {
        rockets.forEachAlive(function(rocket) {
            if (gameState === 'playing') {
                if (rocket.y > 510) {
                    gameState = 'gameover';
                    rocket.explode();
                    blowUpSpeaker();
                    resetGame();
                    return;
                }
                if (rocket.y > 0 && rocket.note === currentSingingNote) {
                    rocket.life = Math.max(rocket.life - 1, 0);
                    rocket.updateLifeBar();
                    if (rocket.life === 0 && !rocket.exploding) {
                        score += 10;
                        scoreText.setText('Score: ' + score);
                        rocket.explode();

                        rocketWaitTime = Math.max(1000, maxRocketWaitTime - score * 15);
                        if (score > 500) {
                            playPitchHint = false;
                        }
                    }
                }
            } else {
                rocket.explode();
            }
        });
    }

    function render() {
        soundWaves.clear();
        soundWaveDiameters = soundWaveDiameters.map(function(diameter, idx, arr) {
            const x = width / 2;
            soundWaves.lineStyle(5, 0xFFFFFF, 0.05);
            soundWaves.drawCircle(x, 546, diameter);
            soundWaves.lineStyle(10, 0xFFFFFF, 0.1);
            soundWaves.drawCircle(x, 632, diameter);
            const newVal = diameter + 10;
            arr[idx] = newVal;
            return newVal;
        }).filter(function(diameter) {
            return diameter < 1400;
        });
    }

    game = new Phaser.Game(width, height, Phaser.AUTO, document.body,
        {preload: preload, create: create, update: update, render: render});


    // Audio Stuff

    const getNote = (function() {
        const A4 = 440;
        const r = -12 / Math.log(2);
        const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        return function(f) {
            // the +57 gets you to an A4 index.
            const steps = Math.round(r * Math.log(A4 / f)) + 57;
            //const level = Math.floor(steps / 12);
            let stepsModded = steps % 12;
            if (stepsModded < 0) {
                stepsModded += 12;
            }
            return noteStrings[stepsModded];// + level;
        };
    })();

    function setUpMicrophone() {
        audioContext = new AudioContext();

        const lowestPitch = 40; //in hz.
        const targetBufferSize = waveletPitch.neededSampleCount(lowestPitch);

        waveletPitch.setSampleRate(audioContext.sampleRate);
        navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
            const source = audioContext.createMediaStreamSource(stream);
            const node = audioContext.createScriptProcessor(targetBufferSize, 2, 2);
            let soundWaveTime = 0;
            node.onaudioprocess = function(e) {
                const samples = e.inputBuffer.getChannelData(0);
                let pitch = waveletPitch.computePitch(samples, 0, samples.length);

                const confidence = waveletPitch.getConfidence();
                if (pitch && confidence > 3) {
                    currentSingingNote = getNote(pitch);
                    const now = Date.now();
                    if (now - soundWaveTime > 333 && confidence > 5 && gameState === 'playing') {
                        soundWaveDiameters.push(10);
                        soundWaveTime = now;
                    }
                    //console.log('Found a pitch:', pitch, 'note:', currentSingingNote,
                        //'confidence:', waveletPitch.getConfidence());
                } else {
                    currentSingingNote = undefined;
                }
            };

            source.connect(node);
            node.connect(audioContext.destination);
            gameState = 'menu';
        }).catch(function() {
            alert('Sorry... This game requires a microphone.');
            gameState = 'unplayable';
        });
    }

    function playFreq(freq) {
        var oscillator = audioContext.createOscillator();

        oscillator.frequency.value = freq; // value in hertz
        oscillator.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1);
    }
})();
