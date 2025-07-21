// Base class for all custom control systems
export class ControlSystem {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.enabled = true;
        
        // Common properties
        this.dampingFactor = 0.05;
        this.enableDamping = true;
        
        // Event listeners map
        this.listeners = new Map();
        
        // Initialize
        this.init();
    }
    
    init() {
        // Override in subclasses
    }
    
    update() {
        // Override in subclasses
    }
    
    // Event management
    addEventListener(element, event, handler) {
        const boundHandler = handler.bind(this);
        element.addEventListener(event, boundHandler);
        
        if (!this.listeners.has(element)) {
            this.listeners.set(element, new Map());
        }
        this.listeners.get(element).set(event, boundHandler);
    }
    
    removeEventListener(element, event) {
        if (this.listeners.has(element)) {
            const elementListeners = this.listeners.get(element);
            if (elementListeners.has(event)) {
                const handler = elementListeners.get(event);
                element.removeEventListener(event, handler);
                elementListeners.delete(event);
            }
        }
    }
    
    dispose() {
        // Remove all event listeners
        this.listeners.forEach((events, element) => {
            events.forEach((handler, event) => {
                element.removeEventListener(event, handler);
            });
        });
        this.listeners.clear();
    }
    
    // Common utilities
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    saveState() {
        return {
            cameraPosition: this.camera.position.clone(),
            cameraRotation: this.camera.rotation.clone(),
            cameraQuaternion: this.camera.quaternion.clone()
        };
    }
    
    restoreState(state) {
        this.camera.position.copy(state.cameraPosition);
        this.camera.rotation.copy(state.cameraRotation);
        this.camera.quaternion.copy(state.cameraQuaternion);
    }
}
