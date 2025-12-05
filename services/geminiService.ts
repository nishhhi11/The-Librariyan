import { GoogleGenAI, Type } from "@google/genai";
import { Book, Difficulty, UserPreferences, UserProfile, LibraryEntity } from "../types";

// Helper to ensure we have an API key or prompt user to select one
export const ensureApiKey = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
       await window.aistudio.openSelectKey();
       return await window.aistudio.hasSelectedApiKey();
    }
    return true;
  }
  // Fallback if not in the specific environment that supports key selection,
  // we assume process.env.API_KEY might be set or we can't proceed.
  return !!process.env.API_KEY;
};

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateBookRecommendations = async (
  profile: UserProfile,
  prefs: UserPreferences
): Promise<Book[]> => {
  const ai = getAIClient();
  
  const prompt = `
    You are "The LibrARIYAN", a sophisticated, inspirational, and intelligent book critic.
    
    User Profile:
    Name: ${profile.name}
    Age: ${profile.age}
    Favorite Genre: ${profile.favGenre}
    
    User Personality: ${prefs.personality}
    Enjoyed Types: ${prefs.bookTypes}
    Tone: ${prefs.readingTone}
    Themes: ${prefs.themes}
    
    Recommend exactly 5 books that are inspirational, intellectually engaging, and deep.
    For each book provide: 
    - Title
    - Genre (e.g. Philosophy, Sci-Fi, Biography)
    - Short Summary (4-5 lines)
    - Difficulty (Beginner, Intermediate, Advanced)
    - A personalized reason why it matches the user.
    
    Return the response in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            genre: { type: Type.STRING },
            summary: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: [Difficulty.BEGINNER, Difficulty.INTERMEDIATE, Difficulty.ADVANCED] },
            reason: { type: Type.STRING }
          },
          required: ["title", "genre", "summary", "difficulty", "reason"]
        }
      }
    }
  });

  if (response.text) {
    try {
      return JSON.parse(response.text) as Book[];
    } catch (e) {
      console.error("Failed to parse book recommendations", e);
      return [];
    }
  }
  return [];
};

export const generateBookCover = async (title: string, summary: string): Promise<string | null> => {
  const ai = getAIClient();
  try {
    // Switching to gemini-2.5-flash-image which uses generateContent for better availability than Imagen models
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{
            text: `Generate an image. Create a unique, abstract book cover for "${title}". The cover should visually represent this summary: "${summary}". 
            Aesthetic Style: Gen Z, Y2K, Acid Graphics, Dark Mode. 
            Visual Elements: High contrast, glitch effects, brutalist composition, abstract geometric shapes, digital noise. 
            Colors: Predominantly deep black/void background with glowing neon accents (Acid Green, Electric Blue, or Hyper Pink) that fit the book's specific mood. 
            Composition: Minimalist but striking. No text on the cover.`
          }]
        },
        config: {
            imageConfig: {
              aspectRatio: '3:4'
            }
        }
    });

    // Extract image from content parts
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (e) {
    console.error("Cover generation failed", e);
  }
  return null;
}

export const generateVeoVideo = async (
  imageBase64: string,
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string | null> => {
  // Always ensure fresh client creation to pick up potential new keys
  const ai = getAIClient();

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || "Cinematic shot, moving camera, high quality.",
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/png' // Assuming PNG/JPEG conversion handled before call or is generic enough for the API
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.response?.generatedVideos?.[0]?.video?.uri) {
      return `${operation.response.generatedVideos[0].video.uri}&key=${process.env.API_KEY}`;
    }
    
    return null;

  } catch (error: any) {
    console.error("Veo generation error:", error);
    // Handle the specific "Requested entity was not found" error for key selection reset
    if (error.message && error.message.includes("Requested entity was not found") && window.aistudio) {
        await window.aistudio.openSelectKey();
        throw new Error("Please select a valid API key and try again.");
    }
    throw error;
  }
};

export const findNearbyLibraries = async (lat: number, lng: number): Promise<LibraryEntity[]> => {
  const ai = getAIClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Find the best public libraries near me. Provide a brief list.",
      config: {
        tools: [{googleMaps: {}}],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    // Extract grounding chunks which contain the actual map data
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const libraries: LibraryEntity[] = [];

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.maps) {
          libraries.push({
            title: chunk.maps.title,
            address: chunk.maps.formattedAddress, // Note: The field might vary, usually accessible via maps.title or derived from context
            uri: chunk.maps.uri
          });
        }
      });
    }
    
    return libraries;

  } catch (error) {
    console.error("Error finding libraries:", error);
    return [];
  }
};