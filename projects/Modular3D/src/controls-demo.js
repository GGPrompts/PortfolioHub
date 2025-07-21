import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';
import { GUI } from 'lil-gui';
import { ComponentTestBed } from './ComponentTestBed';

// Import control systems
import { FPSControls } from './controls/FPSControls';
import { FlyControls } from './controls/FlyControls';
import { GalleryControls } from './controls/GalleryControls';

// Initialize the test bed
const testBed = new ComponentTestBed();

// Control system switcher
let currentControlSystem = 'orbit';
let controls = testBed.controls; // Default OrbitControls

// Function to switch control systems
function switchControlSystem(type) {
    // Dispose current controls
    if (controls && controls.dispose) {
        controls.dispose();
    }
    
    // Create new control system
    switch(type) {
        case 'orbit':
            controls = new OrbitControls(testBed.camera, testBed.renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            break;
            
        case 'fps':
            controls = new FPSControls(testBed.camera, testBed.renderer.domElement);
            controls.walkSpeed = 5;
            controls.runSpeed = 10;
            break;
            
        case 'fly':
            controls = new FlyControls(testBed.camera, testBed.renderer.domElement);
            controls.movementSpeed = 10;
            controls.dragToLook = false;
            break;
            
        case 'gallery':
            controls = new GalleryControls(testBed.camera, testBed.renderer.domElement);
            // Add some example viewpoints
            controls.addViewpoint(
                new THREE.Vector3(5, 5, 5),
                new THREE.Vector3(0, 0, 0),
                'Overview'
            );
            controls.addViewpoint(
                new THREE.Vector3(0, 2, 8),
                new THREE.Vector3(0, 1, 0),
                'Front View'
            );
            controls.addViewpoint(
                new THREE.Vector3(8, 3, 0),
                new THREE.Vector3(0, 1, 0),
                'Side View'
            );
            controls.addViewpoint(
                new THREE.Vector3(0, 10, 0),
                new THREE.Vector3(0, 0, 0),
                'Top View'
            );
            controls.goToViewpoint(0, true);
            break;
    }
    
    currentControlSystem = type;
    testBed.controls = controls;
    
    // Update info display
    document.getElementById('info').textContent = `Control System: ${type.toUpperCase()}`;
}

// Add control system selector to GUI
const controlFolder = testBed.gui.addFolder('Control System');
const controlParams = {
    type: 'orbit'
};

controlFolder.add(controlParams, 'type', ['orbit', 'fps', 'fly', 'gallery'])
    .onChange(value => switchControlSystem(value))
    .name('Control Type');

// Add control-specific settings
const controlSettingsFolder = testBed.gui.addFolder('Control Settings');

// FPS Controls settings
const fpsSettings = {
    walkSpeed: 5,
    runSpeed: 10,
    jumpHeight: 2,
    mouseSensitivity: 0.002,
    invertY: false
};

// Fly Controls settings
const flySettings = {
    movementSpeed: 10,
    boostMultiplier: 3,
    dragToLook: false,
    autoForward: false,
    mouseSensitivity: 0.002
};

// Gallery Controls settings
const gallerySettings = {
    transitionDuration: 1.5,
    autoRotate: false,
    autoRotateSpeed: 0.5,
    enableZoom: true
};

// Function to update control settings GUI
function updateControlSettingsGUI() {
    // Clear existing settings
    controlSettingsFolder.controllers.forEach(controller => controller.destroy());
    controlSettingsFolder.controllers = [];
    
    switch(currentControlSystem) {
        case 'fps':
            controlSettingsFolder.add(fpsSettings, 'walkSpeed', 1, 20).onChange(v => controls.walkSpeed = v);
            controlSettingsFolder.add(fpsSettings, 'runSpeed', 5, 30).onChange(v => controls.runSpeed = v);
            controlSettingsFolder.add(fpsSettings, 'jumpHeight', 0.5, 5).onChange(v => controls.jumpHeight = v);
            controlSettingsFolder.add(fpsSettings, 'mouseSensitivity', 0.0001, 0.01).onChange(v => controls.mouseSensitivity = v);
            controlSettingsFolder.add(fpsSettings, 'invertY').onChange(v => controls.invertY = v);
            break;
            
        case 'fly':
            controlSettingsFolder.add(flySettings, 'movementSpeed', 1, 50).onChange(v => controls.movementSpeed = v);
            controlSettingsFolder.add(flySettings, 'boostMultiplier', 1, 10).onChange(v => controls.boostMultiplier = v);
            controlSettingsFolder.add(flySettings, 'dragToLook').onChange(v => controls.dragToLook = v);
            controlSettingsFolder.add(flySettings, 'autoForward').onChange(v => controls.autoForward = v);
            controlSettingsFolder.add(flySettings, 'mouseSensitivity', 0.0001, 0.01).onChange(v => controls.mouseSensitivity = v);
            break;
            
        case 'gallery':
            controlSettingsFolder.add(gallerySettings, 'transitionDuration', 0.5, 5).onChange(v => controls.transitionDuration = v);
            controlSettingsFolder.add(gallerySettings, 'autoRotate').onChange(v => controls.autoRotate = v);
            controlSettingsFolder.add(gallerySettings, 'autoRotateSpeed', 0.1, 2).onChange(v => controls.autoRotateSpeed = v);
            controlSettingsFolder.add(gallerySettings, 'enableZoom').onChange(v => controls.enableZoom = v);
            controlSettingsFolder.add({ next: () => controls.nextViewpoint() }, 'next').name('Next View →');
            controlSettingsFolder.add({ prev: () => controls.previousViewpoint() }, 'prev').name('← Previous View');
            break;
    }
}

// Watch for control system changes
controlFolder.controllers[0].onChange(() => updateControlSettingsGUI());
updateControlSettingsGUI();

// Create example scene content
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.y = 1;
testBed.scene.add(cube);

// Add more objects for testing
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff0000,
    metalness: 0.7,
    roughness: 0.3
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(4, 1, 0);
testBed.scene.add(sphere);

const torusGeometry = new THREE.TorusKnotGeometry(1, 0.3, 100, 16);
const torusMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0088ff,
    metalness: 0.5,
    roughness: 0.4
});
const torus = new THREE.Mesh(torusGeometry, torusMaterial);
torus.position.set(-4, 1.5, 0);
testBed.scene.add(torus);

// Animate objects
function animateObjects(time) {
    cube.rotation.y = time * 0.001;
    sphere.position.y = 1 + Math.sin(time * 0.002) * 0.5;
    torus.rotation.x = time * 0.001;
    torus.rotation.y = time * 0.0015;
}

// Override the test bed's animate function
const originalAnimate = testBed.animate.bind(testBed);
testBed.animate = function() {
    originalAnimate();
    
    // Animate objects
    animateObjects(Date.now());
    
    // Update current control system
    const delta = testBed.clock.getDelta();
    if (controls && controls.update) {
        controls.update(delta);
    }
};

// Handle window resize
window.addEventListener('resize', () => {
    testBed.onWindowResize();
});

// Update instructions based on control type
const instructionsDiv = document.querySelector('.controls-info');
function updateInstructions() {
    let instructions = '<strong>Controls:</strong><br>';
    
    switch(currentControlSystem) {
        case 'orbit':
            instructions += '🖱️ Left Click + Drag: Rotate<br>';
            instructions += '🖱️ Right Click + Drag: Pan<br>';
            instructions += '🖱️ Scroll: Zoom';
            break;
        case 'fps':
            instructions += '🖱️ Click to capture mouse<br>';
            instructions += '⌨️ WASD: Move<br>';
            instructions += '⌨️ Space: Jump | Shift: Run<br>';
            instructions += '⌨️ C: Crouch';
            break;
        case 'fly':
            instructions += '⌨️ WASD: Move<br>';
            instructions += '⌨️ Q/E: Down/Up<br>';
            instructions += '🖱️ Mouse: Look<br>';
            instructions += '⌨️ Shift: Boost | Space: Brake';
            break;
        case 'gallery':
            instructions += '🖱️ Scroll: Next/Previous view<br>';
            instructions += '⌨️ ←→ or A/D: Navigate<br>';
            instructions += '⌨️ 1-4: Jump to view<br>';
            instructions += '⌨️ Space: Toggle auto-rotate';
            break;
    }
    
    instructionsDiv.innerHTML = instructions;
}

// Watch for control changes
controlFolder.controllers[0].onChange(updateInstructions);
updateInstructions();

// Start animation
testBed.animate();
