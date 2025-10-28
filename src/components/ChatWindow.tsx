// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/src/components/ChatWindow.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Smile, Paperclip, MoreVertical } from "lucide-react";

// Interfaz para el usuario (usando la estructura de datos del proyecto)
interface User {
  id: number;
  nombre: string;
  edad: number;
  pais: string;
  usuario_idioma?: {
    tipo: string;
    id: number;
    nombre: string;
  }[];
  foto: string;
  bio?: string;
  intereses?: string[];
}

// Interfaz para mensajes que vienen de la DB
interface DbMessage {
  id: number;
  match_id: number;
  sender_id: number;
  message: string; // Contenido del mensaje de la DB
  created_at: string; // Timestamp de la DB
}

// Interfaz para el estado del componente
interface Message extends DbMessage {
  text: string;
  timestamp: string;
  isMe: boolean;
  isSending?: boolean; // Para manejar el estado de envío en el frontend
}

interface ChatWindowProps {
  user: User;
  matchId: number; // ID del match (registro en la tabla 'matches')
  currentUserId: number; // ID del usuario logueado
  onBack: () => void;
}

const ChatWindow = ({
  user,
  matchId,
  currentUserId,
  onBack,
}: ChatWindowProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Lógica para obtener mensajes de la API
  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${matchId}`);
      if (!res.ok) throw new Error("Error al cargar mensajes");

      const data: DbMessage[] = await res.json();

      const convertedMessages: Message[] = data.map((msg: DbMessage) => ({
        ...msg,
        // Adaptar campos de la DB al formato del componente
        text: msg.message,
        isMe: msg.sender_id === currentUserId,
        timestamp: new Date(msg.created_at).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isSending: false,
      }));

      setMessages(convertedMessages);
    } catch (error) {
      console.error("Error al cargar mensajes:", error);
    }
  }, [matchId, currentUserId]);

  // Ejecutar al cargar y cada vez que cambie el matchId
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Ejecutar al recibir nuevos mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Lógica para enviar mensajes a la API
  const handleSendMessage = async () => {
    if (message.trim()) {
      const messageToSend = message.trim();

      // 1. Mensaje temporal (Optimistic update)
      const tempId = Date.now();
      const tempMessage: Message = {
        id: tempId,
        match_id: matchId,
        sender_id: currentUserId,
        message: messageToSend,
        created_at: new Date().toISOString(),
        text: messageToSend,
        timestamp: new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isMe: true,
        isSending: true,
      };

      setMessages((prev) => [...prev, tempMessage]);
      setMessage(""); // Limpiar el input

      try {
        const res = await fetch("http://localhost:5000/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match_id: matchId,
            sender_id: currentUserId,
            message: messageToSend,
          }),
        });

        if (!res.ok) throw new Error("Error al enviar el mensaje al backend");

        // 2. Éxito: Recargar mensajes para obtener el ID real de la DB
        await fetchMessages();
      } catch (error) {
        console.error("Error al enviar mensaje:", error);
        // 3. Fallo: Revertir el mensaje temporal
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Obtener idiomas nativos para el header/tip
  const nativeLanguages =
    user.usuario_idioma
      ?.filter((i) => i.tipo === "nativo")
      .map((i) => i.nombre) || [];
  const partnerNativeLang =
    nativeLanguages.length > 0 ? nativeLanguages[0] : "Nativo";

  // Nota: Dado que `currentUser` no está disponible aquí, asumiremos el español como idioma nativo del usuario logueado para el tip, o se obtendría del contexto del Dashboard.
  const myNativeLang = "Español";

  return (
    <div className="max-w-md mx-auto">
      <Card className="h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <Avatar className="w-10 h-10">
              <AvatarImage src={user.foto} />
              <AvatarFallback>{user.nombre.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{user.nombre}</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-xs text-muted-foreground">En línea</span>
              </div>
            </div>

            <div className="flex gap-1">
              {nativeLanguages.map((idioma, index) => (
                <Badge
                  key={index}
                  className="text-xs bg-accent/20 text-accent border-0"
                >
                  {idioma}
                </Badge>
              ))}
            </div>

            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
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
                    <AvatarImage src={user.foto} />
                    <AvatarFallback className="text-xs">
                      {user.nombre.charAt(0)}
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
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                  <p
                    className={`text-xs text-muted-foreground px-1 ${
                      msg.isMe ? "text-right" : ""
                    }`}
                  >
                    {msg.timestamp}
                    {msg.isSending && msg.isMe && " (Enviando...)"}
                  </p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Language tip */}
        <div className="px-4 py-2 bg-muted/30 border-t border-b">
          <p className="text-xs text-center text-muted-foreground">
            💡 Practica en ambos idiomas: {partnerNativeLang} ↔ {myNativeLang}
          </p>
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="sm" className="mb-1">
              <Paperclip className="w-4 h-4" />
            </Button>

            <div className="flex-1 relative">
              <Input
                placeholder="Escribe un mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
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
              onClick={handleSendMessage}
              disabled={!message.trim()}
              size="sm"
              className="rounded-full w-10 h-10 p-0 mb-1"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatWindow;
