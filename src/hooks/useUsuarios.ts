import { useState, useEffect } from "react";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  idiomaNativo: string;
  idiomaAprender: string;
  foto?: string;
   edad?: number;   // <-- agregado
  pais?: string; // opcional si no la tienes en la base
}

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/usuarios");
        if (!res.ok) throw new Error("Error al cargar usuarios");
        const data: Usuario[] = await res.json();
        setUsuarios(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, []);

  return { usuarios, loading, error };
};
