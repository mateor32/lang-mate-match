import { useQuery } from "@tanstack/react-query";

// Tipo de respuesta esperado del backend (checkPremiumStatus)
interface PremiumStatus {
    isPremium: boolean;
    plan: 'Gratis' | 'Premium' | 'Super Premium';
    expires?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const fetchPremiumStatus = async (userId: number): Promise<PremiumStatus> => {
    if (userId <= 0) return { isPremium: false, plan: 'Gratis' };

    const res = await fetch(`${API_BASE_URL}/api/usuarios/${userId}/premium`);
    
    if (!res.ok) {
        // En caso de error de red o 500, asumimos Gratis por seguridad
        console.error(`Fallo al cargar el estado premium (Status: ${res.status})`);
        return { isPremium: false, plan: 'Gratis' };
    }

    const data = await res.json();
    return data;
};

/**
 * Hook para obtener el estado premium y el plan actual del usuario logueado.
 */
export const usePremiumStatus = (userId: number) => {
    return useQuery<PremiumStatus, Error>({
        queryKey: ['premiumStatus', userId],
        queryFn: () => fetchPremiumStatus(userId),
        // Mantener la data fresca por un tiempo razonable
        staleTime: 5 * 60 * 1000, // 5 minutos
        enabled: userId > 0,
    });
};