import * as THREE from 'three';
import { ControlSystem } from './ControlSystem';

/**
 * FPS Controls - First-person shooter style controls
 * Great for: Games, architectural walkthroughs, VR-like experiences
 * 
 * Controls:
 * - WASD: Move
 * - Mouse: Look around (with pointer lock)
 * - Space: Jump
 * - Shift: Run
 * - C: Crouch
 */
export class FPSControls extends ControlSystem {
    constructor(camera, domElement) {
        super(camera, domElement);
        
        // Movement settings
        this.walkSpeed = 5.0;
        this.runSpeed = 10.0;
        this.jumpHeight = 2.0;
        this.crouchHeight = 0.5;
        this.normalHeight = 1.8;
        
        // Mouse settings
        this.mouseSensitivity = 0.002;
        this.invertY = false;
        
        // Physics settings
        this.gravity = -9.8;
        this.friction = 8.0;
        this.airControl = 0.2;
        
        // State
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isGrounded = true;
        this.isRunning = false;
        this.isCrouching = false;
        this.canJump = true;
        
        // Input state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // Pointer lock
        this.isLocked = false;
        
        // Camera euler for rotation
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;
    }
    
    init() {
        // Pointer lock
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.domElement;
        });
        
        // Mouse movement
        this.addEventListener(document, 'mousemove', this.onMouseMove);
        
        // Keyboard
        this.addEventListener(document, 'keydown', this.onKeyDown);
        this.addEventListener(document, 'keyup', this.onKeyUp);
        
        // Mobile touch controls
        this.setupTouchControls();
    }
    
    onMouseMove(event) {
        if (!this.enabled || !this.isLocked) return;
        
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        this.euler.setFromQuaternion(this.camera.quaternion);
        
        this.euler.y -= movementX * this.mouseSensitivity;
        this.euler.x -= movementY * this.mouseSensitivity * (this.invertY ? -1 : 1);
        
        // Clamp vertical rotation
        this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
        
        this.camera.quaternion.setFromEuler(this.euler);
    }
    
    onKeyDown(event) {
        if (!this.enabled) return;
        
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.canJump && this.isGrounded) {
                    this.velocity.y = Math.sqrt(2 * Math.abs(this.gravity) * this.jumpHeight);
                    this.canJump = false;
                }
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isRunning = true;
                break;
            case 'KeyC':
                this.isCrouching = !this.isCrouching;
                break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
            case 'Space':
                this.canJump = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.isRunning = false;
                break;
        }
    }
    
    setupTouchControls() {
        // Virtual joystick for mobile
        let touchId = null;
        let touchStartX = 0;
        let touchStartY = 0;
        
        this.addEventListener(this.domElement, 'touchstart', (event) => {
            if (touchId === null && event.touches.length > 0) {
                const touch = event.touches[0];
                touchId = touch.identifier;
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
            }
        });
        
        this.addEventListener(this.domElement, 'touchmove', (event) => {
            if (touchId !== null) {
                for (let i = 0; i < event.touches.length; i++) {
                    const touch = event.touches[i];
                    if (touch.identifier === touchId) {
                        const deltaX = touch.clientX - touchStartX;
                        const deltaY = touch.clientY - touchStartY;
                        
                        // Convert touch delta to movement
                        this.moveForward = deltaY < -50;
                        this.moveBackward = deltaY > 50;
                        this.moveLeft = deltaX < -50;
                        this.moveRight = deltaX > 50;
                        
                        break;
                    }
                }
            }
        });
        
        this.addEventListener(this.domElement, 'touchend', (event) => {
            for (let i = 0; i < event.changedTouches.length; i++) {
                if (event.changedTouches[i].identifier === touchId) {
                    touchId = null;
                    this.moveForward = false;
                    this.moveBackward = false;
                    this.moveLeft = false;
                    this.moveRight = false;
                    break;
                }
            }
        });
    }
    
    update(delta) {
        if (!this.enabled) return;
        
        // Get movement direction
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();
        
        // Calculate desired velocity
        const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
        const desiredVelocity = new THREE.Vector3();
        
        if (this.moveForward) desiredVelocity.add(forward);
        if (this.moveBackward) desiredVelocity.sub(forward);
        if (this.moveRight) desiredVelocity.add(right);
        if (this.moveLeft) desiredVelocity.sub(right);
        
        desiredVelocity.normalize();
        desiredVelocity.multiplyScalar(speed);
        
        // Apply movement with friction
        const control = this.isGrounded ? 1.0 : this.airControl;
        const friction = this.isGrounded ? this.friction : this.friction * 0.1;
        
        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, desiredVelocity.x, friction * delta * control);
        this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, desiredVelocity.z, friction * delta * control);
        
        // Apply gravity
        this.velocity.y += this.gravity * delta;
        
        // Simple ground check (you'd want proper collision detection here)
        const groundHeight = 0;
        const currentHeight = this.isCrouching ? this.crouchHeight : this.normalHeight;
        
        if (this.camera.position.y <= groundHeight + currentHeight && this.velocity.y < 0) {
            this.camera.position.y = groundHeight + currentHeight;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
        
        // Apply velocity
        const deltaPosition = this.velocity.clone().multiplyScalar(delta);
        this.camera.position.add(deltaPosition);
        
        // Smooth height transitions
        const targetHeight = this.isCrouching ? this.crouchHeight : this.normalHeight;
        const heightDiff = targetHeight - (this.camera.position.y - groundHeight);
        if (Math.abs(heightDiff) > 0.01) {
            this.camera.position.y += heightDiff * 10 * delta;
        }
    }
    
    // Utility methods
    teleportTo(position) {
        this.camera.position.copy(position);
        this.velocity.set(0, 0, 0);
    }
    
    setGroundHeight(height) {
        this.groundHeight = height;
    }
    
    lock() {
        this.domElement.requestPointerLock();
    }
    
    unlock() {
        document.exitPointerLock();
    }
}
