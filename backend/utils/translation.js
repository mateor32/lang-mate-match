// backend/utils/translation.js

// Mapeo de nombres de idioma (usados en el frontend) a códigos ISO (usados por LibreTranslate)
const langMap = {
  Español: "es",
  Inglés: "en",
  Francés: "fr",
  Alemán: "de",
  // Añadir más mapeos según los idiomas en tu DB si es necesario.
};

/**
 * Llama a la API pública de LibreTranslate para traducir texto.
 * @param {string} text Texto a traducir.
 * @param {string} fromLang Nombre del idioma de origen (ej: "Español").
 * @param {string} toLang Nombre del idioma de destino (ej: "Inglés").
 * @returns {Promise<string>} El texto traducido.
 */
export const performTranslation = async (text, fromLang, toLang) => {
  const sourceCode = langMap[fromLang] || "auto";
  const targetCode = langMap[toLang];

  if (!targetCode || text.trim() === "") {
    return text; // No traducir si no se conoce el código de destino o el texto está vacío
  }

  try {
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: sourceCode,
        target: targetCode,
        format: "text",
        // No usamos api_key para usar el servicio público gratuito.
      }),
    });

    if (!response.ok) {
      console.error(
        `LibreTranslate Error (Status: ${response.status}):`,
        await response.text()
      );
      // En caso de error (ej: límite de velocidad), devolvemos el texto original.
      return text;
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error("Error de red al llamar a LibreTranslate:", error);
    return text;
  }
};
