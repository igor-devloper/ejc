import type { DetailedHTMLProps, HTMLAttributes } from "react";

type ModelViewerAttributes = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  src?: string;
  alt?: string;
  poster?: string;
  ar?: boolean;
  "ar-modes"?: string;
  "camera-controls"?: boolean;
  "touch-action"?: string;
  "auto-rotate"?: boolean;
  "auto-rotate-delay"?: number | string;
  "rotation-per-second"?: string;
  "camera-orbit"?: string;
  "field-of-view"?: string;
  "shadow-intensity"?: number | string;
  "shadow-softness"?: number | string;
  exposure?: number | string;
  "environment-image"?: string;
  "disable-zoom"?: boolean;
  "interaction-prompt"?: string;
  loading?: "auto" | "lazy" | "eager";
  reveal?: "auto" | "interaction" | "manual";
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes;
    }
  }
}

export {};
