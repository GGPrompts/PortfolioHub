import * as THREE from 'three';

export class ExampleComponent {
    constructor() {
        this.params = {
            rotationSpeed: 0.01,
            wireframe: false,
            color: '#00ff00'
        };
        
        this.createMesh();
    }

    createMesh() {
        // Create a group to hold multiple meshes if needed
        this.mesh = new THREE.Group();
        
        // Main cube
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({
            color: this.params.color,
            wireframe: this.params.wireframe
        });
        this.cube = new THREE.Mesh(geometry, material);
        this.cube.position.y = 1;
        this.mesh.add(this.cube);
        
        // Add some detail - smaller orbiting cube
        const smallGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const smallMaterial = new THREE.MeshStandardMaterial({
            color: '#ff0000',
            emissive: '#ff0000',
            emissiveIntensity: 0.2
        });
        this.smallCube = new THREE.Mesh(smallGeometry, smallMaterial);
        this.smallCube.position.set(2, 1, 0);
        this.mesh.add(this.smallCube);
        
        // Add a ring around the main cube
        const ringGeometry = new THREE.TorusGeometry(3, 0.2, 16, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: '#0088ff',
            metalness: 0.7,
            roughness: 0.3
        });
        this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
        this.ring.position.y = 1;
        this.ring.rotation.x = Math.PI / 2;
        this.mesh.add(this.ring);
    }

    update(deltaTime) {
        // Rotate the main group
        this.mesh.rotation.y += this.params.rotationSpeed;
        
        // Orbit the small cube
        const time = Date.now() * 0.001;
        this.smallCube.position.x = Math.cos(time * 2) * 2;
        this.smallCube.position.z = Math.sin(time * 2) * 2;
        this.smallCube.rotation.x += 0.02;
        this.smallCube.rotation.y += 0.03;
        
        // Pulse the ring
        const scale = 1 + Math.sin(time * 3) * 0.1;
        this.ring.scale.set(scale, scale, 1);
    }

    updateWireframe(value) {
        this.params.wireframe = value;
        this.cube.material.wireframe = value;
    }

    updateColor(value) {
        this.params.color = value;
        this.cube.material.color = new THREE.Color(value);
    }

    dispose() {
        // Clean up geometries and materials
        this.cube.geometry.dispose();
        this.cube.material.dispose();
        this.smallCube.geometry.dispose();
        this.smallCube.material.dispose();
        this.ring.geometry.dispose();
        this.ring.material.dispose();
    }
}
