import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "../../src/ui/ErrorBoundary";
import "@radix-ui/themes/styles.css";
function Broken(): never { throw new Error("PRIVATE-CRASH-MARKER synthetic render failure"); }
createRoot(document.getElementById("root")!).render(<ErrorBoundary name="panel"><Broken /></ErrorBoundary>);
