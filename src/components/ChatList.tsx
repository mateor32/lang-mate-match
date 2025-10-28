import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Search,
  ArrowLeft,
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  User,
} from "lucide-react";
import { useMatches } from "@/hooks/useMatches";

interface User {
  id: number;
  nombre: string;
  foto: string;
  lastMessage?: string;
  lastMessageTime?: string;
  usuario_idioma?: {
    tipo: string;
    id: number;
    nombre: string;
  }[];
  isOnline?: boolean;
}

interface Message {
  id: number;
  text: string;
  timestamp: string;
  isMe: boolean;
}

export default function MatchesPage({
  userId,
  matches: propMatches,
  onBackToDiscover,
  onSelectChat,
}: {
  userId: number;
  matches: Match[];
  onBackToDiscover: () => void;
  onSelectChat: (user: User) => void;
}) {
  //const userId = 7; // Usuario logueado
  const { matches, loading } = useMatches(userId);

  const [selectedMatch, setSelectedMatch] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredMatches = matches.filter((user) =>
    user.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openChat = (user: User) => {
    setSelectedMatch(user);
    // Mensajes iniciales simulados
    setMessages([
      {
        id: 1,
        text: user.lastMessage || `¡Hola! Soy ${user.nombre}`,
        timestamp: user.lastMessageTime || "10:00",
        isMe: false,
      },
      {
        id: 2,
        text: "¡Hola! Encantado de conocerte.",
        timestamp: "10:01",
        isMe: true,
      },
    ]);
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: messages.length + 1,
      text: newMessage,
      timestamp: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMe: true,
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage("");

    // Respuesta simulada
    setTimeout(() => {
      const responses = [
        "¡Qué interesante!",
        "Me encanta eso",
        "¡Genial! Cuéntame más",
        "Exactamente, lo mismo pienso",
      ];
      const resp: Message = {
        id: messages.length + 2,
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isMe: false,
      };
      setMessages((prev) => [...prev, resp]);
    }, 1000);
  };

  if (loading) return <p className="text-center mt-10">Cargando...</p>;

  // Chat window
  if (selectedMatch) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="h-[600px] flex flex-col ">
          {/* Header Chat */}
          <div className="p-4 border-b bg-card flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMatch(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedMatch.foto} />
              <AvatarFallback>{selectedMatch.nombre.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{selectedMatch.nombre}</h3>
              {/* Último mensaje */}
              {selectedMatch.lastMessage && (
                <p className="text-xs text-muted-foreground truncate">
                  {selectedMatch.lastMessage}
                </p>
              )}
              {/* Idiomas debajo del nombre */}
              <div className="flex gap-1 mt-1">
                {selectedMatch.usuario_idioma?.slice(0, 2).map((idioma, i) => (
                  <Badge
                    key={i}
                    className="text-xs bg-accent/20 text-accent border-0"
                  >
                    {idioma.nombre}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex gap-2 max-w-[80%] ${
                    msg.isMe ? "flex-row-reverse" : ""
                  }`}
                >
                  {!msg.isMe && (
                    <Avatar className="w-8 h-8 mt-auto">
                      <AvatarImage src={selectedMatch.foto} />
                      <AvatarFallback>
                        {selectedMatch.nombre.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="space-y-1">
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        msg.isMe
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <p
                      className={`text-xs text-muted-foreground px-1 ${
                        msg.isMe ? "text-right" : ""
                      }`}
                    >
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t flex items-end gap-2">
            <Button variant="ghost" size="sm" className="mb-1">
              <Paperclip className="w-4 h-4" />
            </Button>
            <div className="flex-1 relative">
              <Input
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="pr-10 resize-none rounded-full"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              size="sm"
              className="rounded-full w-10 h-10 p-0 mb-1"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Matches List
  return (
    <div className="max-w-md mx-auto">
      <Card className="h-[600px] w-[400px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-primary text-white rounded-t-lg flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <MessageCircle className="w-5 h-5" />
            <h2 className="font-bold text-lg">Matches</h2>
          </div>
          <Badge className="bg-white/20 text-white border-0">
            {matches.length}
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
                  {matches.length === 0
                    ? "Sin matches aún"
                    : "No se encontraron coincidencias"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {matches.length === 0
                    ? "¡Sigue deslizando para encontrar compañeros de idiomas!"
                    : "Prueba buscar otro nombre"}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {filteredMatches.map((user) => (
                <div
                  key={user.id}
                  onClick={() => openChat(user)}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.foto} />
                      <AvatarFallback>{user.nombre.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {user.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                      <h3 className="font-medium truncate">{user.nombre}</h3>

                      {user.lastMessage && (
                        <p className="text-sm text-muted-foreground truncate">
                          {user.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
