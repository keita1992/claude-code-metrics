import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { TimezoneProvider } from "./context/TimezoneContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <LanguageProvider>
        <TimezoneProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </TimezoneProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);
