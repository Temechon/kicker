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

        // Contains all loaded assets needed for this state
        this.assets = [];

        // The state scene
        this.scene = null;
        this.spinForce = null;

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

            BABYLON.SceneLoader.Load('assets/', 'kicker.babylon', this.engine, function (scene) {
                _this2.scene = scene;

                // init camera
                var camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(-35, 10, -7), _this2.scene);
                var net = _this2.scene.getMeshByName('net');
                camera.setTarget(net.position);
                camera.attachControl(_this2.scene.getEngine().getRenderingCanvas());
                _this2.scene.activeCamera = camera;

                _this2.scene.executeWhenReady(function () {

                    _this2.engine.runRenderLoop(function () {
                        _this2.scene.render();
                    });
                });

                // Load first level
                _this2._initGame();
                _this2._initGui();
            });
        }
    }, {
        key: "_initGui",
        value: function _initGui() {
            var _this3 = this;

            // load texture
            var texture = new BABYLON.Texture('assets/ball.png', this.scene, null, null, null, function () {

                var gui = new bGUI.GUISystem(_this3.scene);
                var ball = new bGUI.GUIPanel("ball", texture, null, gui);
                ball.relativePosition(new BABYLON.Vector3(0.60, 0.75, 0));
                gui.updateCamera();

                var delta = null;

                var eventPrefix = BABYLON.Tools.GetPointerPrefix();
                _this3.scene.getEngine().getRenderingCanvas().addEventListener(eventPrefix + "down", function () {

                    var pickInfo = _this3.scene.pick(_this3.scene.pointerX, _this3.scene.pointerY, null, gui.getCamera());

                    if (pickInfo.hit) {
                        delta = ball.mesh.position.subtract(pickInfo.pickedPoint);
                        delta = delta.divide(ball.mesh.scaling).scaleInPlace(2).scaleInPlace(4);
                        delta.y *= 3;
                        delta.z = 0;
                    }
                });

                var y = function y(x) {
                    return 0.125 * (-x * x + 5 * x);
                };

                _this3.scene.getEngine().getRenderingCanvas().addEventListener(eventPrefix + "up", function () {
                    if (delta) {
                        (function () {
                            _this3.spinForce = delta.clone();
                            var ball = _this3.scene.getMeshByName('ball');
                            ball.applyImpulse(new BABYLON.Vector3(0, _this3.spinForce.y, 20), ball.position);

                            _this3.spinForce.z = _this3.spinForce.y = 0;

                            var counter = 0;

                            var t = new Timer(100, _this3.scene, { autostart: true, autodestroy: true, immediate: true, repeat: 10 });
                            t.callback = function () {
                                ball.applyImpulse(_this3.spinForce.scale(y(counter)), ball.position);
                                counter += 0.4;
                            };
                            t.onFinish = function () {
                                _this3.spinForce = null;
                            };
                            delta = null;
                        })();
                    }
                });
            });
        }
    }, {
        key: "playSound",
        value: function playSound(sound) {}
    }, {
        key: "_initGame",
        value: function _initGame() {
            var _this4 = this;

            this.scene.debugLayer.show();

            this.scene.enablePhysics(); // default gravity and default physics engine

            var ball = this.scene.getMeshByName('ball');
            ball.isInGoal = false;
            var body0 = this.scene.getMeshByName('body0');

            ball.body = ball.setPhysicsState(BABYLON.PhysicsEngine.SphereImpostor, { mass: 0.410, friction: 0.2, restitution: 0.8 });

            // Reduce the ball speed when it is on the ground
            this.scene.registerBeforeRender(function () {
                if (ball.position.y <= 0.11) {
                    ball.body.body.linearVelocity.scaleEqual(0.97);
                }
            });

            // Remove physics force on the ball when in the goal
            this.scene.registerBeforeRender(function () {
                if (body0.intersectsMesh(ball) && !ball.isInGoal) {
                    if (_this4.spinForce) {
                        _this4.spinForce.copyFromFloats(0, 0, 0);
                    }
                    ball.body.body.linearVelocity.scaleEqual(0);
                    ball.body.body.angularVelocity.scaleEqual(0);
                    ball.isInGoal = true;
                }
            });

            // Animate wall in front of the goal
            var wall = this.scene.getMeshByName('wall');
            var alpha = 0;
            this.scene.registerBeforeRender(function () {
                wall.position.x += 0.025 * Math.cos(alpha);
                alpha += 0.01;
                wall.updatePhysicsBodyPosition();
            });
        }
    }]);

    return Game;
})();
//# sourceMappingURL=Game.js.map
