import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, User as UserIcon, Save, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query"; // Importación necesaria

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils"; // <-- CORRECCIÓN: Importación faltante

// **CLAVE: Definir URL Base para la API**
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:10000" ||
  "http://localhost:5000";

// Definición de tipos para Idiomas e Intereses
interface Resource {
  id: number;
  nombre: string;
}

interface User {
  id: number;
  nombre: string;
  edad: number;
  pais: string;
  usuario_idioma?: {
    tipo: string;
    id: number;
    nombre: string;
    nivel_id?: number; // <-- Nuevo campo
    nivel_nombre?: string; // <-- Nuevo campo
  }[];
  intereses?: Resource[];
  foto: string;
  bio?: string;
}

// Modelo de datos para el formulario de edición de perfil
interface ProfileFormValues {
  nombre: string;
  bio: string;
  pais: string;
  foto: string;
}

// ------------------------------------------
// 2. Componente de Configuración del Perfil
// ------------------------------------------
export default function ProfileSettings() {
  // CLAVE: Obtener el userId del almacenamiento local en lugar de hardcodeo
  const loggedUserId = localStorage.getItem("loggedUserId");
  const userId = loggedUserId ? parseInt(loggedUserId, 10) : null;

  const queryClient = useQueryClient(); // Inicializar React Query Client
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para recursos disponibles y selecciones
  const [availableLanguages, setAvailableLanguages] = useState<Resource[]>([]);
  const [availableInterests, setAvailableInterests] = useState<Resource[]>([]);
  const [availableNiveles, setAvailableNiveles] = useState<Resource[]>([]); // <-- CORRECCIÓN: Nuevo estado para niveles
  const [selectedNativos, setSelectedNativos] = useState<number[]>([]);
  const [selectedAprendiendo, setSelectedAprendiendo] = useState<number[]>([]);
  const [aprendiendoLevels, setAprendiendoLevels] = useState<
    Record<number, number | null>
  >({}); // <-- CORRECCIÓN: Nuevo estado para mapear IDs de idioma a IDs de nivel
  const [selectedIntereses, setSelectedIntereses] = useState<number[]>([]);

  const form = useForm<ProfileFormValues>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = form;

  const handleSelection = (
    id: number,
    currentSelection: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    if (currentSelection.includes(id)) {
      setter(currentSelection.filter((itemId) => itemId !== id));
    } else {
      setter([...currentSelection, id]);
    }
  };

  // <-- CORRECCIÓN: Nuevas funciones para manejar la selección y el nivel
  const handleAprendiendoSelection = (id: number) => {
    // Standard checkbox toggle for language selection
    setSelectedAprendiendo((currentSelection) => {
      const isSelected = currentSelection.includes(id);
      const newSelection = isSelected
        ? currentSelection.filter((itemId) => itemId !== id) // Remove
        : [...currentSelection, id]; // Add

      // Update levels state
      setAprendiendoLevels((prevLevels) => {
        const newLevels = { ...prevLevels };
        if (!isSelected) {
          // If language is added, select a default level (the first one)
          newLevels[id] =
            availableNiveles.length > 0 ? availableNiveles[0].id : null;
        } else {
          // If language is removed, delete its level entry
          delete newLevels[id];
        }
        return newLevels;
      });

      return newSelection;
    });
  };

  const handleLevelChange = (langId: number, nivelId: number | null) => {
    setAprendiendoLevels((prevLevels) => ({
      ...prevLevels,
      [langId]: nivelId,
    }));
  };

  // ------------------------------------------
  // Lógica de Carga del Perfil y Recursos
  // ------------------------------------------
  const fetchProfileData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      // 1. Fetch recursos disponibles (incluyendo niveles)
      const [langRes, intRes, nivelRes] = await Promise.all([
        // <-- AÑADIR nivelRes
        fetch(`${API_BASE_URL}/api/usuarios/idiomas`),
        fetch(`${API_BASE_URL}/api/usuarios/intereses`),
        fetch(`${API_BASE_URL}/api/usuarios/niveles`), // <-- NUEVO ENDPOINT
      ]);
      const availableLanguagesData = langRes.ok ? await langRes.json() : [];
      const availableInterestsData = intRes.ok ? await intRes.json() : [];
      const availableNivelesData = nivelRes.ok ? await nivelRes.json() : []; // <-- NUEVO
      setAvailableLanguages(availableLanguagesData);
      setAvailableInterests(availableInterestsData);
      setAvailableNiveles(availableNivelesData); // <-- NUEVO

      // 2. Fetch datos del usuario logueado
      const userRes = await fetch(`${API_BASE_URL}/api/usuarios/${userId}`); // <-- URL CORREGIDA
      if (!userRes.ok) throw new Error(`Error cargando usuario ${userId}`);
      const data = await userRes.json();

      // 3. Adaptar datos de la API para el estado y formulario
      const idiomasArray = Array.isArray(data.idiomas) ? data.idiomas : [];
      // Corregido: Usar i.id para mapear IDs
      const nativosIds = idiomasArray
        .filter((i: any) => i.tipo === "nativo")
        .map((i: any) => i.id);
      const aprendiendoIds = idiomasArray
        .filter((i: any) => i.tipo === "aprender")
        .map((i: any) => i.id);

      // **NUEVA LÓGICA PARA NIVELES**
      const initialAprendiendoLevels: Record<number, number | null> = {};
      idiomasArray
        .filter((i: any) => i.tipo === "aprender")
        .forEach((i: any) => {
          // Asumimos que nivel_id viene de la DB (puede ser null)
          initialAprendiendoLevels[i.id] = i.nivel_id
            ? parseInt(i.nivel_id, 10)
            : null;
        });

      setSelectedNativos(nativosIds);
      setSelectedAprendiendo(aprendiendoIds);
      setAprendiendoLevels(initialAprendiendoLevels); // <-- NEW

      const interesesRes = await fetch(
        `${API_BASE_URL}/api/usuarios/${userId}/intereses` // <-- URL CORREGIDA
      );
      const interesesData = interesesRes.ok ? await interesesRes.json() : [];
      // Corregido: Usar i.id para mapear IDs
      const interesesIds = interesesData.map((i: any) => i.id);

      setSelectedIntereses(interesesIds);

      const user: User = {
        id: data.id,
        nombre: data.nombre,
        // CLAVE: Asegurarse de que la propiedad del idioma es 'usuario_idioma' para la interfaz User
        usuario_idioma: idiomasArray.map((i: any) => ({
          tipo: i.tipo,
          id: i.id,
          nombre: i.nombre,
          nivel_id: i.nivel_id,
          nivel_nombre: i.nivel_nombre,
        })),
        foto: data.foto || "/placeholder.svg",
        edad: data.fecha_nacimiento
          ? new Date().getFullYear() -
            new Date(data.fecha_nacimiento).getFullYear()
          : 0,
        pais: data.pais || "",
        bio: data.bio || "",
        intereses: interesesData,
      };

      setCurrentUser(user);

      // Inicializar el formulario con datos básicos
      reset({
        nombre: user.nombre,
        bio: user.bio || "",
        pais: user.pais,
        foto: user.foto,
      });
    } catch (err) {
      console.error("Error cargando perfil:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, reset, availableNiveles]); // Dependencia disponibleNiveles para la inicialización de niveles

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // ------------------------------------------
  // Lógica de Envío (Guardar)
  // ------------------------------------------
  const onSubmit = async (data: ProfileFormValues) => {
    if (!userId) return;
    try {
      // Asumiendo que data.foto contiene la URL actual (aunque sea el placeholder)

      // 1. Actualizar Perfil Básico
      const basicUpdatePromise = fetch(
        `${API_BASE_URL}/api/usuarios/${userId}`,
        {
          // <-- URL CORREGIDA
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: data.nombre,
            bio: data.bio,
            pais: data.pais,
            foto: data.foto,
          }),
        }
      );

      // 2. Actualizar Idiomas (CON NIVELES)
      // Construir la estructura de datos que espera el backend (updateIdiomas)
      const idiomasToUpdate = [];

      // Añadir idiomas nativos
      selectedNativos.forEach((langId) => {
        idiomasToUpdate.push({
          langId,
          tipo: "nativo",
          nivelId: null,
        });
      });

      // Añadir idiomas a aprender (con nivel)
      selectedAprendiendo.forEach((langId) => {
        idiomasToUpdate.push({
          langId,
          tipo: "aprender",
          // Mapea el nivel seleccionado o null si no se eligió
          nivelId: aprendiendoLevels[langId],
        });
      });

      const langUpdatePromise = fetch(
        `${API_BASE_URL}/api/usuarios/${userId}/idiomas`, // <-- URL CORREGIDA
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idiomas: idiomasToUpdate, // <-- NUEVA ESTRUCTURA
          }),
        }
      );

      // 3. Actualizar Intereses
      const intUpdatePromise = fetch(
        `${API_BASE_URL}/api/usuarios/${userId}/intereses`, // <-- URL CORREGIDA
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intereses: selectedIntereses,
          }),
        }
      );

      const results = await Promise.all([
        basicUpdatePromise,
        langUpdatePromise,
        intUpdatePromise,
      ]);

      const allOk = results.every((res) => res.ok);

      if (!allOk) {
        // Manejar errores para saber cuál falló y obtener el mensaje de error del backend
        const failedResponse = results.find((res) => !res.ok);
        const errorBody = failedResponse
          ? await failedResponse.json()
          : { error: "Error desconocido." };

        throw new Error(
          `Al menos una de las actualizaciones falló: ${errorBody.error}`
        );
      }

      console.log("Perfil, Idiomas e Intereses actualizados con éxito!");

      // Invalidación y recarga (CLAVE para que el Dashboard vea el nuevo nombre)
      await queryClient.invalidateQueries({
        queryKey: ["currentUser", userId],
      });
      await queryClient.invalidateQueries({ queryKey: ["allUsers"] });

      await fetchProfileData();
    } catch (error) {
      console.error("Error al guardar el perfil:", error);
      // Aquí puedes mostrar un toast con el error
      // alert(error.message);
    }
  };

  if (loading || userId === null)
    return <p className="text-center mt-10">Cargando configuración...</p>;
  if (!currentUser)
    return <p className="text-center mt-10">No se pudo cargar el perfil.</p>;
  return (
    <div className="max-w-xl mx-auto py-8">
      <Card>
        <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserIcon className="w-6 h-6" />
              Editar Perfil
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Sección de Foto y Nombre */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 shadow-md">
                  <AvatarImage src={currentUser.foto} />
                  <AvatarFallback className="text-2xl">
                    {currentUser.nombre.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  title="Subir nueva foto"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-1">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  {...register("nombre")}
                  className="text-lg font-semibold"
                  placeholder="Tu nombre"
                />
              </div>
            </div>

            {/* Bio y País */}
            <div className="space-y-1">
              <Label htmlFor="bio">Biografía</Label>
              <Textarea
                id="bio"
                {...register("bio")}
                placeholder="Cuéntale al mundo sobre ti..."
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pais">País (Ubicación)</Label>
              <Input
                id="pais"
                {...register("pais")}
                placeholder="Ej: Colombia"
              />
            </div>

            <hr className="my-6" />

            {/* Sección de IDIOMAS */}
            <h3 className="text-xl font-semibold mb-3">Idiomas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Idioma Nativo */}
              <div className="space-y-2">
                <Label className="font-medium text-lg text-primary">
                  Idioma Nativo
                </Label>
                <div className="max-h-40 overflow-y-auto space-y-2 rounded-md border p-3">
                  {availableLanguages.map((lang) => (
                    <div key={lang.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`nativo-${lang.id}`}
                        checked={selectedNativos.includes(lang.id)}
                        onCheckedChange={() =>
                          handleSelection(
                            lang.id,
                            selectedNativos,
                            setSelectedNativos
                          )
                        }
                      />
                      <Label
                        htmlFor={`nativo-${lang.id}`}
                        className="font-normal cursor-pointer"
                      >
                        {lang.nombre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Idiomas que quiero Aprender */}
              <div className="space-y-2">
                <Label className="font-medium text-lg text-primary">
                  Quiero Aprender
                </Label>
                <div className="max-h-40 overflow-y-auto space-y-2 rounded-md border p-3">
                  {availableLanguages.map((lang) => {
                    const isSelected = selectedAprendiendo.includes(lang.id);
                    // Usar el nivel actualmente seleccionado, o nulo
                    const currentLevel = aprendiendoLevels[lang.id] || "";

                    return (
                      <div
                        key={lang.id}
                        className={cn(
                          "flex items-center space-x-2",
                          isSelected ? "bg-accent/10 rounded-md p-1 -m-1" : ""
                        )}
                      >
                        <Checkbox
                          id={`aprender-${lang.id}`}
                          checked={isSelected}
                          onCheckedChange={() =>
                            handleAprendiendoSelection(lang.id)
                          }
                        />
                        <Label
                          htmlFor={`aprender-${lang.id}`}
                          className="font-normal flex-1 cursor-pointer"
                        >
                          {lang.nombre}
                        </Label>
                        {/* NUEVO: Selector de nivel si la casilla está marcada */}
                        {isSelected && (
                          <select
                            value={currentLevel}
                            onChange={(e) =>
                              handleLevelChange(
                                lang.id,
                                parseInt(e.target.value, 10) || null
                              )
                            }
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                            title={`Nivel de ${lang.nombre}`}
                          >
                            <option value="">Nivel (Opcional)</option>
                            {availableNiveles.map((nivel) => (
                              <option key={nivel.id} value={nivel.id}>
                                {nivel.nombre}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <hr className="my-6" />

            {/* Sección de INTERESES */}
            <h3 className="text-xl font-semibold mb-3">Intereses</h3>
            <div className="space-y-2">
              <div className="max-h-52 overflow-y-auto space-y-2 rounded-md border p-4">
                {availableInterests.map((interest) => (
                  <div
                    key={interest.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`interes-${interest.id}`}
                      checked={selectedIntereses.includes(interest.id)}
                      onCheckedChange={() =>
                        handleSelection(
                          interest.id,
                          selectedIntereses,
                          setSelectedIntereses
                        )
                      }
                    />
                    <Label
                      htmlFor={`interes-${interest.id}`}
                      className="font-normal cursor-pointer"
                    >
                      {interest.nombre}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Botón de Guardar */}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-smooth"
              disabled={isSubmitting}
            >
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
