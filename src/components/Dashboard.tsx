// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/src/components/Dashboard.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, MessageCircle, Heart, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import UserCard from "./UserCard";
import MatchModal from "./MatchModal";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";

import { useUsuarios, Usuario } from "@/hooks/useUsuarios";
import { usuarioToUser, User } from "@/utils/usuarioToUser";

interface DashboardProps {
  onLogout: () => void;
  userId: number; // CLAVE: La prop debe ser 'userId: number'
}

type ViewType = "discover" | "matches" | "chat";

// 1. Recibir userId como prop
const Dashboard = ({ onLogout, userId }: DashboardProps) => {
  const navigate = useNavigate();
  const {
    data: usuarios = [],
    isLoading: loading,
    error,
  } = useUsuarios(userId);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<User[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>("discover");
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null); // <-- NUEVO ESTADO

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // 2. Usamos el userId de la prop para el fetch (se evita el "undefined")
    fetch(`http://localhost:5000/api/usuarios/${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // Aseguramos que data.idiomas sea un array
        const idiomasArray = Array.isArray(data.idiomas) ? data.idiomas : [];

        const usuarioBD: User = {
          id: data.id,
          nombre: data.nombre,

          // 3. CLAVE: Usamos la foto real (columna 'foto' de su DB)
          foto:
            data.foto ||
            "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",

          usuario_idioma: idiomasArray.map((i: any, index: number) => ({
            nombre: i.nombre,
            id: data.id,
            tipo: index === 0 ? "nativo" : "aprender", // el primero nativo, el resto aprender
          })),
          edad: 0,
          pais: data.pais || "",
          bio: data.bio || "",
        };
        setCurrentUser(usuarioBD);
      })
      .catch((err) => console.error(`Error cargando usuario ${userId}:`, err));
  }, [userId]); // Dependencia clave

  if (!currentUser) return <p>Cargando perfil...</p>;

  // Lista de usuarios convertida a tipo User (filtrando al usuario logueado)
  const users: User[] = usuarios
    .filter((u) => u.id !== currentUser.id)
    .map((u: any) => usuarioToUser(u as Usuario));
  const currentCardUser = users[currentUserIndex];

  const saveMatch = async (userId1: number, userId2: number) => {
    try {
      const res = await fetch("http://localhost:5000/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario1_id: userId1, usuario2_id: userId2 }), // ✅ corregido
      });

      if (!res.ok) throw new Error("Error guardando match");

      const data = await res.json();
      console.log("Match guardado:", data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLike = async () => {
    setIsAnimating(true);

    setTimeout(async () => {
      if (currentCardUser && currentUser) {
        const userId1 = currentUser.id; // Usuario actual dando "like"
        const userId2 = currentCardUser.id; // Usuario que recibe el "like"

        // 1. ENVIAR LIKE y CHEQUEAR MUTUALIDAD en el backend
        const likeResponse = await fetch("http://localhost:5000/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            swiper_id: userId1,
            swiped_id: userId2,
          }),
        });

        if (!likeResponse.ok) {
          console.error("Error al registrar el like/chequear match");
          setIsAnimating(false);
          return;
        }

        const likeData = await likeResponse.json();

        // 2. AHORA: solo si el backend confirma un match mutuo
        if (likeData.matchFound) {
          // <--- AQUÍ ES DONDE VA EL BLOQUE
          setMatchedUser(currentCardUser); // Muestra el modal de MatchModal
          setMatches((prev) => [...prev, currentCardUser]); // Actualiza la lista de matches en el estado local

          // Guardar el match en la base de datos (tabla 'matches')
          const idA = Math.min(userId1, userId2);
          const idB = Math.max(userId1, userId2);
          await saveMatch(idA, idB); // Llama a la función para registrar el match en la BD
        }
      }

      setCurrentUserIndex((prev) => prev + 1);
      setIsAnimating(false);
    }, 500);
  };

  const handleDislike = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentUserIndex((prev) => prev + 1);
      setIsAnimating(false);
    }, 500);
  };

  const closeMatchModal = () => setMatchedUser(null);
  const handleViewMatches = () => setCurrentView("matches");
  const handleBackToDiscover = () => {
    setCurrentView("discover");
    setSelectedChatUser(null);
  };

  // CLAVE: Recibe el ID del match y el usuario para la ventana de chat
  const handleSelectChat = (matchId: number, user: User) => {
    setSelectedMatchId(matchId); // Guarda el ID del match
    setSelectedChatUser(user);
    setCurrentView("chat");
  };

  const handleBackToMatches = () => {
    setSelectedMatchId(null);
    setSelectedChatUser(null);
    setCurrentView("matches");
  };

  // Se usa `matches` para el contador del badge (aunque en un proyecto real se sincronizaría con useMatches)
  const mockMatches = matches.map((user, index) => {
    const idiomasNativos =
      user.usuario_idioma
        ?.filter((i) => i.tipo === "nativo")
        .map((i) => i.nombre) ?? [];
    const idiomasAprender =
      user.usuario_idioma
        ?.filter((i) => i.tipo === "aprender")
        .map((i) => i.nombre) ?? [];

    return {
      user: {
        ...user,
        idiomasNativos,
        idiomasAprender,
      },
      lastMessage:
        index === 0
          ? "¡Perfecto! Podemos organizar eso."
          : "That sounds interesting!",
      lastMessageTime: index === 0 ? "hace 2 min" : "hace 1 h",
      unreadCount: index === 0 ? 2 : 0,
      isOnline: index < 2,
    };
  });

  if (loading) return <p>Cargando usuarios...</p>;

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <span className="text-lg">🌍</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              LinguaMatch
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.foto} />
                <AvatarFallback>{currentUser.nombre.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block font-medium">
                {currentUser.nombre}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant={currentView === "discover" ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentView("discover")}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Descubrir</span>
              </Button>
              <Button
                variant={
                  currentView === "matches" || currentView === "chat"
                    ? "default"
                    : "ghost"
                }
                size="sm"
                onClick={handleViewMatches}
                className={`relative ${
                  currentView === "matches" || currentView === "chat"
                    ? "bg-primary text-white"
                    : ""
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Matches</span>
                {matches.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 text-xs bg-like text-white border-0 p-0 flex items-center justify-center">
                    {matches.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                // ANTES: onClick={() => (window.location.href = "/settings")}
                onClick={() => navigate("/settings")} // AHORA: Usa useNavigate
              >
                <Settings className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          {currentView === "discover" && (
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <div className="text-center space-y-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={currentUser.foto} />
                    <AvatarFallback className="text-2xl">
                      {currentUser.nombre.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{currentUser.nombre}</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Tu idioma
                      </p>
                      {currentUser.usuario_idioma
                        ?.filter((i) => i.tipo === "nativo")
                        .map((i, idx) => (
                          <Badge
                            key={idx}
                            className="bg-accent/10 text-accent border-accent/20 mr-1"
                          >
                            {i.nombre}
                          </Badge>
                        )) || <Badge variant="outline">Sin idioma</Badge>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Quieres aprender
                      </p>

                      {currentUser.usuario_idioma
                        ?.filter((i) => i.tipo === "aprender")
                        .map((i, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="border-primary/20 text-primary mr-1"
                          >
                            {i.nombre}
                          </Badge>
                        )) || <Badge variant="outline">Sin idioma</Badge>}
                    </div>
                  </div>
                  {matches.length > 0 && (
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">Matches</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        {matches.length}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleViewMatches}
                        className="w-full"
                      >
                        Ver matches
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Main Cards / Matches / Chat */}
          <div
            className={`${
              currentView === "discover" ? "lg:col-span-2" : "lg:col-span-3"
            }`}
          >
            <div className="flex justify-center">
              {currentView === "discover" && (
                <>
                  {currentUserIndex < users.length ? (
                    <div
                      className={`transition-all duration-500 ${
                        isAnimating
                          ? "scale-95 opacity-50"
                          : "scale-100 opacity-100"
                      }`}
                    >
                      <UserCard
                        user={currentCardUser}
                        onLike={handleLike}
                        onDislike={handleDislike}
                        isAnimating={isAnimating}
                      />
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <p>No hay más usuarios disponibles 😢</p>
                    </Card>
                  )}
                </>
              )}
              {currentUser && currentView === "matches" && (
                <ChatList
                  userId={currentUser.id}
                  onSelectChat={handleSelectChat}
                  onBackToDiscover={handleBackToDiscover}
                />
              )}

              {currentView === "chat" &&
                selectedChatUser &&
                selectedMatchId && (
                  <ChatWindow
                    user={selectedChatUser}
                    matchId={selectedMatchId} // <-- Se pasa el ID del match
                    currentUserId={userId} // <-- Se pasa el ID del usuario logueado
                    onBack={handleBackToMatches}
                  />
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Match modal */}
      {matchedUser && (
        <MatchModal user={matchedUser} onClose={closeMatchModal} />
      )}
    </div>
  );
};

export default Dashboard;
