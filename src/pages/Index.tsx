import { useAuth } from "@/integrations/supabase/auth";
import Dashboard from "@/components/Dashboard";
import LoginPage from "@/components/LoginPage";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-secondary">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!user ? (
        <LoginPage />
      ) : (
        <Dashboard />
      )}
    </div>
  );
};

export default Index;
