import * as THREE from 'three';

// Base class for all 3D components
export class Component3D {
    constructor() {
        this.mesh = new THREE.Group();
        this.params = {};
    }

    // Override in subclasses
    update(deltaTime) {
        // Update logic here
    }

    // Override in subclasses
    dispose() {
        // Cleanup logic here
        this.mesh.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.geometry?.dispose();
                child.material?.dispose();
            }
        });
    }

    // Helper methods
    setPosition(x, y, z) {
        this.mesh.position.set(x, y, z);
    }

    setRotation(x, y, z) {
        this.mesh.rotation.set(x, y, z);
    }

    setScale(x, y, z) {
        this.mesh.scale.set(x, y, z);
    }
}
