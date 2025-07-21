import * as THREE from 'three';
import { ControlSystem } from './ControlSystem';

/**
 * Fly Controls - Smooth flying navigation like a spaceship
 * Great for: Open world exploration, space scenes, architectural walkthroughs
 * 
 * Controls:
 * - WASD: Move forward/back/left/right
 * - Q/E: Move down/up
 * - Mouse: Look around
 * - Shift: Speed boost
 * - Space: Brake
 */
export class FlyControls extends ControlSystem {
    constructor(camera, domElement) {
        super(camera, domElement);
        
        // Movement settings
        this.movementSpeed = 10.0;
        this.boostMultiplier = 3.0;
        this.rollSpeed = Math.PI / 6;
        this.dragToLook = true;
        this.autoForward = false;
        
        // Mouse sensitivity
        this.mouseSensitivity = 0.002;
        this.invertY = false;
        
        // Smoothing
        this.velocityDamping = 0.9;
        this.rotationDamping = 0.9;
        
        // Internal state
        this.velocity = new THREE.Vector3();
        this.rotationVelocity = new THREE.Euler();
        this.moveState = {
            forward: 0,
            back: 0,
            left: 0,
            right: 0,
            up: 0,
            down: 0,
            rollLeft: 0,
            rollRight: 0,
            boost: false
        };
        
        this.mouseX = 0;
        this.mouseY = 0;
        this.isMouseDown = false;
    }
    
    init() {
        // Keyboard events
        this.addEventListener(document, 'keydown', this.onKeyDown);
        this.addEventListener(document, 'keyup', this.onKeyUp);
        
        // Mouse events
        this.addEventListener(this.domElement, 'mousedown', this.onMouseDown);
        this.addEventListener(this.domElement, 'mouseup', this.onMouseUp);
        this.addEventListener(this.domElement, 'mousemove', this.onMouseMove);
        this.addEventListener(this.domElement, 'contextmenu', (e) => e.preventDefault());
        
        // Touch events for mobile
        this.addEventListener(this.domElement, 'touchstart', this.onTouchStart);
        this.addEventListener(this.domElement, 'touchmove', this.onTouchMove);
        this.addEventListener(this.domElement, 'touchend', this.onTouchEnd);
    }
    
    onKeyDown(event) {
        if (!this.enabled) return;
        
        switch (event.code) {
            case 'KeyW': this.moveState.forward = 1; break;
            case 'KeyS': this.moveState.back = 1; break;
            case 'KeyA': this.moveState.left = 1; break;
            case 'KeyD': this.moveState.right = 1; break;
            case 'KeyQ': this.moveState.down = 1; break;
            case 'KeyE': this.moveState.up = 1; break;
            case 'ArrowLeft': this.moveState.rollLeft = 1; break;
            case 'ArrowRight': this.moveState.rollRight = 1; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.moveState.boost = true; break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.moveState.forward = 0; break;
            case 'KeyS': this.moveState.back = 0; break;
            case 'KeyA': this.moveState.left = 0; break;
            case 'KeyD': this.moveState.right = 0; break;
            case 'KeyQ': this.moveState.down = 0; break;
            case 'KeyE': this.moveState.up = 0; break;
            case 'ArrowLeft': this.moveState.rollLeft = 0; break;
            case 'ArrowRight': this.moveState.rollRight = 0; break;
            case 'ShiftLeft':
            case 'ShiftRight': this.moveState.boost = false; break;
            case 'Space': 
                // Brake - quickly stop movement
                this.velocity.multiplyScalar(0.1);
                break;
        }
    }
    
    onMouseDown(event) {
        if (!this.enabled) return;
        if (this.dragToLook) {
            this.isMouseDown = true;
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
        }
    }
    
    onMouseUp(event) {
        this.isMouseDown = false;
    }
    
    onMouseMove(event) {
        if (!this.enabled) return;
        if (!this.dragToLook || this.isMouseDown) {
            const deltaX = event.clientX - this.mouseX;
            const deltaY = event.clientY - this.mouseY;
            
            this.rotationVelocity.y -= deltaX * this.mouseSensitivity;
            this.rotationVelocity.x -= deltaY * this.mouseSensitivity * (this.invertY ? -1 : 1);
            
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
        }
    }
    
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.isMouseDown = true;
            this.mouseX = event.touches[0].clientX;
            this.mouseY = event.touches[0].clientY;
        }
    }
    
    onTouchMove(event) {
        if (event.touches.length === 1 && this.isMouseDown) {
            const deltaX = event.touches[0].clientX - this.mouseX;
            const deltaY = event.touches[0].clientY - this.mouseY;
            
            this.rotationVelocity.y -= deltaX * this.mouseSensitivity * 0.5;
            this.rotationVelocity.x -= deltaY * this.mouseSensitivity * 0.5;
            
            this.mouseX = event.touches[0].clientX;
            this.mouseY = event.touches[0].clientY;
        }
    }
    
    onTouchEnd(event) {
        this.isMouseDown = false;
    }
    
    update(delta) {
        if (!this.enabled) return;
        
        const speed = this.movementSpeed * (this.moveState.boost ? this.boostMultiplier : 1);
        
        // Calculate movement vector
        const movement = new THREE.Vector3();
        movement.x = (this.moveState.right - this.moveState.left);
        movement.y = (this.moveState.up - this.moveState.down);
        movement.z = (this.moveState.back - this.moveState.forward);
        
        if (this.autoForward && movement.z === 0) {
            movement.z = -1;
        }
        
        // Apply movement in camera space
        movement.normalize();
        movement.multiplyScalar(speed * delta);
        movement.applyQuaternion(this.camera.quaternion);
        
        // Update velocity with damping
        this.velocity.add(movement);
        this.velocity.multiplyScalar(this.velocityDamping);
        
        // Apply velocity to camera position
        this.camera.position.add(this.velocity);
        
        // Apply rotation
        this.camera.rotation.x += this.rotationVelocity.x * delta;
        this.camera.rotation.y += this.rotationVelocity.y * delta;
        this.camera.rotation.z += (this.moveState.rollLeft - this.moveState.rollRight) * this.rollSpeed * delta;
        
        // Clamp pitch
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
        
        // Apply rotation damping
        this.rotationVelocity.multiplyScalar(this.rotationDamping);
    }
    
    // Configuration methods
    setMovementSpeed(speed) {
        this.movementSpeed = speed;
    }
    
    setMouseSensitivity(sensitivity) {
        this.mouseSensitivity = sensitivity;
    }
    
    setDragToLook(enabled) {
        this.dragToLook = enabled;
    }
}
