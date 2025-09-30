// src/components/Dashboard.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, MessageCircle, Heart, Search } from "lucide-react";

import UserCard from "./UserCard";
import MatchModal from "./MatchModal";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";

import { useUsuarios, Usuario } from "@/hooks/useUsuarios";
import { usuarioToUser, User } from "@/utils/usuarioToUser";

interface DashboardProps {
  onLogout: () => void;
}

type ViewType = "discover" | "matches" | "chat";

const Dashboard = ({ onLogout }: DashboardProps) => {
  const { usuarios, loading } = useUsuarios();
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<User[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>("discover");
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);

  // Usuario actual mock (puedes reemplazar por tu sesión real)
  // Ejemplo al crear un user
  const [currentUser, setCurrentUser] = useState<User>({
    id: 1,
    nombre: "Mateo",
    email: "mateo@example.com",
    edad: 22,
    pais: "Colombia",
    idiomasNativos: ["Español"],
    idiomasAprender: ["Inglés"],
    foto: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  });

  // Lista de usuarios convertida a tipo User
  const users: User[] = usuarios.map(usuarioToUser);

  const currentCardUser = users[currentUserIndex];

  const handleLike = () => {
    setIsAnimating(true);
    const isMatch = Math.random() > 0.5;

    setTimeout(() => {
      if (isMatch && currentCardUser) {
        setMatchedUser(currentCardUser);
        setMatches((prev) => [...prev, currentCardUser]);
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
  const handleSelectChat = (user: User) => {
    setSelectedChatUser(user);
    setCurrentView("chat");
  };
  const handleBackToMatches = () => {
    setSelectedChatUser(null);
    setCurrentView("matches");
  };

  const mockMatches = matches.map((user, index) => ({
    user,
    lastMessage:
      index === 0
        ? "¡Perfecto! Podemos organizar eso."
        : "That sounds interesting!",
    lastMessageTime: index === 0 ? "hace 2 min" : "hace 1 h",
    unreadCount: index === 0 ? 2 : 0,
    isOnline: index < 2,
  }));

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
              <Button variant="ghost" size="sm">
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
                    <p className="text-muted-foreground">{currentUser.email}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Tu idioma
                      </p>
                      <Badge className="bg-accent/10 text-accent border-accent/20">
                        {currentUser.idiomasNativos[0]}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Quieres aprender
                      </p>
                      <Badge
                        variant="outline"
                        className="border-primary/20 text-primary"
                      >
                        {currentUser.idiomasAprender[0]}
                      </Badge>
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

              <ChatList
                matches={mockMatches}
                onSelectChat={handleSelectChat}
                onBackToDiscover={handleBackToDiscover}
              />

              {currentView === "chat" && selectedChatUser && (
                <ChatWindow
                  user={selectedChatUser}
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
