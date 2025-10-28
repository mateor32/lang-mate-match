import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";

interface User {
  id: number;
  nombre: string;
  edad: number;
  pais: string;
  usuario_idioma?: {
    tipo: string,
    id: number,
    nombre: string,
  }[];
  intereses?: { id: number, nombre: string }[];
  foto: string;
  bio?: string;
}
interface Match {
  user: User;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
}

interface ChatListProps {
  matches: Match[];
  onBackToDiscover: () => void;
  onSelectChat: (user: User) => void;
}

const ChatList = ({
  matches,
  onBackToDiscover,
  onSelectChat,
}: ChatListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMatches = matches.filter((match) =>
    match.user.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto">
      <Card className="h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-primary text-white rounded-t-lg">
          <div className="flex items-center gap-3">
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
              //{matches.length}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar conversaciones..."
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
                  {matches.length === 0
                    ? "Sin matches aún"
                    : "No hay conversaciones"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {matches.length === 0
                    ? "¡Sigue deslizando para encontrar compañeros de idiomas!"
                    : "No se encontraron conversaciones con ese nombre"}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMatches.map((match) => (
                <div
                  key={match.user.id}
                  onClick={() => onSelectChat(match.user)}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={match.user.foto} />
                        <AvatarFallback>
                          {match.user.nombre.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {match.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent border-2 border-white rounded-full"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">
                          {match.user.nombre}
                        </h3>
                        {match.lastMessageTime && (
                          <span className="text-xs text-muted-foreground">
                            {match.lastMessageTime}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex gap-1">
                          {match.user.usuario_idioma
                            .slice(0, 2)
                            .map((idioma, index) => (
                              <span
                                key={index}
                                className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded"
                              >
                                {idioma.nombre}
                              </span>
                            ))}
                        </div>
                      </div>

                      {match.lastMessage && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {match.lastMessage}
                        </p>
                      )}
                    </div>

                    {match.unreadCount && match.unreadCount > 0 && (
                      <Badge className="bg-primary text-white h-5 min-w-5 text-xs">
                        {match.unreadCount > 9 ? "9+" : match.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer tip */}
        {matches.length === 0 && (
          <div className="p-4 border-t bg-muted/30">
            <p className="text-xs text-center text-muted-foreground">
              💡 Tip: Da "like" a más perfiles para conseguir matches
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ChatList;
