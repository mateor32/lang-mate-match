import { useState, useEffect, ReactNode } from "react";

interface User {
  isOnline: any;
  lastMessage: ReactNode;
  id: number;
  nombre: string;
  pais: string;
  usuario_idioma?: { id: number; nombre: string; tipo: string }[];
  foto: string;
}

export function useMatches(userId: number) {
  const [matches, setMatches] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:5000/api/matches/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        Promise.all(
          data.map(async (match: any) => {
            const otherUserId =
              match.usuario1_id === userId ? match.usuario2_id : match.usuario1_id;
            const res = await fetch(`http://localhost:5000/api/usuarios/${otherUserId}`);
            return res.json();
          })
        ).then((users) => {
          setMatches(users);
          setLoading(false);
        });
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [userId]);

  return { matches, loading };
}
