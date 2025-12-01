import React from "react";
import { createRoot } from "react-dom/client";
import "../styles/globals.css"; // Import global styles
import TestPage from "../pages/TestPage";

const root = createRoot(document.getElementById("root")!);
root.render(<TestPage />);
