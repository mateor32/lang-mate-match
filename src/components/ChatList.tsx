// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/src/components/ChatList.tsx
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, ArrowLeft } from "lucide-react";
// Se importa MatchWithUser del hook actualizado
import { useMatches, MatchWithUser } from "@/hooks/useMatches";
import { User } from "@/utils/usuarioToUser"; // Se reusa la interfaz User existente

interface UserMinimal extends User {}

export default function ChatList({
  userId,
  onBackToDiscover,
  // Firma actualizada: ahora recibe matchId y los datos del usuario
  onSelectChat,
}: {
  userId: number;
  onBackToDiscover: () => void;
  onSelectChat: (matchId: number, user: UserMinimal) => void;
}) {
  // Se usa el hook refactorizado que devuelve MatchWithUser[]
  const { matches: matchWithUsers, loading } = useMatches(userId);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredMatches = matchWithUsers.filter((match) =>
    match.otherUser.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Función para abrir el chat, usando MatchWithUser
  const openChat = useCallback(
    (match: MatchWithUser) => {
      const userToPass: UserMinimal = match.otherUser;
      onSelectChat(match.matchId, userToPass); // Se pasa el matchId y el usuario
    },
    [onSelectChat]
  );

  if (loading) return <p className="text-center mt-10">Cargando...</p>;

  // Matches List UI
  return (
    <div className="max-w-md mx-auto">
      {/* CLAVE: Se mantiene la clase w-[400px] para el tamaño */}
      <Card className="h-[600px] w-[400px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-primary text-white rounded-t-lg flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToDiscover}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <MessageCircle className="w-5 h-5" />
            <h2 className="font-bold text-lg">Matches</h2>
          </div>
          <Badge className="bg-white/20 text-white border-0">
            {matchWithUsers.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar matches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto">
          {filteredMatches.length === 0 ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium text-muted-foreground">
                  {matchWithUsers.length === 0
                    ? "Sin matches aún"
                    : "No se encontraron coincidencias"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {matchWithUsers.length === 0
                    ? "¡Sigue deslizando para encontrar compañeros de idiomas!"
                    : "Prueba buscar otro nombre"}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMatches.map((match) => (
                <div
                  key={match.matchId}
                  onClick={() => openChat(match)}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={match.otherUser.foto} />
                      <AvatarFallback>
                        {match.otherUser.nombre.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {match.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                      <h3 className="font-medium truncate">
                        {match.otherUser.nombre}
                      </h3>

                      {match.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {match.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Footer tip */}
        {matchWithUsers.length === 0 && (
          <div className="p-4 border-t bg-muted/30">
            <p className="text-xs text-center text-muted-foreground">
              💡 Tip: Da "like" a más perfiles para conseguir matches
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
