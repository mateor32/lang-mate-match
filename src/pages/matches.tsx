import { useState } from "react";
import MatchModal from "@/components/MatchModal";
import { useMatches } from "@/hooks/useMatches";

export default function MatchesPage() {
  const userId = 7; // usuario logueado
  const { matches, loading } = useMatches(userId);
  const [selectedMatch, setSelectedMatch] = useState(null);

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      <h1>Mis Matches</h1>
      <ul>
        {matches.map((user) => (
          <li key={user.id}>
            {user.nombre}{" "}
            <button onClick={() => setSelectedMatch(user)}>Ver match</button>
          </li>
        ))}
      </ul>

      {selectedMatch && (
        <MatchModal
          user={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
