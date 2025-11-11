import { Usuario } from "@/hooks/useUsuarios";

export interface User {
  id: number;
  nombre: string;
  edad: number;
  pais_nombre: string; // Nombre del país
  sexo: string; // Género del usuario
  pref_pais_id: number | null; // Preferencia de país (null para Todos)
  pref_sexo: string; // Preferencia de género
  usuario_idioma?: {
    tipo: string;
    id: number;
    nombre: string;
  }[];
  intereses?: { id: number; nombre: string }[];
  foto: string;
  bio?: string;
}

export const usuarioToUser = (usuario: Usuario): User => ({
  id: usuario.id,
  nombre: usuario.nombre,
  edad: usuario.fecha_nacimiento
    ? new Date().getFullYear() - new Date(usuario.fecha_nacimiento).getFullYear()
    : 0,
  pais_nombre: (usuario as any).pais_nombre || "Ubicación desconocida", // Viene del JOIN
  foto:
    usuario.foto ||
    "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500",
  usuario_idioma: usuario.usuario_idioma,
  bio: usuario.bio  || "",
  intereses: usuario.intereses,
  sexo: (usuario as any).sexo || "", 
  pref_pais_id: (usuario as any).pref_pais_id || 0, // 0 en el frontend representa NULL en DB
  pref_sexo: (usuario as any).pref_sexo || "Todos",
});