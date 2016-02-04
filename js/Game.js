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
            let camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0,5,33), this.scene);
            camera.setTarget(new BABYLON.Vector3(-1,-1,45));
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
                        console.log(counter);
                    };
                    t.onFinish = () => {
                        this.spinForce = null;
                    };
                    delta = null;
                }
            });
        });


    }

    _initGame() {
        this.scene.debugLayer.show();

        this.scene.enablePhysics(); // default gravity and default physics engine

        let ball = this.scene.getMeshByName('ball');
        ball.isPickable = true;
        ball.body = ball.setPhysicsState(BABYLON.PhysicsEngine.SphereImpostor, { mass: 0.410, friction: 0.2, restitution: 0.8 })

        // Reduce the ball speed when it is on the ground
        this.scene.registerBeforeRender(() => {
            if (ball.position.y <= 0.11){
                ball.body.body.linearVelocity.scaleEqual(0.97);
            }
        });
    }

    /**
     * Returns an integer in [min, max[
     */
    static randomInt(min, max) {
        if (min === max) {
            return (min);
        }
        let random = Math.random();
        return Math.floor(((random * (max - min)) + min));
    }

    static randomNumber(min, max) {
        if (min === max) {
            return (min);
        }
        let random = Math.random();
        return (random * (max - min)) + min;
    }

    /**
     * Create an instance model from the given name.
     */
    createModel(name, parent) {
        if (! this.assets[name]) {
            console.warn('No asset corresponding.');
        } else {
            if (!parent) {
                parent = new GameObject(this);
            }

            let obj = this.assets[name];
            //parent._animations = obj.animations;
            let meshes = obj.meshes;

            for (let i=0; i<meshes.length; i++ ){
                // Don't clone mesh without any vertices
                if (meshes[i].getTotalVertices() > 0) {

                    let newmesh = meshes[i].clone(meshes[i].name, null, true);
                    parent.addChildren(newmesh);

                    if (meshes[i].skeleton) {
                        newmesh.skeleton = meshes[i].skeleton.clone();
                        this.scene.stopAnimation(newmesh);
                    }
                }
            }
        }
        return parent;
    }
}
