window.addEventListener("DOMContentLoaded", () => {

    new Game('game-canvas');
});


class Game {
    constructor(canvasId) {

        let canvas          = document.getElementById(canvasId);
        this.engine         = new BABYLON.Engine(canvas, true);

        // Contains all loaded assets needed for this state
        this.assets         = [];

        // The state scene
        this.scene          = null;
        this.spinForce = null;

        // Resize window event
        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        this.run();

    }

    run() {

        BABYLON.SceneLoader.Load('assets/', 'kicker.babylon', this.engine, (scene) => {
            this.scene = scene;

            // init camera
            let camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(-35,10,-7), this.scene);
            let net = this.scene.getMeshByName('net'); 
            camera.setTarget(net.position);
            camera.attachControl(this.scene.getEngine().getRenderingCanvas());
            this.scene.activeCamera = camera;

            this.scene.executeWhenReady(() => {

                this.engine.runRenderLoop(() => {
                    this.scene.render();
                });
            });

            // Load first level
            this._initGame();
            this._initGui();
        })
    }

    _initGui() {
        // load texture
        let texture = new BABYLON.Texture('assets/ball.png', this.scene, null, null ,null, () => {

            var gui = new bGUI.GUISystem(this.scene);
            var ball = new bGUI.GUIPanel("ball", texture, null, gui);
            ball.relativePosition(new BABYLON.Vector3(0.60, 0.75, 0));
            gui.updateCamera();


            let delta = null;

            let eventPrefix = BABYLON.Tools.GetPointerPrefix();
            this.scene.getEngine().getRenderingCanvas().addEventListener(eventPrefix + "down", () => {

                let pickInfo = this.scene.pick(
                    this.scene.pointerX,
                    this.scene.pointerY,
                    null,
                    gui.getCamera()
                );

                if (pickInfo.hit){
                    delta = ball.mesh.position.subtract(pickInfo.pickedPoint);
                    delta = delta.divide(ball.mesh.scaling).scaleInPlace(2).scaleInPlace(4);
                    delta.y *= 3;
                    delta.z = 0;
                }
            });

            let y = (x) => {return 0.125*(-x*x +5*x)};

            this.scene.getEngine().getRenderingCanvas().addEventListener(eventPrefix + "up", () => {
                if (delta) {
                    this.spinForce = delta.clone();
                    let ball = this.scene.getMeshByName('ball');
                    ball.applyImpulse(new BABYLON.Vector3(0, this.spinForce.y, 20), ball.position);

                    this.spinForce.z = this.spinForce.y = 0;

                    let counter = 0;

                    let t = new Timer(100, this.scene, {autostart:true, autodestroy:true, immediate:true, repeat:10});
                    t.callback = () => {
                        ball.applyImpulse(this.spinForce.scale(y(counter)), ball.position);
                        counter += 0.4;
                    };
                    t.onFinish = () => {
                        this.spinForce = null;
                    };
                    delta = null;
                }
            });
        });


    }
    
    playSound(sound) {
        
    }

    _initGame() {
        this.scene.debugLayer.show();

        this.scene.enablePhysics(); // default gravity and default physics engine

        let ball = this.scene.getMeshByName('ball');
        ball.isInGoal = false;
        let body0 = this.scene.getMeshByName('body0');
        
        ball.body = ball.setPhysicsState(BABYLON.PhysicsEngine.SphereImpostor, { mass: 0.410, friction: 0.2, restitution: 0.8 })

        // Reduce the ball speed when it is on the ground
        this.scene.registerBeforeRender(() => {
            if (ball.position.y <= 0.11){
                ball.body.body.linearVelocity.scaleEqual(0.97);
            }
        });
        
        // Remove physics force on the ball when in the goal
        this.scene.registerBeforeRender(() => { 
            if (body0.intersectsMesh(ball) && !ball.isInGoal) {
                if (this.spinForce) {
                    this.spinForce.copyFromFloats(0,0,0);
                }
                ball.body.body.linearVelocity.scaleEqual(0);
                ball.body.body.angularVelocity.scaleEqual(0);
                ball.isInGoal = true; 
            }
        });
        
        // Animate wall in front of the goal
        let wall = this.scene.getMeshByName('wall');
        let alpha = 0;        
        this.scene.registerBeforeRender(() => { 
            wall.position.x += 0.025*Math.cos(alpha);
            alpha += 0.01;
            wall.updatePhysicsBodyPosition();
        });
    }
}
