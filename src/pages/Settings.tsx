import { useState, useEffect } from "react";

interface Idioma {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  foto?: string | null;
  idiomas: Idioma[];
}

export default function UsuarioDetalle({ usuarioId }: { usuarioId: number }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:5000/api/usuarios/1`)
      .then((res) => res.json())
      .then((data) => {
        console.log(data); // Verifica la estructura
        setUsuario(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [usuarioId]);

  if (loading) return <p>Cargando usuario...</p>;
  if (!usuario) return <p>No se encontró el usuario.</p>;

  return (
    <div>
      <h2>{usuario.nombre}</h2>
      <p>Email: {usuario.email}</p>
      {usuario.foto && (
        <img src={usuario.foto} alt={usuario.nombre} width={100} />
      )}
      <h3>Idiomas:</h3>
      {usuario.idiomas.length > 0 ? (
        <ul>
          {usuario.idiomas.map((i) => (
            <li key={i.id}>{i.nombre}</li>
          ))}
        </ul>
      ) : (
        <p>Este usuario no tiene idiomas.</p>
      )}
    </div>
  );
}
