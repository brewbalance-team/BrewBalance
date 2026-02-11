import { GoogleGenAI } from '@google/genai';

export const generateAppLogo = async (): Promise<string> => {
  try {
    // Ensure API Key is available as per environment requirements
    const apiKey = process.env['API_KEY'];
    if (!apiKey) {
      throw new Error('API Key not found in environment');
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            text: "A cool, modern, minimalist logo for a mobile app called 'BrewBalance'. The app tracks beer budget. The logo should feature a stylized beer glass or hops, using amber and gold colors. Vector art style, flat design, white background, rounded shape.",
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error('No image generated from the model.');
  } catch (error) {
    console.error('Error generating logo:', error);
    throw error;
  }
};
