"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

window.addEventListener("DOMContentLoaded", function () {

    new Game('game-canvas');
});

var Game = (function () {
    function Game(canvasId) {
        var _this = this;

        _classCallCheck(this, Game);

        var canvas = document.getElementById(canvasId);
        this.engine = new BABYLON.Engine(canvas, true);
        this.scene = new BABYLON.Scene(this.engine);

        // The ball spin force
        this.spinForce = null;

        // All loaded sounds
        this.sounds = [];

        // All loaded gui textures
        this.textures = [];

        // True if the player can kick the ball, false if the ball has already been kicked
        this.canShoot = true;

        // The ball object
        this.ball = null;

        // Resize window event
        window.addEventListener("resize", function () {
            _this.engine.resize();
        });

        this.run();
    }

    _createClass(Game, [{
        key: "run",
        value: function run() {
            var _this2 = this;

            var loader = new BABYLON.AssetsManager(this.scene);
            loader.addMeshTask("stadium", "", "./assets/", "kicker.babylon");

            // Load sounds
            var sounds = [{ name: 'ambient', path: 'assets/sounds/ambient.wav', loop: true, playOnLoaded: true, volume: 0.35 }, { name: 'goal', path: 'assets/sounds/goal.wav', loop: false, playOnLoaded: false, volume: 1.6 }, { name: 'whistle', path: 'assets/sounds/whistle.wav', loop: false, playOnLoaded: false, volume: 0.75 }, { name: 'whistle2', path: 'assets/sounds/whistle2.wav', loop: false, playOnLoaded: false, volume: 0.75 }, { name: 'kick', path: 'assets/sounds/kick.wav', loop: false, playOnLoaded: false, volume: 1 }, { name: 'wall', path: 'assets/sounds/wall.wav', loop: false, playOnLoaded: false, volume: 1.5 }, { name: 'miss', path: 'assets/sounds/miss.wav', loop: false, playOnLoaded: false, volume: 1.5 }];
            sounds.forEach(function (s) {
                var task = loader.addBinaryFileTask(s.name, s.path);
                task.onSuccess = function (t) {
                    _this2.sounds[t.name] = new BABYLON.Sound(t.name, t.data, _this2.scene, function () {
                        // Set volume
                        _this2.sounds[t.name].setVolume(s.volume);
                        // Play on load ? useful for ambient track
                        if (s.playOnLoaded) {
                            _this2.sounds[t.name].play();
                        }
                    }, { loop: s.loop });
                };
            });

            // Load textures
            var texts = [{ name: 'ball', path: 'assets/gui/ball.png' }, { name: 'volume', path: 'assets/gui/volume.png' }, { name: 'mute', path: 'assets/gui/mute.png' }];
            texts.forEach(function (text) {
                var task = loader.addTextureTask(text.name, text.path);
                task.onSuccess = function (t) {
                    _this2.textures[t.name] = t.texture;
                };
            });

            loader.onFinish = function () {

                // Init scene : camera, light, skybox
                _this2._initScene();

                _this2.scene.executeWhenReady(function () {
                    _this2.engine.runRenderLoop(function () {
                        _this2.scene.render();
                    });
                });

                _this2._initGame();
                _this2._initGui();
            };

            loader.load();
        }
    }, {
        key: "_initScene",
        value: function _initScene() {

            this.scene.enablePhysics(); // default gravity and default physics engine

            // Init light
            var h = new BABYLON.HemisphericLight('', new BABYLON.Vector3(0, 1, 0), this.scene);
            h.intensity += 1;

            // init camera
            var camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(-35, 9.5, -7), this.scene);
            var net = this.scene.getMeshByName('net');
            camera.setTarget(net.position);
            camera.attachControl(this.scene.getEngine().getRenderingCanvas());

            var skybox = BABYLON.Mesh.CreateBox("skyBox", 1500.0, this.scene);
            var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
            skyboxMaterial.backFaceCulling = false;
            skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/skybox/TropicalSunnyDay", this.scene);
            skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
            skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
            skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
            skybox.material = skyboxMaterial;

            // Get the ball
            this.ball = this.scene.getMeshByName('ball');
            this.startingPosition = this.ball.position.clone();
        }
    }, {
        key: "_initGui",
        value: function _initGui() {
            var _this3 = this;

            //Create GUI system
            var gui = new bGUI.GUISystem(this.scene);
            gui.enableClick();
            // Volume
            var volume = new bGUI.GUIPanel('vol', this.textures['volume'], null, gui);
            volume.relativePosition(new BABYLON.Vector3(0.05, 0.05, 0));
            var mute = new bGUI.GUIPanel('mute', this.textures['mute'], null, gui);
            mute.relativePosition(new BABYLON.Vector3(0.05, 0.05, 0));
            mute.setVisible(false);
            mute.onClick = function () {
                BABYLON.Engine.audioEngine.setGlobalVolume(1);
                mute.setVisible(false);
                volume.setVisible(true);
            };
            volume.onClick = function () {
                BABYLON.Engine.audioEngine.setGlobalVolume(0);
                volume.setVisible(false);
                mute.setVisible(true);
            };

            // Ball
            var ball = new bGUI.GUIPanel("ball", this.textures['ball'], null, gui);
            ball.relativePosition(new BABYLON.Vector3(0.60, 0.75, 0));

            var delta = null;
            ball.onClick = function () {
                var pickInfo = _this3.scene.pick(_this3.scene.pointerX, _this3.scene.pointerY, null, gui.getCamera());

                if (pickInfo.hit) {
                    delta = ball.mesh.position.subtract(pickInfo.pickedPoint);
                    delta = delta.divide(ball.mesh.scaling).scaleInPlace(2).scaleInPlace(4);
                    delta.y *= 3;
                    delta.z = 0;
                }
            };

            var eventPrefix = BABYLON.Tools.GetPointerPrefix();

            // Ball curl function
            var y = function y(x) {
                return 0.125 * (-x * x + 5 * x);
            };

            this.scene.getEngine().getRenderingCanvas().addEventListener(eventPrefix + "up", function () {
                if (delta && _this3.canShoot) {
                    (function () {
                        _this3.spinForce = delta.clone();
                        _this3.ball.applyImpulse(new BABYLON.Vector3(0, _this3.spinForce.y, 30), _this3.ball.position.subtract(delta));

                        // Play kick sound
                        _this3.sounds['kick'].play();

                        _this3.spinForce.z = _this3.spinForce.y = 0;

                        var counter = 0;

                        var t = new Timer(100, _this3.scene, { autostart: true, autodestroy: true, immediate: true, repeat: 10 });
                        t.callback = function () {
                            if (_this3.spinForce) {
                                _this3.ball.applyImpulse(_this3.spinForce.scale(y(counter)), _this3.ball.position);
                                counter += 0.4;
                            }
                        };
                        t.onFinish = function () {
                            _this3.spinForce = null;
                        };
                        _this3.canShoot = false;
                        delta = null;
                    })();
                }
            });

            gui.updateCamera();
        }

        /**
         * Reset the ball at its starting position.
         */
    }, {
        key: "resetBall",
        value: function resetBall() {
            this.ball.isInGoal = false;
            this.ball.isOut = false;
            this.spinForce = null;

            this.ball.position.copyFrom(this.startingPosition);
            this.ball.updatePhysicsBodyPosition();
            this.ball.body.body.linearVelocity.scaleEqual(0);
            this.ball.body.body.angularVelocity.scaleEqual(0);
            this.canShoot = true;
        }
    }, {
        key: "_initGame",
        value: function _initGame() {
            var _this4 = this;

            this.ball.body = this.ball.setPhysicsState(BABYLON.PhysicsEngine.SphereImpostor, { mass: 0.410, friction: 0.2, restitution: 0.8 });

            // Reduce the ball speed when it is on the ground
            this.scene.registerBeforeRender(function () {
                if (_this4.ball.position.y <= 7.6) {
                    _this4.ball.body.body.linearVelocity.scaleEqual(0.97);
                }
                if (_this4.ball.position.z > 30 && !_this4.ball.isOut) {
                    _this4.ball.isOut = true;
                    // Play miss sound
                    _this4.sounds['miss'].play();
                    // reset ball position
                    setTimeout(function () {
                        _this4.resetBall();
                    }, 1200);
                }
            });

            // Remove physics force on the ball when in the goal
            var goal = this.scene.getMeshByName('body0');
            this.scene.registerBeforeRender(function () {
                if (goal.intersectsMesh(_this4.ball) && !_this4.ball.isInGoal) {
                    if (_this4.spinForce) {
                        _this4.spinForce.scaleInPlace(0);
                    }
                    _this4.ball.body.body.linearVelocity.scaleEqual(0);
                    _this4.ball.body.body.angularVelocity.scaleEqual(0);
                    _this4.ball.isInGoal = true;
                    // Play goal sound
                    _this4.sounds['goal'].play();
                    // reset ball position
                    setTimeout(function () {
                        _this4.resetBall();
                    }, 1200);
                }
            });

            // Animate wall in front of the goal
            var wall = this.scene.getMeshByName('wall');
            var alpha = 0;
            this.scene.registerBeforeRender(function () {
                // wall.position.x += 0.175*Math.cos(alpha);
                // wall.position.y += 0.075*Math.cos(alpha*1.5);
                alpha += 0.1;
                wall.updatePhysicsBodyPosition();

                if (wall.intersectsMesh(_this4.ball)) {
                    // Play wall sound
                    _this4.sounds['wall'].play();
                }
            });
        }
    }]);

    return Game;
})();
//# sourceMappingURL=Game.js.map
