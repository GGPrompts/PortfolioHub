import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';
import { GUI } from 'lil-gui';
import { ComponentTestBed } from './ComponentTestBed';
import { ExampleComponent } from './components/ExampleComponent';

// Initialize the test bed
const testBed = new ComponentTestBed();

// Create and add your component
const component = new ExampleComponent();
testBed.addComponent(component);

// Add component-specific GUI controls
const componentFolder = testBed.gui.addFolder('Component Settings');
componentFolder.add(component.params, 'rotationSpeed', 0, 0.1);
componentFolder.add(component.params, 'wireframe').onChange(value => {
    component.updateWireframe(value);
});
componentFolder.addColor(component.params, 'color').onChange(value => {
    component.updateColor(value);
});
componentFolder.open();

// Handle window resize
window.addEventListener('resize', () => {
    testBed.onWindowResize();
});

// Start the animation loop
testBed.animate();
