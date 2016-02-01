class GameObject extends BABYLON.Mesh {
    constructor(game) {
        super("__go__", game.scene);
        this.game = game;

        // The game object is not visible
        this.isVisible = false;

        // A game object can have several children
        this._children = [];

        // tag
        BABYLON.Tags.AddTagsTo(this, "__go__");
    }

    setReady() {
        this.computeWorldMatrix(true);
        this._children.forEach(function(child) {
            child.computeWorldMatrix(true);
        });
    }

    addChildren(child) {
        child.parent = this;
        this._children.push(child);
    }

    isCollidingWith(other) {
        // If other is a gameobject, collide each children
        if (BABYLON.Tags.MatchesQuery(other, "__go__")) {
            for (var i=0; i<this._children.length; i++) {
                for (var j=0; j<other._children.length; j++) {
                    if (this._children[i].intersectsMesh(other._children[j], true)) {
                        return true;
                    }
                }
            }
        } else {
            // Otherwise, collide each children with other
            for (i=0; i<this._children.length; i++) {
                if (this._children[i].intersectsMesh(other, true)) {
                    return true;
                }
            }
        }
    }

    // Override this.material to affect all children instead
    set material(mat) {
        for (let c of this._children) {
            c.material = mat;
        }
    }

    // Overload mesh dispose() by removing all children first
    dispose() {
        for (let c of this._children) {
            c.dispose()
        }
        super.dispose();
    }

    // Each children will play the given animation.
    // The callback function will be called when all children animation are finished
    runAnim(options, callback) {

        // If animation exists
        let counter         = 0;
        let counterMax      = 0;
        let check = function() {
            counter++;
            if (counter === counterMax) {
                callback();
            }
        };

        let speed = options.speed || 1;
        let loop = options.loop || false;
        let _this = this;
        this._children.forEach(function(child) {
            if (child.skeleton || child.animations.length != 0) {
                counterMax++;
                if (typeof callback === 'undefined') {
                    _this.getScene().beginAnimation(child, options.start, options.end, loop, speed);
                } else {
                    _this.getScene().beginAnimation(child, options.start, options.end, loop, speed, check);
                }
            }
        });
    }
}