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

// **CLAVE: Definir URL Base para la API**
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:10000"|| "http://localhost:5000" ;

// Función que realiza el fetch y la transformación de datos
// Función que realiza el fetch y la transformación de datos
// MODIFICACIÓN: ACEPTA ID
const fetchAndProcessUsuarios = async (currentUserId: number) => {
    // 1. Fetch de todos los usuarios
    // MODIFICACIÓN: AÑADIR QUERY PARAM para activar lógica de recomendación en el backend
    const res = await fetch(`${API_BASE_URL}/api/usuarios?recommendationsFor=${currentUserId}`); // <-- URL CORREGIDA
    if (!res.ok) throw new Error("Error al cargar usuarios");
    const data: Usuario[] = await res.json();

    // 2. Procesar y obtener intereses de cada uno
    const converted: User[] = await Promise.all(
        data.map(async (usuario) => {
          const user: User = usuarioToUser(usuario);

          // ... (código sin cambios)

          return user;
        })
    );
    return converted;
};

// Nuevo hook usando React Query
// MODIFICACIÓN: ACEPTA ID
export const useUsuarios = (userId: number) => {
  // CLAVE: Añadimos userId a la clave de caché para que se refetchee si el ID cambia
  return useQuery<User[], Error>({
    queryKey: ['allUsers', userId], // Clave única por usuario
    queryFn: () => fetchAndProcessUsuarios(userId), // Llama con ID
    // La data será considerada "fresh" por un tiempo
    staleTime: 5 * 60 * 1000,
  });
};