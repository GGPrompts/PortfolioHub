# Modular 3D Development Environment

A professional Three.js development template for building 3D components in isolation.

## Features

- 🎯 **FPS Counter** (Stats.js) - Monitor performance in real-time
- 🎮 **OrbitControls** - Full camera control with mouse
- 📐 **Grid & Axes Helpers** - Visual reference for positioning
- 🎨 **GUI Controls** (lil-gui) - Tweak parameters on the fly
- 💡 **Professional Lighting** - Ambient, directional, and fill lights
- 🌫️ **Fog & Shadows** - Atmospheric effects
- 📦 **Component-based** - Build in isolation, integrate later

## Setup

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── main.js                 # Entry point
├── ComponentTestBed.js     # Test environment class
└── components/
    ├── Component3D.js      # Base component class
    └── ExampleComponent.js # Example implementation
```

## Creating New Components

1. Create a new file in `src/components/`
2. Extend the `Component3D` base class:

```javascript
import { Component3D } from './Component3D';
import * as THREE from 'three';

export class MyComponent extends Component3D {
    constructor() {
        super();
        this.createMesh();
    }

    createMesh() {
        // Your 3D object creation here
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        this.mesh.add(cube);
    }

    update(deltaTime) {
        // Animation logic
        this.mesh.rotation.y += deltaTime;
    }
}
```

3. Import and use in `main.js`:

```javascript
import { MyComponent } from './components/MyComponent';

const component = new MyComponent();
testBed.addComponent(component);
```

## GUI Controls

The test bed includes built-in controls for:
- Scene background color
- Fog distance
- Lighting intensity
- Shadows on/off
- Camera FOV
- Auto-rotation

Add component-specific controls:
```javascript
const folder = testBed.gui.addFolder('My Component');
folder.add(component.params, 'speed', 0, 1);
```

## Tips for Modular Development

1. **Keep components self-contained** - All logic in one class
2. **Use the base class** - Inherit from Component3D
3. **Clean up resources** - Implement dispose() method
4. **Test in isolation** - One component at a time
5. **Use the GUI** - Add controls for all parameters

## Performance Monitoring

- **Green (60 FPS)**: Excellent
- **Yellow (30-60 FPS)**: Good
- **Red (<30 FPS)**: Needs optimization

## Keyboard Shortcuts

- **H**: Toggle helpers visibility
- **F**: Toggle fullscreen
- **Space**: Pause/resume animation
