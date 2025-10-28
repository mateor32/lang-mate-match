import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  // Inicializamos a null
  const [userId, setUserId] = useState<number | null>(null);

  const handleLogin = (id: number) => {
    // Solo aceptamos IDs válidos (número y mayor a 0)
    if (typeof id === "number" && id > 0) {
      setUserId(id);
    } else {
      console.error("Login intentado con ID inválido:", id);
      setUserId(null); // Forzar la visualización de la página de Login
    }
  };

  const handleLogout = () => {
    setUserId(null);
  };

  // CLAVE: Solo renderizar Dashboard si userId es un número válido.
  if (typeof userId === "number" && userId > 0) {
    return <Dashboard onLogout={handleLogout} userId={userId} />;
  }

  // De lo contrario, muestra LoginPage
  return <LoginPage onLogin={handleLogin} />;
};

export default Index;
