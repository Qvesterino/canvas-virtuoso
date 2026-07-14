import { CanvasHost } from "./CanvasHost";
import { TopBar } from "./TopBar";
import { BottomDock } from "./BottomDock";
import { InspectorPanel } from "./InspectorPanel";

export function Studio() {
  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ background: "var(--canvas-void)" }}
    >
      <div className="absolute inset-0">
        <CanvasHost />
      </div>
      <TopBar />
      <InspectorPanel />
      <BottomDock />
    </div>
  );
}