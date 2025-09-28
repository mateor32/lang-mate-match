import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, Users, MessageCircle, Heart, Search } from "lucide-react";
import UserCard from "./UserCard";
import MatchModal from "./MatchModal";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";

// Mock data
const currentUser = {
  nombre: "Ana García",
  email: "ana@example.com",
  idiomaNativo: "Español",
  idiomaAprender: "Inglés",
  foto: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
};

const mockUsers = [
  {
    id: 1,
    nombre: "James Wilson",
    edad: 28,
    pais: "Estados Unidos",
    idiomasNativos: ["Inglés"],
    idiomasAprender: ["Español"],
    foto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=500&fit=crop&crop=face",
    bio: "Teacher from New York. I love traveling and learning about different cultures. Looking to improve my Spanish!",
    intereses: ["Viajes", "Música", "Cocina"],
  },
  {
    id: 2,
    nombre: "Marie Dubois",
    edad: 25,
    pais: "Francia",
    idiomasNativos: ["Francés"],
    idiomasAprender: ["Español", "Inglés"],
    foto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=500&fit=crop&crop=face",
    bio: "Artist from Paris. I enjoy painting and exploring new languages through conversation.",
    intereses: ["Arte", "Literatura", "Cine"],
  },
  {
    id: 3,
    nombre: "Hiroshi Tanaka",
    edad: 30,
    pais: "Japón",
    idiomasNativos: ["Japonés"],
    idiomasAprender: ["Español"],
    foto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop&crop=face",
    bio: "Software engineer passionate about languages and technology. Let's practice together!",
    intereses: ["Tecnología", "Anime", "Deportes"],
  },
];

interface DashboardProps {
  onLogout: () => void;
}

type ViewType = "discover" | "matches" | "chat";

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [matchedUser, setMatchedUser] = useState<typeof mockUsers[0] | null>(null);
  const [matches, setMatches] = useState<typeof mockUsers>([]);
  const [currentView, setCurrentView] = useState<ViewType>("discover");
  const [selectedChatUser, setSelectedChatUser] = useState<typeof mockUsers[0] | null>(null);

  const currentCardUser = mockUsers[currentUserIndex];

  const handleLike = () => {
    setIsAnimating(true);
    
    // Simulate match (50% chance for demo)
    const isMatch = Math.random() > 0.5;
    
    setTimeout(() => {
      if (isMatch && currentCardUser) {
        setMatchedUser(currentCardUser);
        setMatches(prev => [...prev, currentCardUser]);
      }
      
      setCurrentUserIndex(prev => prev + 1);
      setIsAnimating(false);
    }, 500);
  };

  const handleDislike = () => {
    setIsAnimating(true);
    
    setTimeout(() => {
      setCurrentUserIndex(prev => prev + 1);
      setIsAnimating(false);
    }, 500);
  };

  const closeMatchModal = () => {
    setMatchedUser(null);
  };

  const handleViewMatches = () => {
    setCurrentView("matches");
  };

  const handleBackToDiscover = () => {
    setCurrentView("discover");
    setSelectedChatUser(null);
  };

  const handleSelectChat = (user: typeof mockUsers[0]) => {
    setSelectedChatUser(user);
    setCurrentView("chat");
  };

  const handleBackToMatches = () => {
    setSelectedChatUser(null);
    setCurrentView("matches");
  };

  // Create mock matches with chat data
  const mockMatches = matches.map((user, index) => ({
    user,
    lastMessage: index === 0 ? "¡Perfecto! Podemos organizar eso." : "That sounds interesting!",
    lastMessageTime: index === 0 ? "hace 2 min" : "hace 1 h",
    unreadCount: index === 0 ? 2 : 0,
    isOnline: index < 2,
  }));

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
              <span className="hidden sm:block font-medium">{currentUser.nombre}</span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={currentView === "discover" ? "default" : "ghost"} 
                size="sm"
                onClick={() => setCurrentView("discover")}
                className={currentView === "discover" ? "bg-primary text-white" : ""}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Descubrir</span>
              </Button>
              <Button 
                variant={currentView === "matches" || currentView === "chat" ? "default" : "ghost"} 
                size="sm"
                onClick={handleViewMatches}
                className={`relative ${currentView === "matches" || currentView === "chat" ? "bg-primary text-white" : ""}`}
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

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Sidebar - Only show on discover view */}
          {currentView === "discover" && (
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <div className="text-center space-y-4">
                  <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={currentUser.foto} />
                    <AvatarFallback className="text-2xl">{currentUser.nombre.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="text-xl font-bold">{currentUser.nombre}</h3>
                    <p className="text-muted-foreground">{currentUser.email}</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Tu idioma</p>
                      <Badge className="bg-accent/10 text-accent border-accent/20">
                        {currentUser.idiomaNativo}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Quieres aprender</p>
                      <Badge variant="outline" className="border-primary/20 text-primary">
                        {currentUser.idiomaAprender}
                      </Badge>
                    </div>
                  </div>

                  {matches.length > 0 && (
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm">Matches</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">{matches.length}</p>
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

          {/* Main Content */}
          <div className={`${currentView === "discover" ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <div className="flex justify-center">
              {currentView === "discover" && (
                <>
                  {currentUserIndex < mockUsers.length ? (
                    <div className={`transition-all duration-500 ${isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}>
                      <UserCard
                        user={currentCardUser}
                        onLike={handleLike}
                        onDislike={handleDislike}
                        isAnimating={isAnimating}
                      />
                    </div>
                  ) : (
                    <Card className="p-8 text-center max-w-sm">
                      <div className="space-y-4">
                        <span className="text-6xl">🎉</span>
                        <h3 className="text-xl font-bold">¡Has visto todos los perfiles!</h3>
                        <p className="text-muted-foreground">
                          Vuelve más tarde para ver nuevos usuarios
                        </p>
                        <Button 
                          onClick={() => setCurrentUserIndex(0)}
                          className="bg-gradient-primary text-white"
                        >
                          Ver de nuevo
                        </Button>
                      </div>
                    </Card>
                  )}
                </>
              )}

              {currentView === "matches" && (
                <ChatList
                  matches={mockMatches}
                  onBackToDiscover={handleBackToDiscover}
                  onSelectChat={handleSelectChat}
                />
              )}

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

      {/* Match Modal */}
      {matchedUser && (
        <MatchModal user={matchedUser} onClose={closeMatchModal} />
      )}
    </div>
  );
};

export default Dashboard;