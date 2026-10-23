const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Gemini-Key",
};

interface AnalysisResult {
  brand: string | null;
  category: string | null;
  model: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  condition: string | null;
  defects: string | null;
  vinted_title: string;
  description: string;
  hashtags: string[];
  suggested_price: number | null;
  confidence: "bas" | "moyen" | "eleve";
  notes: string;
}

const SYSTEM_PROMPT = `Tu es un expert en vêtements de seconde main, spécialisé dans la création d'annonces pour Vinted.

Analyse les photos de vêtements fournies et extrais les informations suivantes:
- Marque (uniquement si visible/identifiable sur les photos)
- Type de vêtement (pull, t-shirt, pantalon, robe, veste, etc.)
- Modèle (si identifiable)
- Taille (uniquement si visible sur l'étiquette ou le vêtement)
- Couleur principale
- Matière (uniquement si visible sur l'étiquette)
- État (neuf avec étiquette, neuf sans étiquette, très bon état, bon état, état correct)
- Défauts éventuels (si visibles)

RÈGLES STRICTES:
1. Ne JAMAIS inventer une taille, une matière ou une information non visible. Si tu n'es pas sûr, mets null et mentionne l'incertitude dans "notes".
2. Ne JAMAIS certifier l'authenticité d'une marque à partir des photos seules. Si une marque est visible, indique-la mais ajoute dans "notes" que l'authenticité ne peut être certifiée par photo.
3. Génère un titre optimisé pour Vinted (max 60 caractères): [Marque] [Type] [Modèle] [Couleur] [Taille] [État]
4. Génère une description naturelle et vendeuse en français, qui inclut:
   - Description du vêtement et de son style
   - Marque, taille, matière (si connues)
   - État et défauts éventuels
   - Mesures recommandées à prendre
   - Mention que l'authenticité ne peut être certifiée par photo si une marque est identifiée
5. Génère 5-10 hashtags pertinents (sans le #)
6. Suggère un prix de vente en euros basé sur la marque, le type et l'état. Si tu ne peux pas estimer, mets null.

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "brand": string | null,
  "category": string | null,
  "model": string | null,
  "size": string | null,
  "color": string | null,
  "material": string | null,
  "condition": string | null,
  "defects": string | null,
  "vinted_title": string,
  "description": string,
  "hashtags": string[],
  "suggested_price": number | null,
  "confidence": "bas" | "moyen" | "eleve",
  "notes": string
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { photos } = await req.json();

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucune photo fournie." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Try server-side key first, then fall back to client-provided key in header
    const serverKey = Deno.env.get("GEMINI_API_KEY");
    const clientKey = req.headers.get("X-Gemini-Key");
    const apiKey = serverKey || clientKey;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Aucune clé API Gemini configurée. Allez dans les Paramètres pour ajouter votre clé.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the parts for Gemini: text prompt + image parts
    const parts: Array<
      { text: string } | { inline_data: { mime_type: string; data: string } }
    > = [{ text: SYSTEM_PROMPT }];

    for (const photo of photos) {
      if (typeof photo === "string" && photo.startsWith("data:")) {
        const match = photo.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          parts.push({
            inline_data: {
              mime_type: match[1],
              data: match[2],
            },
          });
        }
      } else if (typeof photo === "string") {
        const imgResponse = await fetch(photo);
        if (imgResponse.ok) {
          const buffer = await imgResponse.arrayBuffer();
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(buffer))
          );
          const contentType =
            imgResponse.headers.get("content-type") || "image/jpeg";
          parts.push({
            inline_data: {
              mime_type: contentType,
              data: base64,
            },
          });
        }
      }
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      let errorMessage = "Erreur de l'API Gemini.";

      if (geminiResponse.status === 429) {
        errorMessage =
          "Quota de l'API Gemini atteint. Réessayez plus tard ou vérifiez votre plan.";
      } else if (geminiResponse.status === 403) {
        errorMessage =
          "Clé API Gemini invalide ou non autorisée. Vérifiez votre clé dans les Paramètres.";
      } else if (geminiResponse.status === 400) {
        errorMessage =
          "Requête invalide vers l'API Gemini. Les photos sont peut-être trop lourdes.";
      }

      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: geminiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const textContent =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return new Response(
        JSON.stringify({
          error: "L'IA n'a pas pu analyser les photos. Réessayez.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let result: AnalysisResult;
    try {
      result = JSON.parse(textContent);
    } catch {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return new Response(
          JSON.stringify({
            error: "Format de réponse IA invalide. Réessayez.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      result = JSON.parse(jsonMatch[0]);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({
        error: "Une erreur inattendue est survenue. Réessayez.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
