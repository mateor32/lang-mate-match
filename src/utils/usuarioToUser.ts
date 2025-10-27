import { Usuario } from "@/hooks/useUsuarios";

export interface User {
  id: number;
  nombre: string;
  edad: number;
  pais: string;
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
  pais: "Colombia", // o usa un campo real
  foto:
    usuario.foto ||
    "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500",
  usuario_idioma: usuario.usuario_idioma, // ya son strings
  bio: usuario.bio  || "",
  intereses: usuario.intereses, // ya son strings
});
