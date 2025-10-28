import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GoogleLogin } from "@react-oauth/google";

interface LoginPageProps {
  onLogin: (userId: number) => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const handleSuccess = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential;

    if (!idToken) {
      console.error("No se recibió el ID Token de Google.");
      return;
    }

    try {
      // 1. Fetch al backend
      const response = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: idToken }),
      });

      if (!response.ok) {
        throw new Error("Fallo la verificación del token en el backend.");
      }

      // 2. CLAVE: Leer la respuesta JSON (esperamos { userId: 7, ... })
      const data = await response.json();
      const authenticatedUserId = data.userId;

      if (!authenticatedUserId) {
        throw new Error("El backend no devolvió un ID de usuario válido.");
      }

      // 3. Usar el ID de usuario devuelto por la API
      onLogin(authenticatedUserId);
    } catch (error) {
      console.error("Error durante la autenticación:", error);
    }
  };

  const handleError = () => {
    console.log("Login Falló");
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-elevated">
        <div className="text-center space-y-6">
          {/* Logo/Icon y Features (Diseño) */}
          <div className="w-20 h-20 mx-auto bg-gradient-primary rounded-full flex items-center justify-center">
            <span className="text-3xl">🌍</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LinguaMatch
            </h1>
            <p className="text-muted-foreground">
              Conecta con personas de todo el mundo para intercambiar idiomas
            </p>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span>Encuentra compañeros de práctica</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span>Practica idiomas con nativos</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              <span>Sistema de matching inteligente</span>
            </div>
          </div>

          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            useOneTap
            render={({ onClick, disabled }) => (
              <Button
                onClick={onClick}
                disabled={disabled}
                className="w-full bg-gradient-primary hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-smooth"
                size="lg"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar con Google
              </Button>
            )}
          />

          <p className="text-xs text-muted-foreground">
            Al continuar, aceptas nuestros términos de servicio
          </p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
