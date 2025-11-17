interface VantaEffect {
    destroy: () => void;
}

interface VantaConfig {
    el: HTMLElement | null;
    mouseControls?: boolean;
    touchControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    color?: number;
    backgroundColor?: number;
    backgroundAlpha?: number;
    [key: string]: unknown;
}

declare module "vanta/dist/vanta.trunk.min" {
    function TRUNK(options: VantaConfig): VantaEffect;
    export default TRUNK;
}

declare global {
    interface Window {
        p5: typeof import("p5").default;
    }
}
