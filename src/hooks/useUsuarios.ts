import { useState, useEffect } from "react";
import { usuarioToUser, User } from "@/utils/usuarioToUser";

export interface Usuario {
  id: number;
  nombre: string;
  
  creado_en: string;
  telefono: string;
  fecha_nacimiento: string | null;
  sexo: string | null;
  foto: string | null;

  usuario_idioma?: {
    tipo: string;
    id: number;
    nombre: string;
  }[];
  intereses?: { id: number; nombre: string }[];
}

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/api/usuarios");
      if (!res.ok) throw new Error("Error al cargar usuarios");
      const data: Usuario[] = await res.json();
      console.log("📦 Usuarios desde backend:", data);

      // Convertir usuarios y agregar intereses
      const converted: User[] = await Promise.all(
        data.map(async (usuario) => {
          const user: User = usuarioToUser(usuario);

          // Traer intereses del usuario
          try {
            const resIntereses = await fetch(
              `http://localhost:5000/api/usuarios/${usuario.id}/intereses`
            );
            if (resIntereses.ok) {
              const interesesData = await resIntereses.json();
              user.intereses = interesesData.map((i: any) => i.nombre);
            } else {
              user.intereses = [];
            }
          } catch {
            user.intereses = [];
          }

          return user;
        })
      );

      setUsuarios(converted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  return { usuarios, loading, error, refreshUsuarios: fetchUsuarios };
};
