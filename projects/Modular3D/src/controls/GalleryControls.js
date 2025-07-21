import * as THREE from 'three';
import { ControlSystem } from './ControlSystem';

/**
 * Gallery Controls - Smooth navigation between fixed viewpoints
 * Great for: Product showcases, art galleries, presentation systems
 * 
 * Features:
 * - Smooth transitions between predefined viewpoints
 * - Mouse wheel to cycle through views
 * - Click on objects to focus
 * - Automatic rotation option
 */
export class GalleryControls extends ControlSystem {
    constructor(camera, domElement) {
        super(camera, domElement);
        
        // Viewpoints
        this.viewpoints = [];
        this.currentViewIndex = 0;
        
        // Transition settings
        this.transitionDuration = 1.5; // seconds
        this.transitionEasing = 'easeInOutCubic';
        
        // Auto-rotate settings
        this.autoRotate = false;
        this.autoRotateSpeed = 0.5;
        this.autoRotateDelay = 3.0; // seconds before auto-rotate starts
        
        // Interaction settings
        this.enableZoom = true;
        this.zoomSpeed = 1.0;
        this.minDistance = 1;
        this.maxDistance = 100;
        
        // Internal state
        this.isTransitioning = false;
        this.transitionStart = null;
        this.transitionFrom = null;
        this.transitionTo = null;
        this.idleTime = 0;
        this.targetDistance = 10;
        
        // Raycaster for object selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }
    
    init() {
        // Mouse events
        this.addEventListener(this.domElement, 'click', this.onClick);
        this.addEventListener(this.domElement, 'wheel', this.onWheel);
        this.addEventListener(this.domElement, 'mousemove', this.onMouseMove);
        
        // Touch events
        this.addEventListener(this.domElement, 'touchstart', this.onTouchStart);
        this.addEventListener(this.domElement, 'touchmove', this.onTouchMove);
        
        // Keyboard shortcuts
        this.addEventListener(document, 'keydown', this.onKeyDown);
    }
    
    // Add a viewpoint
    addViewpoint(position, target, name = '') {
        this.viewpoints.push({
            position: position.clone(),
            target: target.clone(),
            name: name,
            distance: position.distanceTo(target)
        });
    }
    
    // Add viewpoints for all objects in a group
    addObjectViewpoints(group, distance = 5) {
        group.traverse(child => {
            if (child.isMesh) {
                const box = new THREE.Box3().setFromObject(child);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                
                const position = center.clone();
                position.z += maxDim * distance;
                position.y += maxDim * 0.5;
                
                this.addViewpoint(position, center, child.name || 'Object');
            }
        });
    }
    
    // Go to specific viewpoint
    goToViewpoint(index, immediate = false) {
        if (index < 0 || index >= this.viewpoints.length) return;
        if (this.isTransitioning) return;
        
        const viewpoint = this.viewpoints[index];
        this.currentViewIndex = index;
        
        if (immediate) {
            this.camera.position.copy(viewpoint.position);
            this.camera.lookAt(viewpoint.target);
            this.targetDistance = viewpoint.distance;
        } else {
            this.startTransition(viewpoint);
        }
        
        // Reset idle time
        this.idleTime = 0;
        
        // Dispatch event
        this.domElement.dispatchEvent(new CustomEvent('viewpointchange', {
            detail: { index, viewpoint }
        }));
    }
    
    // Start smooth transition
    startTransition(viewpoint) {
        this.isTransitioning = true;
        this.transitionStart = Date.now();
        
        this.transitionFrom = {
            position: this.camera.position.clone(),
            quaternion: this.camera.quaternion.clone(),
            distance: this.targetDistance
        };
        
        // Calculate target rotation
        const tempCamera = this.camera.clone();
        tempCamera.position.copy(viewpoint.position);
        tempCamera.lookAt(viewpoint.target);
        
        this.transitionTo = {
            position: viewpoint.position.clone(),
            quaternion: tempCamera.quaternion.clone(),
            distance: viewpoint.distance
        };
    }
    
    // Navigation methods
    nextViewpoint() {
        const next = (this.currentViewIndex + 1) % this.viewpoints.length;
        this.goToViewpoint(next);
    }
    
    previousViewpoint() {
        const prev = (this.currentViewIndex - 1 + this.viewpoints.length) % this.viewpoints.length;
        this.goToViewpoint(prev);
    }
    
    // Event handlers
    onClick(event) {
        if (!this.enabled || this.isTransitioning) return;
        
        // Update mouse coordinates
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast to find clicked objects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // This should be configured with selectable objects
        const intersects = this.raycaster.intersectObjects([], true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            const point = intersects[0].point;
            
            // Create dynamic viewpoint for clicked object
            const distance = this.camera.position.distanceTo(point);
            const direction = new THREE.Vector3().subVectors(this.camera.position, point).normalize();
            const newPosition = point.clone().add(direction.multiplyScalar(distance * 0.5));
            
            this.startTransition({
                position: newPosition,
                target: point,
                distance: distance * 0.5
            });
            
            // Dispatch selection event
            this.domElement.dispatchEvent(new CustomEvent('objectselected', {
                detail: { object, point }
            }));
        }
    }
    
    onWheel(event) {
        if (!this.enabled || !this.enableZoom) return;
        event.preventDefault();
        
        if (event.ctrlKey || event.metaKey) {
            // Zoom in/out
            const delta = event.deltaY * 0.001 * this.zoomSpeed;
            this.targetDistance = THREE.MathUtils.clamp(
                this.targetDistance * (1 + delta),
                this.minDistance,
                this.maxDistance
            );
        } else {
            // Navigate viewpoints
            if (event.deltaY > 0) {
                this.nextViewpoint();
            } else {
                this.previousViewpoint();
            }
        }
    }
    
    onMouseMove(event) {
        // Reset idle timer on mouse movement
        this.idleTime = 0;
    }
    
    onKeyDown(event) {
        if (!this.enabled) return;
        
        switch(event.key) {
            case 'ArrowRight':
            case 'd':
                this.nextViewpoint();
                break;
            case 'ArrowLeft':
            case 'a':
                this.previousViewpoint();
                break;
            case ' ':
                this.autoRotate = !this.autoRotate;
                event.preventDefault();
                break;
            default:
                // Number keys for direct viewpoint access
                const num = parseInt(event.key);
                if (!isNaN(num) && num > 0 && num <= this.viewpoints.length) {
                    this.goToViewpoint(num - 1);
                }
        }
    }
    
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.touchStartX = event.touches[0].clientX;
        }
    }
    
    onTouchMove(event) {
        if (event.touches.length === 1 && this.touchStartX !== undefined) {
            const deltaX = event.touches[0].clientX - this.touchStartX;
            
            if (Math.abs(deltaX) > 50) {
                if (deltaX > 0) {
                    this.previousViewpoint();
                } else {
                    this.nextViewpoint();
                }
                this.touchStartX = undefined;
            }
        }
    }
    
    update(delta) {
        if (!this.enabled) return;
        
        // Update idle time
        this.idleTime += delta;
        
        // Handle transitions
        if (this.isTransitioning) {
            const elapsed = (Date.now() - this.transitionStart) / 1000;
            const progress = Math.min(elapsed / this.transitionDuration, 1);
            
            // Apply easing
            const t = this.easeInOutCubic(progress);
            
            // Interpolate position
            this.camera.position.lerpVectors(
                this.transitionFrom.position,
                this.transitionTo.position,
                t
            );
            
            // Interpolate rotation
            this.camera.quaternion.slerpQuaternions(
                this.transitionFrom.quaternion,
                this.transitionTo.quaternion,
                t
            );
            
            // Interpolate distance
            this.targetDistance = THREE.MathUtils.lerp(
                this.transitionFrom.distance,
                this.transitionTo.distance,
                t
            );
            
            if (progress >= 1) {
                this.isTransitioning = false;
            }
        }
        
        // Auto-rotate when idle
        if (this.autoRotate && this.idleTime > this.autoRotateDelay && !this.isTransitioning) {
            const viewpoint = this.viewpoints[this.currentViewIndex];
            if (viewpoint) {
                // Rotate around target
                const angle = this.autoRotateSpeed * delta;
                const offset = new THREE.Vector3().subVectors(this.camera.position, viewpoint.target);
                offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                this.camera.position.copy(viewpoint.target).add(offset);
                this.camera.lookAt(viewpoint.target);
            }
        }
        
        // Apply zoom
        if (this.enableZoom && !this.isTransitioning) {
            const viewpoint = this.viewpoints[this.currentViewIndex];
            if (viewpoint) {
                const direction = new THREE.Vector3().subVectors(viewpoint.target, this.camera.position).normalize();
                const currentDistance = this.camera.position.distanceTo(viewpoint.target);
                
                if (Math.abs(currentDistance - this.targetDistance) > 0.01) {
                    const newDistance = THREE.MathUtils.lerp(currentDistance, this.targetDistance, 0.1);
                    this.camera.position.copy(viewpoint.target).add(direction.multiplyScalar(-newDistance));
                }
            }
        }
    }
    
    // Easing function
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    // Utility methods
    setSelectableObjects(objects) {
        this.selectableObjects = objects;
    }
    
    getCurrentViewpoint() {
        return this.viewpoints[this.currentViewIndex];
    }
    
    getViewpointCount() {
        return this.viewpoints.length;
    }
}
