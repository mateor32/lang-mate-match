// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/src/hooks/useMatches.ts
import { useState, useEffect, ReactNode } from "react";
import { usuarioToUser, User } from "@/utils/usuarioToUser";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:10000"|| "http://localhost:5000" ;
// Using the local Usuario interface declared at the end of this file instead of importing it.

// NUEVA INTERFAZ para el match completo (incluye el ID del registro en la tabla matches)
export interface MatchWithUser {
  matchId: number; 
  otherUser: User; 
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

export function useMatches(userId: number) {
  const [matches, setMatches] = useState<MatchWithUser[]>([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/matches/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar lista de matches");
        return res.json();
      })
      .then((data: any[]) => {
        Promise.all(
          data.map(async (match: any) => {
            const otherUserId =
              match.usuario1_id === userId ? match.usuario2_id : match.usuario1_id;
            
            // Se asume que el endpoint /api/usuarios/:id devuelve el mismo formato que useUsuarios espera
            const res = await fetch(`${API_BASE_URL}/api/usuarios/${otherUserId}`);
            if (!res.ok) throw new Error(`Error al cargar usuario ${otherUserId}`);
            
            // El endpoint /api/usuarios/:id en server.js devuelve { ...usuario, idiomas: [...] }
            // Necesitamos adaptarlo al formato esperado por usuarioToUser (que espera 'usuario_idioma' y no 'idiomas')
            const rawUserData = await res.json(); 

            // Creamos un mock de Usuario para pasarlo a usuarioToUser, ya que /api/usuarios/:id no devuelve el mismo formato que /api/usuarios
            const mockUsuario: Usuario = {
                ...rawUserData,
                usuario_idioma: rawUserData.idiomas.map((i: any, index: number) => ({
                    nombre: i.nombre,
                    id: rawUserData.id,
                    tipo: index === 0 ? "nativo" : "aprender",
                })),
            } as Usuario;

            const otherUser: User = usuarioToUser(mockUsuario);
            
            return {
              matchId: match.id, // <-- CLAVE: El ID del match
              otherUser: otherUser,
              // Mock data para la lista de chats
              lastMessage: "¡Inicia la conversación!", 
              lastMessageTime: "", 
              unreadCount: 0,
              isOnline: Math.random() > 0.5,
            } as MatchWithUser;
          })
        ).then((matchesWithUsers) => {
          setMatches(matchesWithUsers);
          setLoading(false);
        }).catch((err) => {
          console.error("Error procesando datos de usuario para matches:", err);
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error("Error en useMatches:", err);
        setLoading(false);
      });
  }, [userId]);

  return { matches, loading };
}

// Se re-exportan las interfaces para el consumo en otros archivos
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