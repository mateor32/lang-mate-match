import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Smile, Paperclip, MoreVertical } from "lucide-react";

interface User {
  id: number;
  nombre: string;
  edad: number;
  pais: string;
  idiomasNativos: string[];
  idiomasAprender: string[];
  foto: string;
  bio?: string;
  intereses?: string[];
}

interface Message {
  id: number;
  text: string;
  timestamp: string;
  isMe: boolean;
  isRead?: boolean;
}

interface ChatWindowProps {
  user: User;
  onBack: () => void;
}

const ChatWindow = ({ user, onBack }: ChatWindowProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "¡Hola! Vi que también estás aprendiendo español. Me encantaría practicar contigo 😊",
      timestamp: "10:30",
      isMe: false,
    },
    {
      id: 2,
      text: "¡Hola! Claro, me parece genial. Yo hablo español nativo y estoy aprendiendo inglés",
      timestamp: "10:32",
      isMe: true,
    },
    {
      id: 3,
      text: "Perfect! We can help each other. What topics do you like to talk about?",
      timestamp: "10:33",
      isMe: false,
    },
    {
      id: 4,
      text: "Me gusta hablar sobre viajes, cultura, música... ¿y tú?",
      timestamp: "10:35",
      isMe: true,
    },
    {
      id: 5,
      text: "Same here! I love traveling. Have you been to the US before?",
      timestamp: "10:36",
      isMe: false,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: message,
        timestamp: new Date().toLocaleTimeString("es-ES", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        isMe: true,
      };

      setMessages(prev => [...prev, newMessage]);
      setMessage("");

      // Simulate response after 2 seconds
      setTimeout(() => {
        const responses = [
          "That sounds interesting! Tell me more.",
          "¡Qué genial! Me encanta esa idea.",
          "I agree! What do you think about...?",
          "Exactly! I feel the same way.",
          "¡Perfecto! Podemos organizar eso.",
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        setMessages(prev => [...prev, {
          id: prev.length + 1,
          text: randomResponse,
          timestamp: new Date().toLocaleTimeString("es-ES", { 
            hour: "2-digit", 
            minute: "2-digit" 
          }),
          isMe: false,
        }]);
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
              {user.idiomasNativos.map((idioma, index) => (
                <Badge key={index} className="text-xs bg-accent/20 text-accent border-0">
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
              <div className={`flex gap-2 max-w-[80%] ${msg.isMe ? "flex-row-reverse" : ""}`}>
                {!msg.isMe && (
                  <Avatar className="w-8 h-8 mt-auto">
                    <AvatarImage src={user.foto} />
                    <AvatarFallback className="text-xs">{user.nombre.charAt(0)}</AvatarFallback>
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
                  <p className={`text-xs text-muted-foreground px-1 ${msg.isMe ? "text-right" : ""}`}>
                    {msg.timestamp}
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
            💡 Practica en ambos idiomas: {user.idiomasNativos[0]} ↔ Español
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