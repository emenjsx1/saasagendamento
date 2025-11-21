import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { CurrencyProvider } from "./contexts/CurrencyContext.tsx";
import { ThemeProvider } from "next-themes";

createRoot(document.getElementById("root")!).render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <CurrencyProvider>
            <App />
        </CurrencyProvider>
    </ThemeProvider>
);