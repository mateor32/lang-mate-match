// src/utils/usuarioToUser.ts
import { Usuario } from "@/hooks/useUsuarios";

export interface User {
  id: number; // ahora es number
  nombre: string;
  email: string;
  edad: number;
  pais: string;
  idiomasNativos: string[];
  idiomasAprender: string[];
  foto: string;
}

export const usuarioToUser = (usuario: Usuario): User => {
  return {
    id: usuario.id ?? Math.floor(Math.random() * 1000000), // si no hay id, generamos uno numérico
    nombre: usuario.nombre ?? "Desconocido",
    email: usuario.email ?? "noemail@example.com",
    edad: usuario.edad ?? 18,
    pais: usuario.pais ?? "Desconocido",
    idiomasNativos: usuario.idiomaNativo ? [usuario.idiomaNativo] : ["Español"],
    idiomasAprender: usuario.idiomaAprender ? [usuario.idiomaAprender] : ["Inglés"],
    foto:
      usuario.foto ??
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  };
};
