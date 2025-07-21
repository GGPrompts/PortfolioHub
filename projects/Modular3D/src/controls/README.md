# Control Systems Library

A collection of reusable control systems for Three.js projects. Each control system is designed for specific use cases and can be easily integrated into any 3D project.

## Available Control Systems

### 🎮 FPSControls
First-person shooter style controls with pointer lock.

**Best for:** Games, architectural walkthroughs, VR-like experiences

**Controls:**
- WASD: Movement
- Mouse: Look around (with pointer lock)
- Space: Jump
- Shift: Run
- C: Crouch

```javascript
import { FPSControls } from './controls/FPSControls';

const controls = new FPSControls(camera, renderer.domElement);
// In render loop:
controls.update(deltaTime);
```

### ✈️ FlyControls
Smooth flying navigation like a spaceship.

**Best for:** Open world exploration, space scenes, creative tools

**Controls:**
- WASD: Move forward/back/left/right
- Q/E: Move down/up
- Mouse: Look around (drag or free-look)
- Shift: Speed boost
- Space: Brake

```javascript
import { FlyControls } from './controls/FlyControls';

const controls = new FlyControls(camera, renderer.domElement);
controls.movementSpeed = 10;
controls.dragToLook = true;
```

### 🖼️ GalleryControls
Smooth navigation between fixed viewpoints.

**Best for:** Product showcases, art galleries, presentations

**Features:**
- Predefined viewpoints
- Smooth transitions
- Mouse wheel navigation
- Click to focus on objects
- Auto-rotate when idle

```javascript
import { GalleryControls } from './controls/GalleryControls';

const controls = new GalleryControls(camera, renderer.domElement);
controls.addViewpoint(
    new THREE.Vector3(5, 2, 5),  // position
    new THREE.Vector3(0, 0, 0),  // target
    'Front View'                  // name
);
```

## Control System Architecture

All control systems inherit from `ControlSystem` base class:

```javascript
class YourCustomControls extends ControlSystem {
    constructor(camera, domElement) {
        super(camera, domElement);
        // Your initialization
    }
    
    init() {
        // Set up event listeners
    }
    
    update(deltaTime) {
        // Update logic
    }
    
    dispose() {
        // Cleanup (handled by base class)
    }
}
```

## Integration Example

```javascript
// In your Modular3D test environment
import { FPSControls } from './controls/FPSControls';
import { ComponentTestBed } from './ComponentTestBed';

const testBed = new ComponentTestBed();

// Replace default OrbitControls with FPS controls
testBed.controls.dispose();
testBed.controls = new FPSControls(testBed.camera, testBed.renderer.domElement);

// Update the animation loop
testBed.animate = function() {
    requestAnimationFrame(() => testBed.animate());
    testBed.stats.begin();
    
    const delta = testBed.clock.getDelta();
    testBed.controls.update(delta);
    
    // ... rest of animation
    testBed.stats.end();
}
```

## Best Practices

1. **Choose the right control system** for your use case
2. **Configure sensitivity** based on your scene scale
3. **Test on multiple devices** (desktop, mobile, tablet)
4. **Provide visual feedback** for control states
5. **Add GUI controls** for user preferences

## Switching Controls at Runtime

```javascript
let currentControls = null;

function switchControls(type) {
    if (currentControls) {
        currentControls.dispose();
    }
    
    switch(type) {
        case 'fps':
            currentControls = new FPSControls(camera, domElement);
            break;
        case 'fly':
            currentControls = new FlyControls(camera, domElement);
            break;
        case 'gallery':
            currentControls = new GalleryControls(camera, domElement);
            break;
    }
}
```

## Mobile Support

All control systems include basic mobile support:
- Touch events for movement
- Gesture recognition
- Responsive sensitivity

## Performance Tips

- Disable unused control systems
- Reduce update frequency for distant cameras
- Use `enabled` property to pause controls
- Implement LOD for control complexity
