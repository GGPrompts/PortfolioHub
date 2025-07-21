import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';
import { GUI } from 'lil-gui';

export class ComponentTestBed {
    constructor() {
        this.setupScene();
        this.setupHelpers();
        this.setupGUI();
        this.setupLights();
        this.components = [];
    }

    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);
        this.scene.fog = new THREE.Fog(0x222222, 10, 50);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 30;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    setupHelpers() {
        // Grid Helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        
        // Axes Helper (R=X, G=Y, B=Z)
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        
        // Stats (FPS Counter)
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.top = '10px';
        this.stats.dom.style.left = '10px';
        document.body.appendChild(this.stats.dom);
        
        // Add floor plane for shadows
        const floorGeometry = new THREE.PlaneGeometry(20, 20);
        const floorMaterial = new THREE.ShadowMaterial({ 
            opacity: 0.3,
            color: 0x000000
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    setupLights() {
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Main Directional Light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
        
        // Fill Light
        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
        
        // Store lights for GUI control
        this.lights = {
            ambient: ambientLight,
            directional: directionalLight,
            fill: fillLight
        };
    }

    setupGUI() {
        this.gui = new GUI();
        
        // Scene Controls
        const sceneFolder = this.gui.addFolder('Scene');
        sceneFolder.addColor({ color: 0x222222 }, 'color').onChange(value => {
            this.scene.background = new THREE.Color(value);
            this.scene.fog.color = new THREE.Color(value);
        }).name('Background');
        sceneFolder.add(this.scene.fog, 'far', 10, 100).name('Fog Distance');
        
        // Lighting Controls
        const lightingFolder = this.gui.addFolder('Lighting');
        lightingFolder.add(this.lights.ambient, 'intensity', 0, 1).name('Ambient');
        lightingFolder.add(this.lights.directional, 'intensity', 0, 2).name('Main Light');
        lightingFolder.add(this.lights.fill, 'intensity', 0, 1).name('Fill Light');
        lightingFolder.add(this.renderer.shadowMap, 'enabled').name('Shadows').onChange(value => {
            this.renderer.shadowMap.needsUpdate = true;
        });
        
        // Camera Controls
        const cameraFolder = this.gui.addFolder('Camera');
        cameraFolder.add(this.camera, 'fov', 30, 120).onChange(() => {
            this.camera.updateProjectionMatrix();
        });
        cameraFolder.add(this.controls, 'autoRotate');
        cameraFolder.add(this.controls, 'autoRotateSpeed', 0.5, 10);
        
        // Global parameters
        this.params = {
            wireframe: false,
            showHelpers: true
        };
        
        const globalFolder = this.gui.addFolder('Global');
        globalFolder.add(this.params, 'showHelpers').onChange(value => {
            this.scene.traverse(child => {
                if (child instanceof THREE.GridHelper || child instanceof THREE.AxesHelper) {
                    child.visible = value;
                }
            });
        });
    }

    addComponent(component) {
        this.scene.add(component.mesh);
        this.components.push(component);
        
        // Enable shadows if the component supports it
        if (component.mesh) {
            component.mesh.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }
    }

    removeComponent(component) {
        this.scene.remove(component.mesh);
        const index = this.components.indexOf(component);
        if (index > -1) {
            this.components.splice(index, 1);
        }
        component.dispose();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.stats.begin();
        
        // Update controls
        this.controls.update();
        
        // Update all components
        const deltaTime = this.clock ? this.clock.getDelta() : 0;
        if (!this.clock) this.clock = new THREE.Clock();
        
        this.components.forEach(component => {
            if (component.update) {
                component.update(deltaTime);
            }
        });
        
        // Render
        this.renderer.render(this.scene, this.camera);
        
        this.stats.end();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    dispose() {
        this.components.forEach(component => component.dispose());
        this.gui.destroy();
        this.stats.dom.remove();
        this.renderer.dispose();
        this.controls.dispose();
    }
}
