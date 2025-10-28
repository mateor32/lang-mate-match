import { useState } from "react";
import LoginPage from "@/components/LoginPage";
import Dashboard from "@/components/Dashboard";

const Index = () => {
  // 1. Cargar userId desde localStorage para mantener la sesión
  const [userId, setUserId] = useState<number | null>(() => {
    const storedId = localStorage.getItem("loggedUserId");
    return storedId ? parseInt(storedId, 10) : null;
  });

  const handleLogin = (id: number) => {
    // 2. Guardar userId en localStorage al iniciar sesión
    if (typeof id === "number" && id > 0) {
      setUserId(id);
      localStorage.setItem("loggedUserId", id.toString());
    } else {
      console.error("Login intentado con ID inválido:", id);
      setUserId(null);
      localStorage.removeItem("loggedUserId");
    }
  };

  const handleLogout = () => {
    setUserId(null);
    localStorage.removeItem("loggedUserId"); // Eliminar ID al cerrar sesión
  };

  // CLAVE: Solo renderizar Dashboard si userId es un número válido.
  if (typeof userId === "number" && userId > 0) {
    return <Dashboard onLogout={handleLogout} userId={userId} />;
  }

  // De lo contrario, muestra LoginPage
  return <LoginPage onLogin={handleLogin} />;
};

export default Index;
