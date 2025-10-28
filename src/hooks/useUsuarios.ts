import { useQuery } from "@tanstack/react-query"; 
import { usuarioToUser, User } from "@/utils/usuarioToUser";

export interface Usuario {
  id: number;
  nombre: string;
  
  creado_en: string;
  telefono: string;
  fecha_nacimiento: string | null;
  sexo: string | null;
  foto: string | null;

  // Nota: Estos campos ahora se obtienen del endpoint /api/usuarios/:id/intereses
  usuario_idioma?: {
    tipo: string;
    id: number;
    nombre: string;
  }[];
  intereses?: { id: number; nombre: string }[];
}

// Función que realiza el fetch y la transformación de datos
const fetchAndProcessUsuarios = async () => {
    // 1. Fetch de todos los usuarios
    const res = await fetch("http://localhost:5000/api/usuarios");
    if (!res.ok) throw new Error("Error al cargar usuarios");
    const data: Usuario[] = await res.json();

    // 2. Procesar y obtener intereses de cada uno
    const converted: User[] = await Promise.all(
        data.map(async (usuario) => {
          const user: User = usuarioToUser(usuario);

          // Obtener intereses para el usuario
          try {
            const resIntereses = await fetch(
              `http://localhost:5000/api/usuarios/${usuario.id}/intereses`
            );
            if (resIntereses.ok) {
              const interesesData = await resIntereses.json();
              // El campo 'intereses' de User ahora usará el formato { id, nombre }
              user.intereses = interesesData.map((i: any) => ({ id: i.id, nombre: i.nombre }));
            } else {
              user.intereses = [];
            }
          } catch {
            user.intereses = [];
          }

          return user;
        })
    );
    return converted;
};

// Nuevo hook usando React Query
export const useUsuarios = () => {
  // CLAVE: 'allUsers' es el identificador de caché
  return useQuery<User[], Error>({
    queryKey: ['allUsers'],
    queryFn: fetchAndProcessUsuarios,
    // La data será considerada "fresh" por un tiempo
    staleTime: 5 * 60 * 1000, 
  });
};