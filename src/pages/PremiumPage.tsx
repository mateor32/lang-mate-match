import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast"; // Para notificaciones

// **CLAVE: Definir URL Base para la API**
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Definición de las características para cada plan
interface PlanFeature {
  text: string;
  isIncluded: boolean;
}

interface Plan {
  title: string;
  price: string;
  period: string;
  description: string;
  isPopular: boolean;
  features: PlanFeature[];
  buttonText: string;
  variant: "default" | "secondary" | "outline";
}

const basicFeatures: PlanFeature[] = [
  { text: "Deslizamiento ilimitado", isIncluded: false },
  { text: "5 'Super Likes' diarios", isIncluded: false },
  { text: "Ver quién te dio 'like'", isIncluded: false },
  { text: "Traducción automática en el chat", isIncluded: false },
  { text: "Filtros de búsqueda avanzados", isIncluded: false },
];

const premiumPlan: Plan = {
  title: "Premium",
  price: "9.99",
  period: "/mes",
  description: "Elimina los límites y accede a funciones esenciales.",
  isPopular: false,
  buttonText: "Elegir Premium",
  variant: "default",
  features: [
    { text: "Deslizamiento ilimitado", isIncluded: true },
    { text: "5 'Super Likes' diarios", isIncluded: true },
    { text: "Ver quién te dio 'like'", isIncluded: false },
    { text: "Traducción automática en el chat", isIncluded: false },
    { text: "Filtros de búsqueda avanzados", isIncluded: false },
  ],
};

const superPremiumPlan: Plan = {
  title: "Super Premium",
  price: "19.99",
  period: "/mes",
  description: "La experiencia completa para encontrar a tu Language Mate.",
  isPopular: true,
  buttonText: "Elegir Super Premium",
  variant: "default",
  features: [
    { text: "Deslizamiento ilimitado", isIncluded: true },
    { text: "5 'Super Likes' diarios", isIncluded: true },
    { text: "Ver quién te dio 'like'", isIncluded: true },
    { text: "Traducción automática en el chat", isIncluded: true },
    { text: "Filtros de búsqueda avanzados", isIncluded: true },
  ],
};

const freePlan: Plan = {
  title: "Gratis",
  price: "0.00",
  period: "/mes",
  description: "Comienza a conectar sin compromiso.",
  isPopular: false,
  buttonText: "Actual",
  variant: "secondary",
  features: basicFeatures.map((f, i) => ({ ...f, isIncluded: i === 0 })), // Solo deslizamiento ilimitado para el Free (ajustado para la UI)
};

const plans: Plan[] = [freePlan, premiumPlan, superPremiumPlan];

const FeatureItem = ({
  text,
  isIncluded,
  isPro,
}: {
  text: string;
  isIncluded: boolean;
  isPro: boolean;
}) => (
  <div
    className={cn(
      "flex items-center gap-2",
      isIncluded ? "text-foreground" : "text-muted-foreground opacity-70"
    )}
  >
    <Check
      className={cn(
        "w-5 h-5",
        isIncluded
          ? isPro
            ? "text-match"
            : "text-primary"
          : "text-muted-foreground"
      )}
    />
    <span className="text-sm">{text}</span>
  </div>
);

export default function PremiumPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener el ID del usuario logueado
  const loggedUserId = localStorage.getItem("loggedUserId");
  const userId = loggedUserId ? parseInt(loggedUserId, 10) : null;

  // -----------------------------------------------------
  // FUNCIÓN DE SUSCRIPCIÓN (Llama al nuevo endpoint del backend)
  // -----------------------------------------------------
  const handleSubscription = async (planTitle: string) => {
    if (!userId) {
      toast({
        title: "Error de Sesión",
        description:
          "No se pudo identificar tu usuario. Inicia sesión de nuevo.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Endpoint POST /api/premium/subscribe
      const response = await fetch(`${API_BASE_URL}/api/premium/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: planTitle }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fallo la suscripción al plan.");
      }

      // Éxito: Muestra el toast y redirige
      toast({
        title: "Suscripción Exitosa",
        description: data.message,
        variant: "default",
      });

      // Simulación de recarga de datos de usuario para reflejar el cambio
      localStorage.setItem("userIsPremium", "true");

      // Esperar un momento y luego navegar de vuelta al dashboard
      setTimeout(() => navigate("/"), 1000);
    } catch (error: any) {
      console.error("Error de suscripción:", error);
      toast({
        title: "Error",
        description:
          error.message || "Ocurrió un error al procesar la suscripción.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b rounded-t-lg">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Crown className="w-6 h-6 text-match fill-yellow-500/30" />
          <h2 className="font-bold text-2xl">Planes Premium</h2>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.title}
            className={cn(
              "flex flex-col relative overflow-hidden",
              plan.isPopular && "border-2 border-primary shadow-lg"
            )}
          >
            {plan.isPopular && (
              <Badge className="absolute top-0 right-0 rounded-none rounded-bl-lg bg-match text-white">
                Más Popular
              </Badge>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle
                className={cn(
                  "flex justify-center items-center gap-2",
                  plan.isPopular ? "text-primary" : "text-foreground"
                )}
              >
                {plan.title}
                {plan.isPopular && (
                  <Zap className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                )}
              </CardTitle>
              <p className="text-4xl font-extrabold mt-2">
                ${plan.price}
                <span className="text-base font-normal text-muted-foreground">
                  {plan.period}
                </span>
              </p>
              <p className="text-sm text-muted-foreground pt-2">
                {plan.description}
              </p>
            </CardHeader>

            <CardContent className="flex-1 space-y-3 pt-4">
              <h4 className="text-sm font-semibold mb-3 border-b pb-1">
                Incluye:
              </h4>
              {plan.features.map((feature, index) => (
                <FeatureItem
                  key={index}
                  text={feature.text}
                  isIncluded={feature.isIncluded}
                  isPro={plan.isPopular}
                />
              ))}
            </CardContent>

            <CardFooter className="pt-6">
              <Button
                className={cn(
                  "w-full",
                  plan.variant === "default"
                    ? "bg-gradient-primary hover:opacity-90"
                    : ""
                )}
                variant={plan.variant}
                // Deshabilitar si es Gratis O si ya está enviando una petición
                disabled={plan.title === "Gratis" || isSubmitting}
                onClick={
                  plan.title !== "Gratis" && !isSubmitting
                    ? () => handleSubscription(plan.title) // LLAMADA AL HANDLER
                    : undefined
                }
              >
                {isSubmitting && plan.title !== "Gratis"
                  ? "Procesando..."
                  : plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
