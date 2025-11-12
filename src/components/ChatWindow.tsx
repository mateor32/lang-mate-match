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
  currentUserNativeLang: string;
}

const ChatWindow = ({
  user,
  matchId,
  currentUserId,
  onBack,
  currentUserNativeLang, // <--- NUEVA PROP
}: ChatWindowProps) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

  // --- REFS para elementos mutables (Solución al ReferenceError) ---
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const myAudio = useRef<HTMLAudioElement | null>(null);
  const userAudio = useRef<HTMLAudioElement | null>(null);

  const iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };
  const currentUserName = "Mi Usuario";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // -----------------------------------------------------
  // LÓGICA DE WEBRTC (Núcleo)
  // -----------------------------------------------------

  // Función para cerrar la conexión P2P y limpiar
  const handleEndCall = useCallback(
    (emitEvent: boolean = true) => {
      if (emitEvent && socketRef.current) {
        socketRef.current.emit("call-ended", { toId: user.id });
      }

      // Cerrar la conexión P2P y detener los streams de media
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      remoteStreamRef.current = null;

      setIsCallActive(false);
      setIsCalling(false);
      toast({
        title: "Llamada Finalizada",
        description: "La conexión ha sido cerrada.",
      });

      if (myAudio.current) myAudio.current.srcObject = null;
      if (userAudio.current) userAudio.current.srcObject = null;
    },
    [user.id]
  );

  // Obtener el stream de audio/video local
  const getLocalStream = useCallback(async (callType: "video" | "audio") => {
    try {
      const constraints = {
        video: callType === "video" ? { width: 640, height: 480 } : false,
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (myAudio.current) {
        myAudio.current.srcObject = stream;
        myAudio.current.muted = true;
      }
      return stream;
    } catch (err) {
      console.error("Error al obtener el stream local:", err);
      toast({
        title: "Error de Media",
        description: "Asegúrate de permitir el acceso a tu micrófono/cámara.",
        variant: "destructive",
      });
      return null;
    }
  }, []);

  // Configuración de la conexión P2P
  const setupPeerConnection = useCallback(
    (userToId: number) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }

      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // 1. Manejo de ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            toId: userToId,
            candidate: event.candidate,
          });
        }
      };

      // 2. Manejo del stream remoto
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          if (userAudio.current) {
            userAudio.current.srcObject = remoteStreamRef.current;
            userAudio.current
              .play()
              .catch((e) =>
                console.error("Error al reproducir audio remoto:", e)
              );
          }
        }
      };

      // 3. Añadir stream local a la conexión
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current as MediaStream);
        });
      }

      return pc;
    },
    [user.id]
  );

  // Función para iniciar el proceso de llamada
  const handleInitiateCall = useCallback(
    async (callType: "video" | "audio") => {
      if (isCalling || isCallActive || !socketRef.current) return;

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

        socketRef.current.emit("call-user", {
          userToCallId: user.id,
          signal: pc.localDescription,
          from: currentUserId,
          name: currentUserName,
          callType: callType,
        });

        toast({
          title: `Llamando a ${user.nombre}...`,
          description: `Esperando respuesta...`,
        });
      } catch (error) {
        console.error(error);
        toast({
          title: "Error de Llamada",
          description: "Fallo al iniciar la llamada.",
        });
        handleEndCall(false);
      }
    },
    [
      isCalling,
      isCallActive,
      user.id,
      currentUserId,
      currentUserName,
      getLocalStream,
      setupPeerConnection,
      handleEndCall,
    ]
  );

  // -----------------------------------------------------
  // EFECTOS Y SOCKET.IO (Señalización)
  // -----------------------------------------------------
  useEffect(() => {
    // 1. Inicializar Socket.io y registrar al usuario
    socketRef.current = io(API_BASE_URL, {
      path: "/api/socket.io/",
    });

    const currentSocket = socketRef.current;

    currentSocket.on("connect", () => {
      currentSocket.emit("user-connected", currentUserId);
    });

    // 2. Recibir Llamada (Responder)
    const onReceiveCall = async ({
      signal,
      from,
      name,
      callType,
    }: {
      signal: RTCSessionDescriptionInit;
      from: number;
      name: string;
      callType: "video" | "audio";
    }) => {
      const accept = window.confirm(
        `Llamada entrante  (${callType}). ¿Aceptar?`
      );

      if (accept) {
        setIsCallActive(true);

        const stream = await getLocalStream(callType);
        if (!stream) return handleEndCall(false);

        const pc = setupPeerConnection(from);

        // Establecer Oferta remota, crear Respuesta, y enviarla
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        currentSocket.emit("accept-call", {
          signal: pc.localDescription,
          toId: from,
        });
        toast({
          title: "Llamada aceptada",
          description: `Iniciando `,
        });
      } else {
        // Lógica de rechazo
      }
    };

    // 3. Aceptación de Llamada (Iniciador)
    const onCallAccepted = async (signal: RTCSessionDescriptionInit) => {
      setIsCallActive(true);
      setIsCalling(false);
      await peerConnectionRef.current?.setRemoteDescription(
        new RTCSessionDescription(signal)
      );
      toast({
        title: "Conectado",
        description: `Llamada con ${user.nombre} iniciada.`,
      });
    };

    // 4. ICE Candidates
    const onICECandidate = (candidate: RTCIceCandidate) => {
      try {
        peerConnectionRef.current?.addIceCandidate(candidate);
      } catch (e) {
        console.error("Error añadiendo ICE candidate:", e);
      }
    };

    // 5. Finalizar Llamada
    const onCallEnded = () => {
      handleEndCall(false);
    };

    // 💥 NUEVO: Escucha mensajes entrantes del destinatario (actualización en tiempo real)
    const onNewMessage = (newMessage: Message) => {
      // Solo añade el mensaje si corresponde al chat actual
      if (newMessage.match_id === matchId) {
        setMessages((prev) => [...prev, newMessage]);
        scrollToBottom();
      }
    };

    // 💥 NUEVO: Confirma que el mensaje del remitente fue guardado en la DB
    const onMessageSentConfirmation = (
      messageConfirmation: Message & { tempId: number }
    ) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageConfirmation.tempId
            ? {
                ...msg,
                ...messageConfirmation,
                id: messageConfirmation.id, // Reemplaza el ID temporal por el real de la DB
                isSending: false,
              }
            : msg
        )
      );
      scrollToBottom();
    };
    currentSocket.on("receive-call", onReceiveCall);
    currentSocket.on("call-accepted", onCallAccepted);
    currentSocket.on("ice-candidate", onICECandidate);
    currentSocket.on("call-ended", onCallEnded);
    currentSocket.on("new message", onNewMessage); // <-- LISTENER DE CHAT EN TIEMPO REAL
    currentSocket.on("message sent confirmation", onMessageSentConfirmation); // <-- LISTENER DE CONFIRMACIÓN

    return () => {
      // Limpieza de sockets y streams al desmontar
      currentSocket.off("receive-call", onReceiveCall);
      currentSocket.off("call-accepted", onCallAccepted);
      currentSocket.off("ice-candidate", onICECandidate);
      currentSocket.off("call-ended", onCallEnded);
      currentSocket.off("new message", onNewMessage); // <-- LIMPIAR
      currentSocket.off("message sent confirmation", onMessageSentConfirmation); // <-- LIMPIAR
      currentSocket.disconnect();
    };
  }, [
    currentUserId,
    matchId, // 💥 ADD matchId to dependencies
    getLocalStream,
    setupPeerConnection,
    handleEndCall,
    user.nombre,
  ]);
  // Lógica para obtener mensajes de la API
  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${matchId}`);
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
      const tempId = Date.now();

      // 1. Mensaje temporal (Optimistic update)
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
        const res = await fetch(`${API_BASE_URL}/api/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match_id: matchId,
            sender_id: currentUserId,
            message: messageToSend,
            recipient_id: user.id, // 💥 NUEVO: ID del destinatario para Socket.io
            tempId: tempId, // 💥 NUEVO: ID temporal para la confirmación
          }),
        });

        if (!res.ok) throw new Error("Error al enviar el mensaje al backend");

        // 2. Si tiene éxito, no hacemos nada más, la confirmación de Socket.io
        // (onMessageSentConfirmation) se encargará de actualizar el ID real.
        // Se elimina la llamada a fetchMessages() para evitar un re-fetch costoso.
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

  const handleDeleteMatch = async () => {
    if (!matchId) return;

    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el match con ${user.nombre}? Se perderá toda la conversación.`
      )
    ) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/matches/${matchId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok)
          throw new Error("Error al eliminar el match en el backend");

        // Mostrar notificación de éxito
        toast({
          title: "Match eliminado",
          description: `El chat con ${user.nombre} ha sido eliminado.`,
          variant: "default",
        });

        // 2. Volver a la lista de matches
        onBack();
      } catch (error) {
        console.error("Error al eliminar match:", error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el match. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    }
  };

  // Obtener idiomas nativos para el header/tip
  const nativeLanguages =
    user.usuario_idioma
      ?.filter((i) => i.tipo === "nativo")
      .map((i) => i.nombre) || [];
  const partnerNativeLang =
    nativeLanguages.length > 0 ? nativeLanguages[0] : "Nativo";

  const myNativeLang = currentUserNativeLang;

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
                {/* <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleInitiateCall("video")}
                  title="Videollamada"
                  className="w-10 h-10 hover:bg-primary/10 text-primary"
                >
                  <Video className="w-4 h-4" />
                </Button>*/}
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
            {/*<Button variant="ghost" size="sm" className="mb-1">
              <Paperclip className="w-4 h-4" />
            </Button>*/}

            <div className="flex-1 relative">
              <Input
                placeholder="Escribe un mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pr-10 resize-none rounded-full"
              />
              {/*<Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2"
              >
                <Smile className="w-4 h-4" />
              </Button>*/}
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
