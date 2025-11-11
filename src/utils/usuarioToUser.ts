import { Usuario } from "@/hooks/useUsuarios";

export interface User {
  id: number;
  nombre: string;
  edad: number;
  pais_nombre: string; // UPDATED
  sexo: string; // NEW
  pref_pais_id: number | null; // NEW
  pref_sexo: string; // NEW
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
  pais_nombre: (usuario as any).pais_nombre || "Ubicación desconocida", // o usa un campo real
  foto:
    usuario.foto ||
    "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500",
  usuario_idioma: usuario.usuario_idioma, // ya son strings
  bio: usuario.bio  || "",
  intereses: usuario.intereses, 
  sexo: (usuario as any).sexo || "", 
  pref_pais_id: (usuario as any).pref_pais_id || 0, // Usamos 0 para el frontend, aunque en DB sea NULL
  pref_sexo: (usuario as any).pref_sexo || "Todos",// ya son strings
});
