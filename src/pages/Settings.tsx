// src/pages/Settings.tsx
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface User {
  id: number;
  nombre: string;
  email: string;
  edad: number;
  pais: string;
  foto: string;
}

const Settings: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Cargar datos del usuario
    fetch("http://localhost:5000/api/usuarios/1") // <-- Reemplaza con el id del usuario logueado
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando usuario:", err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      const res = await fetch(`http://localhost:5000/api/usuarios/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });

      if (!res.ok) throw new Error("Error actualizando usuario");

      alert("Datos actualizados correctamente ✅");
      navigate("/"); // Regresa al dashboard o a la página principal
    } catch (err) {
      console.error(err);
      alert("Error al actualizar los datos ❌");
    }
  };

  if (loading) return <p>Cargando datos...</p>;
  if (!user) return <p>No se pudo cargar el usuario</p>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Configuración de perfil</h1>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block mb-1 font-medium">Nombre</label>
          <Input name="nombre" value={user.nombre} onChange={handleChange} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Email</label>
          <Input name="email" value={user.email} onChange={handleChange} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Edad</label>
          <Input
            type="number"
            name="edad"
            value={user.edad}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">País</label>
          <Input name="pais" value={user.pais} onChange={handleChange} />
        </div>

        <div>
          <label className="block mb-1 font-medium">Foto (URL)</label>
          <Input name="foto" value={user.foto} onChange={handleChange} />
          <img
            src={user.foto}
            alt="Foto"
            className="w-24 h-24 mt-2 rounded-full"
          />
        </div>

        <Button onClick={handleSave}>Guardar cambios</Button>
      </div>
    </div>
  );
};

export default Settings;
