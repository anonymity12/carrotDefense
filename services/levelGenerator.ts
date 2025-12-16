
import { GoogleGenAI, Type } from "@google/genai";
import { GRID_WIDTH, GRID_HEIGHT, DEFAULT_LEVEL_PATH, DEFAULT_WAVES } from '../constants';
import { GameLevel, Position, EnemyType } from '../types';

export const generateLevel = async (theme: string): Promise<GameLevel> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("No API Key found. Using default level.");
    return createDefaultLevel();
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Create a 'Tower Defense' style Traffic Control simulation level.
    Grid Size: ${GRID_WIDTH}x${GRID_HEIGHT}.
    Theme: "${theme}".
    The goal is to intercept illegal motorcycles on a road network.
    
    Requirements:
    1. 'path': An ordered array of coordinates {x, y} representing the road.
       - Must start at x=0.
       - Must end at x=${GRID_WIDTH - 1}.
       - Must be contiguous (no diagonals).
       - Must not intersect itself.
    2. 'waves': An array of 3 wave configurations.
       - Enemy Types to use: 
         - SCOOTER (Basic violator)
         - DELIVERY (Heavy load, tanky)
         - RACER (High speed, speeding)
         - MODIFIED (Illegal mods, Boss)
       - Define count and spawn interval for each group.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            path: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.INTEGER },
                  y: { type: Type.INTEGER }
                },
                required: ["x", "y"]
              }
            },
            waves: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  enemies: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING, enum: ["SCOOTER", "DELIVERY", "RACER", "MODIFIED"] },
                        count: { type: Type.INTEGER },
                        interval: { type: Type.INTEGER }
                      },
                      required: ["type", "count", "interval"]
                    }
                  },
                  delayBetween: { type: Type.INTEGER }
                },
                required: ["enemies", "delayBetween"]
              }
            },
            levelName: { type: Type.STRING }
          },
          required: ["path", "waves", "levelName"]
        }
      }
    });

    const data = JSON.parse(response.text);

    return {
      id: `gen-${Date.now()}`,
      name: data.levelName || "Traffic Control Zone",
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      path: data.path,
      waves: data.waves.map((w: any) => ({
        ...w,
        enemies: w.enemies.map((e: any) => ({
          ...e,
          type: e.type as EnemyType
        }))
      })),
      startingMoney: 450
    };

  } catch (error) {
    console.error("Gemini Level Gen Failed:", error);
    return createDefaultLevel();
  }
};

const createDefaultLevel = (): GameLevel => ({
  id: 'default',
  name: 'City Ring Road',
  gridWidth: GRID_WIDTH,
  gridHeight: GRID_HEIGHT,
  path: DEFAULT_LEVEL_PATH,
  waves: DEFAULT_WAVES,
  startingMoney: 450
});
