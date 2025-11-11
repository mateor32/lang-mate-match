import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, User as UserIcon, Save, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
  // NEW/UPDATED FIELDS
  pais_id: number | null;
  pais_nombre?: string;
  sexo: string | null;
  pref_pais_id: number | null;
  pref_sexo: string | null;
  usuario_idioma?: {
    tipo: string;
    id: number;
    nombre: string;
    nivel_id?: number;
    nivel_nombre?: string;
  }[];
  intereses?: Resource[];
  foto: string;
  bio?: string;
}

// Modelo de datos para el formulario de edición de perfil
interface ProfileFormValues {
  nombre: string;
  bio: string;
  foto: string;
  // NEW FIELDS FOR FORM SUBMISSION
  pais_id: number | null;
  sexo: string | null;
  pref_pais_id: number | null;
  pref_sexo: string | null;
}

// ------------------------------------------
// 2. Componente de Configuración del Perfil
// ------------------------------------------
export default function ProfileSettings() {
  // CLAVE: Obtener el userId del almacenamiento local en lugar de hardcodeo
  const loggedUserId = localStorage.getItem("loggedUserId");
  const userId = loggedUserId ? parseInt(loggedUserId, 10) : null;

  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para recursos disponibles y selecciones
  const [availableLanguages, setAvailableLanguages] = useState<Resource[]>([]);
  const [availableInterests, setAvailableInterests] = useState<Resource[]>([]);
  const [availableNiveles, setAvailableNiveles] = useState<Resource[]>([]);
  const [availablePaises, setAvailablePaises] = useState<Resource[]>([]); // <--- NEW STATE
  const [selectedNativos, setSelectedNativos] = useState<number[]>([]);
  const [selectedAprendiendo, setSelectedAprendiendo] = useState<number[]>([]);
  const [aprendiendoLevels, setAprendiendoLevels] = useState<
    Record<number, number | null>
  >({});
  const [selectedIntereses, setSelectedIntereses] = useState<number[]>([]);

  const form = useForm<ProfileFormValues>();
  const {
    register,
    handleSubmit,
    reset,
    watch, // Necesario para la vista previa de la foto
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

  // <-- Funciones de manejo de niveles -->
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
      // 1. Fetch recursos disponibles (incluyendo niveles y PAISES)
      const [langRes, intRes, nivelRes, paisRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/usuarios/idiomas`),
        fetch(`${API_BASE_URL}/api/usuarios/intereses`),
        fetch(`${API_BASE_URL}/api/usuarios/niveles`),
        fetch(`${API_BASE_URL}/api/usuarios/paises`), // <--- NEW FETCH
      ]);
      const availableLanguagesData = langRes.ok ? await langRes.json() : [];
      const availableInterestsData = intRes.ok ? await intRes.json() : [];
      const availableNivelesData = nivelRes.ok ? await nivelRes.json() : [];
      const availablePaisesData = paisRes.ok ? await paisRes.json() : [];
      setAvailableLanguages(availableLanguagesData);
      setAvailableInterests(availableInterestsData);
      setAvailableNiveles(availableNivelesData);
      setAvailablePaises(availablePaisesData); // <--- NEW SET STATE

      // 2. Fetch datos del usuario logueado
      const userRes = await fetch(`${API_BASE_URL}/api/usuarios/${userId}`);
      if (!userRes.ok) throw new Error(`Error cargando usuario ${userId}`);
      const data = await userRes.json();

      // 3. Adaptar datos de la API para el estado y formulario
      const idiomasArray = Array.isArray(data.idiomas) ? data.idiomas : [];
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
          initialAprendiendoLevels[i.id] = i.nivel_id
            ? parseInt(i.nivel_id, 10)
            : null;
        });

      setSelectedNativos(nativosIds);
      setSelectedAprendiendo(aprendiendoIds);
      setAprendiendoLevels(initialAprendiendoLevels);

      const interesesRes = await fetch(
        `${API_BASE_URL}/api/usuarios/${userId}/intereses`
      );
      const interesesData = interesesRes.ok ? await interesesRes.json() : [];
      const interesesIds = interesesData.map((i: any) => i.id);

      setSelectedIntereses(interesesIds);

      const user: User = {
        id: data.id,
        nombre: data.nombre,
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
        // NEW/UPDATED FIELDS
        pais_id: data.pais_id || null,
        sexo: data.sexo || null,
        pref_pais_id: data.pref_pais_id || 0, // 0 es el valor para "Todos"
        pref_sexo: data.pref_sexo || "Todos",
        bio: data.bio || "",
        intereses: interesesData,
      };

      setCurrentUser(user);

      // Inicializar el formulario con datos básicos
      reset({
        nombre: user.nombre,
        bio: user.bio || "",
        foto: user.foto,
        // NEW FIELDS
        pais_id: user.pais_id,
        sexo: user.sexo,
        pref_pais_id: user.pref_pais_id,
        pref_sexo: user.pref_sexo,
      });
    } catch (err) {
      console.error("Error cargando perfil:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, reset]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // ------------------------------------------
  // Lógica de Envío (Guardar)
  // ------------------------------------------
  const onSubmit = async (data: ProfileFormValues) => {
    if (!userId) return;
    try {
      // 1. Actualizar Perfil Básico (CON NUEVOS CAMPOS)
      const basicUpdatePromise = fetch(
        `${API_BASE_URL}/api/usuarios/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: data.nombre,
            bio: data.bio,
            foto: data.foto,
            // NEW FIELDS TO SEND
            pais_id: data.pais_id,
            sexo: data.sexo,
            pref_pais_id: data.pref_pais_id,
            pref_sexo: data.pref_sexo,
          }),
        }
      );

      // 2. Actualizar Idiomas (CON NIVELES)
      // ... (Resto de la lógica de idiomas) ...
      const idiomasToUpdate = [];

      selectedNativos.forEach((langId) => {
        idiomasToUpdate.push({
          langId,
          tipo: "nativo",
          nivelId: null,
        });
      });

      selectedAprendiendo.forEach((langId) => {
        idiomasToUpdate.push({
          langId,
          tipo: "aprender",
          nivelId: aprendiendoLevels[langId],
        });
      });

      const langUpdatePromise = fetch(
        `${API_BASE_URL}/api/usuarios/${userId}/idiomas`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idiomas: idiomasToUpdate,
          }),
        }
      );

      // 3. Actualizar Intereses
      const intUpdatePromise = fetch(
        `${API_BASE_URL}/api/usuarios/${userId}/intereses`,
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
    }
  };

  if (loading || userId === null)
    return <p className="text-center mt-10">Cargando configuración...</p>;
  if (!currentUser)
    return <p className="text-center mt-10">No se pudo cargar el perfil.</p>;

  // Función auxiliar para obtener el nombre del país para el placeholder (opcional)
  const getPaisName = (id: number | null | undefined) => {
    const pais = availablePaises.find((p) => p.id === id);
    return pais ? pais.nombre : id === 0 ? "Todos los países" : "Selecciona...";
  };

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

            {/* Bio */}
            <div className="space-y-1">
              <Label htmlFor="bio">Biografía</Label>
              <Textarea
                id="bio"
                {...register("bio")}
                placeholder="Cuéntale al mundo sobre ti..."
                rows={4}
              />
            </div>

            {/* -------------------------------------- */}
            {/* NEW/UPDATED: País, Género y Preferencias */}
            {/* -------------------------------------- */}

            <hr className="my-6" />
            <h3 className="text-xl font-semibold mb-3">Tu Perfil Básico</h3>

            {/* Fila País y Género Personal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* País del Usuario */}
              <div className="space-y-1">
                <Label htmlFor="pais_id">Tu País (Ubicación)</Label>
                <select
                  id="pais_id"
                  {...register("pais_id", { valueAsNumber: true })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value={""}>Selecciona tu país</option>
                  {availablePaises.map((pais) => (
                    <option key={pais.id} value={pais.id}>
                      {pais.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Género del Usuario */}
              <div className="space-y-1">
                <Label htmlFor="sexo">Tu Género</Label>
                <select
                  id="sexo"
                  {...register("sexo")}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="">Selecciona tu género</option>
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                  <option value="Otro">Otro</option>
                  <option value="Prefiero no decir">Prefiero no decir</option>
                </select>
              </div>
            </div>

            <hr className="my-6" />
            <h3 className="text-xl font-semibold mb-3">
              Preferencias de Match
            </h3>

            {/* Fila Preferencias de Match */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* País Preferido para Match */}
              <div className="space-y-1">
                <Label htmlFor="pref_pais_id">País Preferido</Label>
                <select
                  id="pref_pais_id"
                  {...register("pref_pais_id", { valueAsNumber: true })}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value={0}>Todos los países</option>
                  {availablePaises.map((pais) => (
                    <option key={pais.id} value={pais.id}>
                      {pais.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Filtra por personas de este país.
                </p>
              </div>

              {/* Género Preferido para Match */}
              <div className="space-y-1">
                <Label htmlFor="pref_sexo">Género Preferido</Label>
                <select
                  id="pref_sexo"
                  {...register("pref_sexo")}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="Todos">Todos los géneros</option>
                  <option value="Hombre">Hombre</option>
                  <option value="Mujer">Mujer</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
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
                        {/* Selector de nivel si la casilla está marcada */}
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
