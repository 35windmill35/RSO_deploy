import { createRoot } from "react-dom/client";
import "@/APP/styles/theme.scss";
import "@/APP/styles/index.scss";
import App from "@/APP/ui/App";

createRoot(document.getElementById("root")!).render(<App />);
