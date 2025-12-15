// component-loader.js
class ComponentLoader {
    constructor() {
        this.components = {};
    }

    async loadComponent(componentName, containerId) {
        try {
            const response = await fetch(`components/${componentName}.html`);
            if (!response.ok) {
                throw new Error(`Component ${componentName} not found`);
            }
            
            const html = await response.text();
            const container = document.getElementById(containerId);
            
            if (container) {
                container.innerHTML = html;
                this.components[componentName] = html;
                
                // Dispatch event for component loaded
                const event = new CustomEvent('componentLoaded', {
                    detail: { componentName, containerId }
                });
                document.dispatchEvent(event);
                
                return true;
            } else {
                console.error(`Container #${containerId} not found for ${componentName}`);
                return false;
            }
        } catch (error) {
            console.error(`Error loading ${componentName}:`, error);
            return false;
        }
    }

    async loadMultiple(components) {
        const promises = components.map(({ name, container }) => 
            this.loadComponent(name, container)
        );
        return Promise.all(promises);
    }
}

// Create global instance
window.ComponentLoader = new ComponentLoader();
