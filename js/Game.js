window.addEventListener("DOMContentLoaded", () => {

    new Game('game-canvas');
});


class Game {
    constructor(canvasId) {

        let canvas          = document.getElementById(canvasId);
        this.engine         = new BABYLON.Engine(canvas, true);
        this.scene          = new BABYLON.Scene(this.engine);

        // The ball spin force
        this.spinForce = null;
        
        // All loaded sounds
        this.sounds = [];
        
        // All loaded gui textures
        this.textures = [];

        // Resize window event
        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        this.run();

    }

    run() {
        
        let loader =  new BABYLON.AssetsManager(this.scene);
        loader.addMeshTask("stadium", "", "./assets/", "kicker.babylon");
                
        // Load sounds
        let sounds = [
            {name:'ambient',    path:'assets/sounds/ambient.wav', loop:true, playOnLoaded : true, volume:0.35},
            {name:'goal',       path:'assets/sounds/goal.wav', loop:false, playOnLoaded : false, volume:1.6},
            {name:'whistle',    path:'assets/sounds/whistle.wav', loop:false, playOnLoaded : false, volume:0.75},
            {name:'whistle2',   path:'assets/sounds/whistle2.wav', loop:false, playOnLoaded : false, volume:0.75},
            {name:'kick',       path:'assets/sounds/kick.wav', loop:false, playOnLoaded : false, volume:1},
            {name:'wall',       path:'assets/sounds/wall.wav', loop:false, playOnLoaded : false, volume:1.5},
        ];
        sounds.forEach((s) => {
            let task = loader.addBinaryFileTask(s.name, s.path);
            task.onSuccess = (t) => {
                this.sounds[t.name] = new BABYLON.Sound(t.name, t.data, this.scene, () => {
                    // Set volume
                    this.sounds[t.name].setVolume(s.volume);
                    // Play on load ? useful for ambient track
                    if (s.playOnLoaded) {
                        this.sounds[t.name].play()
                    }
                }, 
                {loop: s.loop });
            }
        });
        
        // Load textures
        let texts = [
            {name:'ball',       path:'assets/gui/ball.png'},
            {name:'volume',     path:'assets/gui/volume.png'},
            {name:'mute',       path:'assets/gui/mute.png'},
        ];        
        texts.forEach((text) => {
            let task = loader.addTextureTask(text.name, text.path);
            task.onSuccess = (t) => {
                this.textures[t.name] = t.texture;
            }
        });
        
        loader.onFinish = () => {
                
            // Init scene : camera, light, skybox
            this._initScene();

            this.scene.executeWhenReady(() => {
                this.engine.runRenderLoop(() => {
                    this.scene.render();
                });
            });

            this._initGame();
            this._initGui();
        };

        loader.load();
    }
    
    
    _initScene() {   
        
        this.scene.enablePhysics(); // default gravity and default physics engine
             
        // Init light
        let h = new BABYLON.HemisphericLight('', new BABYLON.Vector3(0,1,0), this.scene);
        h.intensity += 1;

        // init camera
        let camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(-35,9.5,-7), this.scene);
        let net = this.scene.getMeshByName('net'); 
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
    }

    _initGui() {
        //Create GUI system
        var gui = new bGUI.GUISystem(this.scene);
        gui.enableClick();
        // Volume
        let volume = new bGUI.GUIPanel('vol', this.textures['volume'], null, gui);      
        volume.relativePosition(new BABYLON.Vector3(0.05,0.05,0));  
        let mute = new bGUI.GUIPanel('mute', this.textures['mute'], null, gui);      
        mute.relativePosition(new BABYLON.Vector3(0.05,0.05,0));  
        mute.setVisible(false);
        mute.onClick = () => {
            BABYLON.Engine.audioEngine.setGlobalVolume(1);
            mute.setVisible(false);
            volume.setVisible(true);
        }
        volume.onClick = () => {
            BABYLON.Engine.audioEngine.setGlobalVolume(0);
            volume.setVisible(false);
            mute.setVisible(true);
        };
        
        // Ball
        var ball = new bGUI.GUIPanel("ball", this.textures['ball'], null, gui);
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
                
                // Play kick sound
                this.sounds['kick'].play();

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
    }

    _initGame() {

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
                // Play goal sound
                this.sounds['goal'].play();
            }
        });
        
        // Animate wall in front of the goal
        let wall = this.scene.getMeshByName('wall');
        let alpha = 0;        
        this.scene.registerBeforeRender(() => { 
            wall.position.x += 0.075*Math.cos(alpha);
            alpha += 0.1;
            wall.updatePhysicsBodyPosition();
            
            if (wall.intersectsMesh(ball)) {         
                // Play wall sound
                this.sounds['wall'].play();
            }
        });
    }
}
