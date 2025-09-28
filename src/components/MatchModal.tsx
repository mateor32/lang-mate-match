import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, X } from "lucide-react";

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

interface MatchModalProps {
  user: User;
  onClose: () => void;
}

const MatchModal = ({ user, onClose }: MatchModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-8 animate-bounce-in relative">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-center space-y-6">
          {/* Match Icon */}
          <div className="relative">
            <div className="w-32 h-32 mx-auto bg-gradient-primary rounded-full flex items-center justify-center text-6xl animate-pulse">
              ✨
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-match rounded-full flex items-center justify-center animate-bounce">
              <span className="text-white font-bold">❤️</span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ¡Es un Match! 🎉
            </h2>
            <p className="text-muted-foreground">
              A ti y a <span className="font-semibold text-foreground">{user.nombre}</span> se gustaron mutuamente
            </p>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.foto} />
              <AvatarFallback className="text-xl">{user.nombre.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <h3 className="font-bold text-lg">{user.nombre}</h3>
              <p className="text-sm text-muted-foreground">{user.pais}</p>
              <div className="flex gap-2 mt-1">
                {user.idiomasNativos.map((idioma, index) => (
                  <span key={index} className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                    {idioma}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              className="w-full bg-gradient-primary text-white font-semibold py-3 rounded-xl transition-smooth"
              size="lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Enviar mensaje
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={onClose}
            >
              Seguir viendo perfiles
            </Button>
          </div>

          {/* Celebration text */}
          <p className="text-xs text-muted-foreground">
            ¡Ahora pueden chatear y practicar idiomas juntos!
          </p>
        </div>
      </Card>
    </div>
  );
};

export default MatchModal;