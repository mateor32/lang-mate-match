// mateor32/lang-mate-match/mateor32-lang-mate-match-13c709073e7292ab8e58547abd2a20fbcfde7497/src/components/ChatWindow.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  Smile,
  Video,
  Phone,
  Paperclip,
  MoreVertical,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { io, Socket } from "socket.io-client";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:10000" ||
  "http://localhost:5000";

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

// WebRTC Configuration
const iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }, // Servidor STUN público de Google
  ],
};

let socket: Socket;
let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;

const ChatWindow = ({
  user,
  matchId,
  currentUserId,
  onBack,
}: ChatWindowProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

  const myAudio = useRef<HTMLAudioElement | null>(null);
  const userAudio = useRef<HTMLAudioElement | null>(null);
  const currentUserName = "Mi Usuario"; // Placeholder: Idealmente se obtendría del estado de autenticación

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // -----------------------------------------------------
  // LÓGICA DE WEBRTC (Núcleo)
  // -----------------------------------------------------

  // Obtener el stream de audio/video local
  const getLocalStream = async (callType: "video" | "audio") => {
    try {
      const constraints = {
        video: callType === "video" ? { width: 640, height: 480 } : false,
        audio: true,
      };
      localStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (myAudio.current) {
        myAudio.current.srcObject = localStream;
        myAudio.current.muted = true;
      }
      return localStream;
    } catch (err) {
      console.error("Error al obtener el stream local:", err);
      toast({
        title: "Error de Media",
        description: "Asegúrate de permitir el acceso a tu micrófono/cámara.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Función para cerrar la conexión P2P y limpiar
  const handleEndCall = (emitEvent: boolean = true) => {
    if (emitEvent) {
      socket.emit("call-ended", { toId: user.id });
    }

    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
    }
    remoteStream = null;

    setIsCallActive(false);
    setIsCalling(false);
    toast({
      title: "Llamada Finalizada",
      description: "La conexión ha sido cerrada.",
    });

    if (myAudio.current) myAudio.current.srcObject = null;
    if (userAudio.current) userAudio.current.srcObject = null;
  };

  // Configuración de la conexión P2P
  const setupPeerConnection = useCallback(
    (userToId: number) => {
      if (peerConnection) {
        peerConnection.close();
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnection = pc;

      // 1. Manejo de ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", {
            toId: userToId,
            candidate: event.candidate,
          });
        }
      };

      // 2. Manejo del stream remoto
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStream = event.streams[0];
          if (userAudio.current) {
            userAudio.current.srcObject = remoteStream;
            userAudio.current
              .play()
              .catch((e) =>
                console.error("Error al reproducir audio remoto:", e)
              );
          }
        }
      };

      // 3. Añadir stream local a la conexión
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream as MediaStream);
        });
      }

      return pc;
    },
    [user.id, currentUserId]
  );

  // Función para iniciar el proceso de llamada
  const handleInitiateCall = async (callType: "video" | "audio") => {
    if (isCalling || isCallActive) return;

    setIsCalling(true);

    const stream = await getLocalStream(callType);
    if (!stream) {
      setIsCalling(false);
      return;
    }

    const pc = setupPeerConnection(user.id);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        userToCallId: user.id,
        signal: pc.localDescription, // Enviar la Oferta SDP
        from: currentUserId,
        name: currentUserName,
        callType: callType, // Para que el receptor sepa si es video o solo audio
      });

      toast({
        title: `Llamando a ${user.nombre}...`,
        description: `Esperando respuesta...`,
      });
    } catch (error) {
      console.e(error);
      toast({
        title: "Error de Llamada",
        description: "Fallo al iniciar la llamada.",
      });
      handleEndCall(false);
    }
  };

  // -----------------------------------------------------
  // EFECTOS Y SOCKET.IO (Señalización)
  // -----------------------------------------------------
  useEffect(() => {
    // FIX: Path explícito para entornos como Render
    socket = io(API_BASE_URL, {
      path: "/api/socket.io/",
    });

    socket.on("connect", () => {
      socket.emit("user-connected", currentUserId);
    });

    // 1. Recibir Llamada (Responder)
    socket.on("receive-call", async ({ signal, from, name, callType }) => {
      const accept = window.confirm(
        `Llamada entrante de ${name} (${callType}). ¿Aceptar?`
      );

      if (accept) {
        setIsCallActive(true);

        await getLocalStream(callType);
        const pc = setupPeerConnection(from);

        // Establecer Oferta remota, crear Respuesta, y enviarla
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("accept-call", {
          signal: pc.localDescription,
          toId: from,
        });
        toast({
          title: "Llamada aceptada",
          description: `Iniciando con ${name}`,
        });
      } else {
        // Se puede emitir un evento 'call-rejected' si es necesario
      }
    });

    // 2. Aceptación de Llamada (Iniciador)
    socket.on("call-accepted", async (signal) => {
      setIsCallActive(true);
      setIsCalling(false);
      await peerConnection?.setRemoteDescription(
        new RTCSessionDescription(signal)
      );
      toast({
        title: "Conectado",
        description: `Llamada con ${user.nombre} iniciada.`,
      });
    });

    // 3. ICE Candidates
    socket.on("ice-candidate", (candidate) => {
      try {
        peerConnection?.addIceCandidate(candidate);
      } catch (e) {
        console.error("Error añadiendo ICE candidate:", e);
      }
    });

    // 4. Finalizar Llamada
    socket.on("call-ended", () => {
      handleEndCall(false);
    });

    return () => {
      socket.disconnect();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentUserId, setupPeerConnection]); // Dependencias: currentUserId, setupPeerConnection

  // Ejecutar al cargar y cada vez que cambie el matchId (para mensajes)
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Ejecutar al recibir nuevos mensajes (para scroll)
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ... (Lógica de mensajes y match eliminados, omitida por brevedad)
  // ...

  // Lógica para enviar mensajes a la API
  const fetchMessages = useCallback(async () => {
    /* ... */
  }, [matchId, currentUserId]);
  const handleSendMessage = async () => {
    /* ... */
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    /* ... */
  };
  const handleDeleteMatch = async () => {
    /* ... */
  };

  const nativeLanguages =
    user.usuario_idioma
      ?.filter((i) => i.tipo === "nativo")
      .map((i) => i.nombre) || [];
  const partnerNativeLang =
    nativeLanguages.length > 0 ? nativeLanguages[0] : "Nativo";
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

            {/* --- BOTONES DE LLAMADA --- */}
            {isCallActive || isCalling ? (
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleEndCall(true)}
                title="Finalizar Llamada"
                className="w-10 h-10"
                disabled={!isCallActive && isCalling}
              >
                <X className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleInitiateCall("audio")}
                  title="Llamada de Voz"
                  className="w-10 h-10 hover:bg-green-500/10 text-green-500"
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleInitiateCall("video")}
                  title="Videollamada"
                  className="w-10 h-10 hover:bg-primary/10 text-primary"
                >
                  <Video className="w-4 h-4" />
                </Button>
              </>
            )}

            {/* Botón de eliminar match */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteMatch}
              title="Eliminar match y chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Elementos de Audio (ocultos) */}
        <audio
          ref={myAudio}
          autoPlay
          muted
          playsInline
          style={{ display: "none" }}
        />
        <audio
          ref={userAudio}
          autoPlay
          playsInline
          style={{ display: "none" }}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Indicador de llamada si no hay mensajes o está activo */}
          {isCalling && (
            <div className="p-4 bg-yellow-100 text-yellow-800 text-center rounded-md">
              Llamando a {user.nombre}... 📞
            </div>
          )}
          {isCallActive && (
            <div className="p-4 bg-green-100 text-green-800 text-center rounded-md">
              ¡Llamada activa! Estás conectado con {user.nombre}. 🎤
            </div>
          )}

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
