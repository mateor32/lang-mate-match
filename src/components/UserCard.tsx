import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, X, MapPin, MessageCircle } from "lucide-react";

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

interface UserCardProps {
  user: User;
  onLike: () => void;
  onDislike: () => void;
  isAnimating?: boolean;
}

const UserCard = ({ user, onLike, onDislike, isAnimating }: UserCardProps) => {
  return (
    <Card className={`relative w-full max-w-sm mx-auto overflow-hidden shadow-card hover:shadow-elevated transition-smooth ${isAnimating ? 'pointer-events-none' : ''}`}>
      {/* Profile Image */}
      <div className="relative aspect-[4/5] overflow-hidden">
        <img 
          src={user.foto} 
          alt={`Perfil de ${user.nombre}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Age Badge */}
        <div className="absolute top-4 right-4">
          <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
            {user.edad}
          </Badge>
        </div>

        {/* Name and Location */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-2xl font-bold mb-1">{user.nombre}</h3>
          <div className="flex items-center gap-1 text-white/80 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{user.pais}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Languages */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Idiomas nativos</p>
            <div className="flex flex-wrap gap-2">
              {user.idiomasNativos.map((idioma, index) => (
                <Badge key={index} className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
                  {idioma}
                </Badge>
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Quiere aprender</p>
            <div className="flex flex-wrap gap-2">
              {user.idiomasAprender.map((idioma, index) => (
                <Badge key={index} variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                  {idioma}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">{user.bio}</p>
          </div>
        )}

        {/* Interests */}
        {user.intereses && user.intereses.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Intereses</p>
            <div className="flex flex-wrap gap-2">
              {user.intereses.slice(0, 3).map((interes, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {interes}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-2">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 border-2 border-dislike/20 text-dislike hover:bg-dislike hover:text-white hover:border-dislike transition-smooth"
            onClick={onDislike}
          >
            <X className="w-5 h-5 mr-2" />
            Pasar
          </Button>
          
          <Button
            size="lg"
            className="flex-1 bg-like hover:bg-like/90 text-white transition-smooth"
            onClick={onLike}
          >
            <Heart className="w-5 h-5 mr-2" />
            Me gusta
          </Button>
        </div>

        {/* Chat hint */}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <MessageCircle className="w-3 h-3" />
            Ambos deben dar like para chatear
          </p>
        </div>
      </div>
    </Card>
  );
};

export default UserCard;