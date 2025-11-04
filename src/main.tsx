import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom"; // <-- Importar aquí
import { GoogleOAuthProvider } from "@react-oauth/google";

// MODIFICACIÓN CLAVE: Lee el CLIENT_ID de la variable de entorno de Vercel/Vite.
// El valor hardcodeado se mantiene como fallback seguro para desarrollo local.
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "193035898327-1lbc2ik6jrduikdeuivdcknmfaducadk.apps.googleusercontent.com";

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      {" "}
      {/* <-- DEJAR SOLO UN ROUTER AQUÍ */}
      <App />
    </BrowserRouter>
  </GoogleOAuthProvider>
);
