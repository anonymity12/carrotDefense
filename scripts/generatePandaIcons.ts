import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir, writeFile } from 'fs/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { pandaIconSpecList, PANDA_ICON_STYLE_GUIDE } from '../assets/iconManifest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/icons');
const MODEL_NAME = 'gemini-2.0-flash-exp';
const DRY_RUN = process.env.PANDA_ICON_DRY_RUN === '1';
const CUSTOM_SIZE = process.env.PANDA_ICON_SIZE;
const PROMPT_ONLY = process.env.PANDA_ICON_PROMPT_ONLY !== '0'; // Default to true now

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const buildPrompt = (prompt: string, styleNotes: string) => {
  return `You are an expert AI art director. Generate a detailed image generation prompt for:

"${prompt}"

Style requirements:
${styleNotes}

${PANDA_ICON_STYLE_GUIDE}

Task:
Provide a comprehensive, production-ready prompt optimized for DALL-E 3 or Midjourney v6. 
- Focus on the "Cute Chibi Panda" character design.
- Ensure the "Circular Sticker" format is emphasized.
- Describe lighting, materials (3D render, plastic, matte), and composition.
- The output should be ONLY the prompt text, no markdown formatting or explanations.`;
};

async function ensureOutputDir() {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function generateIcons() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing API key. Set GOOGLE_API_KEY or GEMINI_API_KEY before running generate:icons');
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: MODEL_NAME });

  await ensureOutputDir();

  console.log('⚠️  Note: Gemini API does not natively generate images.');
  console.log('This script will generate detailed prompts for external image generation tools.');
  console.log('Use the output prompts with DALL-E, Midjourney, Stable Diffusion, or similar.\n');

  const promptsOutput: string[] = [];

  for (const spec of pandaIconSpecList) {
    const metaPrompt = buildPrompt(spec.prompt, spec.styleNotes);
    const targetPath = path.join(OUTPUT_DIR, spec.fileName);
    const promptFilePath = path.join(OUTPUT_DIR, spec.fileName.replace('.png', '.prompt.txt'));

    if (DRY_RUN) {
      console.log(`[dry-run] Would generate prompt for ${spec.fileName}`);
      continue;
    }

    console.log(`Generating optimized prompt for ${spec.fileName}...`);
    try {
      const result = await model.generateContent(metaPrompt);
      const optimizedPrompt = result.response.text().trim();
      
      await writeFile(promptFilePath, optimizedPrompt);
      console.log(`✓ Saved prompt to ${spec.fileName.replace('.png', '.prompt.txt')}`);
      
      promptsOutput.push(`\n### ${spec.fileName}\n${optimizedPrompt}\n${'='.repeat(80)}`);

      // Generate placeholder SVG
      const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <circle cx="128" cy="128" r="120" fill="#1e293b" stroke="#334155" stroke-width="4"/>
  <text x="128" y="110" font-family="Arial" font-size="14" fill="#94a3b8" text-anchor="middle" font-weight="bold">
    ${spec.category.toUpperCase()}
  </text>
  <text x="128" y="135" font-family="Arial" font-size="12" fill="#cbd5e1" text-anchor="middle">
    ${spec.fileName.replace('.png', '')}
  </text>
  <text x="128" y="160" font-family="Arial" font-size="10" fill="#64748b" text-anchor="middle">
    (Generate with AI)
  </text>
</svg>`;
      
      // Only write SVG if PNG doesn't exist, to avoid overwriting real assets if they were there
      // But here we want to ensure the user sees *something*, so we'll write .svg. 
      // The game loads .png, so we might want to save this as .png (but it's text).
      // Actually, the game component <IconImage> tries to load the src (png), and if it fails, falls back to Lucide.
      // If we want to see the placeholder, we should probably save it as .svg and maybe the user can convert it or we just leave it.
      // Wait, the user wants to replace SVGs. 
      // Let's just save the prompt. The user will generate the PNGs.
      
    } catch (error) {
      console.error(`Failed to generate prompt for ${spec.fileName}:`, error);
    }

    await sleep(1000);
  }

  const masterPromptFile = path.join(OUTPUT_DIR, '_all-prompts.txt');
  await writeFile(masterPromptFile, promptsOutput.join('\n'));
  console.log(`\n✅ Done! All prompts saved to: public/assets/icons/_all-prompts.txt`);
  console.log('Copy these prompts to your preferred AI image generator (DALL-E, Midjourney, etc.)');
  console.log('Then save the generated images as the specified filenames in public/assets/icons/\n');
}

generateIcons().catch(console.error);
