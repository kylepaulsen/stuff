/**
 * @author Kyle Paulsen http://www.kylepaulsen.com
 * Based off of James Baicoianu's ( http://www.baicoianu.com/ ) FlyControls.
 */

THREE.SpaceFlyControls = function(camera) {
    this.camera = camera;

    // API
    this.movementSpeed = 0.2; // this is something like 20f/s/s or 6m/s/s
    this.rollSpeed = 0.5;
    this.lookSpeed = 3;
    this.enabled = true;
    this.mode = 2;
    this.modes = {
        extraStable: 2,
        normal: 1,
        noStabilization: 0
    };

    // internals
    this.tmpQuaternion = new THREE.Quaternion();
    this.moveVector = new THREE.Vector3(0, 0, 0);
    this.rotationVector = new THREE.Vector3(0, 0, 0);
    this.internalRotationQuat = new THREE.Quaternion();
    this.internalRotationEuler = new THREE.Euler(0, 0, 0);

    var keysDown = {};
    var codeToChar = {
        "87": "w",
        "65": "a",
        "83": "s",
        "68": "d",
        "82": "r",
        "70": "f",
        "81": "q",
        "69": "e",
        "32": "space",
        "16": "lshift",
        "37": "left",
        "38": "up",
        "39": "right",
        "40": "down"
    };

    this.keydown = function(event) {
        if (event.altKey) {
            return;
        }

        keysDown[codeToChar[event.keyCode]] = true;
    };

    this.keyup = function(event) {
        keysDown[codeToChar[event.keyCode]] = false;
    };

    this.mousemove = function(event) {
        if (this.enabled === false) {
            return;
        }

        var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        if (this.mode > this.modes.noStabilization) {
            this.rotationVector.y = -movementX / 200;
            this.rotationVector.x = -movementY / 200;
        } else {
            this.rotationVector.y += -movementX / 4000;
            this.rotationVector.x += -movementY / 4000;
        }
    };

    var moveUpdateVector = new THREE.Vector3(0, 0, 0);

    this.update = function(delta) {
        var moveMult = delta * this.movementSpeed;
        var rotMult = delta * this.rollSpeed;
        var lookMult = delta * this.lookSpeed;
        var internalRotation = new THREE.Vector3(0, 0, 0);
        var shouldUpdateMovementVec = false;
        moveUpdateVector.set(0, 0, 0);

        if (keysDown.w) {
            moveUpdateVector.z += 1; // this is roughly 0.1 m/s
            shouldUpdateMovementVec = true;
        }
        if (keysDown.s) {
            moveUpdateVector.z -= 1;
            shouldUpdateMovementVec = true;
        }
        if (keysDown.a) {
            moveUpdateVector.x += 1;
            shouldUpdateMovementVec = true;
        }
        if (keysDown.d) {
            moveUpdateVector.x -= 1;
            shouldUpdateMovementVec = true;
        }
        if (keysDown.r || keysDown.space) {
            moveUpdateVector.y -= 1;
            shouldUpdateMovementVec = true;
        }
        if (keysDown.f || keysDown.lshift) {
            moveUpdateVector.y += 1;
            shouldUpdateMovementVec = true;
        }
        if (keysDown.q) {
            if (this.mode > this.modes.noStabilization) {
                this.rotationVector.z += 1;
            } else {
                this.rotationVector.z += 0.05;
            }
        }
        if (keysDown.e) {
            if (this.mode > this.modes.noStabilization) {
                this.rotationVector.z -= 1;
            } else {
                this.rotationVector.z -= 0.05;
            }
        }
        if (shouldUpdateMovementVec) {
            moveUpdateVector.applyQuaternion(this.camera.quaternion).normalize();
            this.moveVector.z -= moveUpdateVector.z;
            this.moveVector.x -= moveUpdateVector.x;
            this.moveVector.y -= moveUpdateVector.y;

            // apply maximum speed.
            var moveVecMagnitude = this.moveVector.length();
            var maxSpeed = 1500;
            if (moveVecMagnitude > maxSpeed) {
                this.moveVector.x *= maxSpeed / moveVecMagnitude;
                this.moveVector.y *= maxSpeed / moveVecMagnitude;
                this.moveVector.z *= maxSpeed / moveVecMagnitude;
            }
        } else {
            if (this.mode === this.modes.extraStable) {
                this.moveVector.multiplyScalar(0.99);
            }
        }
        /*
        if (keysDown.left) {
            internalRotation.y = 0.01;
            this.internalRotationEuler.y -= internalRotation.y * 2;
        }
        if (keysDown.right) {
            internalRotation.y = -0.01;
            this.internalRotationEuler.y -= internalRotation.y * 2;
        }
        if (keysDown.up) {
            internalRotation.x = 0.01;
            this.internalRotationEuler.x -= internalRotation.x * 2;
        }
        if (keysDown.down) {
            internalRotation.x = -0.01;
            this.internalRotationEuler.x -= internalRotation.x * 2;
        }
        this.internalRotationQuat.setFromEuler(this.internalRotationEuler);
        */

        // update the temp quaternion to avoid gimbal lock.
        //this.tmpQuaternion.set(this.rotationVector.x * lookMult, this.rotationVector.y * lookMult, this.rotationVector.z * rotMult, 1).normalize();
        this.tmpQuaternion.set(this.rotationVector.x * lookMult + internalRotation.x, this.rotationVector.y * lookMult, this.rotationVector.z * rotMult, 1).normalize();

        // apply the camera rotation.
        this.camera.quaternion.multiply(this.tmpQuaternion);

        // expose the rotation vector for convenience
        this.camera.rotation.setFromQuaternion(this.camera.quaternion, this.camera.rotation.order);

        if (this.mode > this.modes.noStabilization) {
            // this prevents the camera from spinning like crazy.
            this.rotationVector.x = 0;
            this.rotationVector.y = 0;

            // stop the camera from rotating forever.
            this.rotationVector.z = 0;
        }

        // keep the camera moving in the same direction as its moveVector.
        var newMoveVector = this.moveVector.clone();
        var inverseCamQuat = (this.camera.quaternion.clone()).inverse();

        newMoveVector.applyQuaternion(inverseCamQuat);

        //var cameraDistFromOrigin = camera.position.length();
        //var spaceBendingRadiusSquared = 100000000;
        var spaceBending = 1;//(spaceBendingRadiusSquared - (cameraDistFromOrigin * cameraDistFromOrigin)) / spaceBendingRadiusSquared;

        // calculate final move vector.
        newMoveVector.multiplyScalar(moveMult * spaceBending);

        this.camera.translateX(newMoveVector.x);
        this.camera.translateY(newMoveVector.y);
        this.camera.translateZ(newMoveVector.z);
    };

    function bind(scope, fn) {
        return function() {
            fn.apply(scope, arguments);
        };
    }

    document.addEventListener('contextmenu', function(event) { event.preventDefault(); }, false);
    document.addEventListener('mousemove', bind(this, this.mousemove), false);
    document.addEventListener('keydown', bind(this, this.keydown), false);
    document.addEventListener('keyup', bind(this, this.keyup), false);
};
