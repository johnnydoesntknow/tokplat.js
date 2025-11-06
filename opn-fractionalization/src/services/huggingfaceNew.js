// src/services/huggingfaceNew.js
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_KEY);

export async function generateImageHF(prompt, modelName = null) {
  try {
    const model = modelName || import.meta.env.VITE_HF_MODEL || 'black-forest-labs/FLUX.1-schnell';
    console.log('🎨 Generating with FLUX model:', model);
    
    const result = await hf.textToImage({
      model: model,
      inputs: prompt,
    });
    
    const url = URL.createObjectURL(result);
    return { success: true, image: url, model };
  } catch (error) {
    console.error('FLUX generation error:', error);
    return { success: false, error: error.message };
  }
}

// Generate multiple variations
export async function generateVariations(prompt, count = 4) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    // Add slight variation to prompt for different results
    const variedPrompt = `${prompt}, variation ${i + 1}`;
    promises.push(generateImageHF(variedPrompt));
  }
  
  const results = await Promise.all(promises);
  return results.filter(r => r.success);
}

// Export for use in components
export default {
  generateImageHF,
  generateVariations
};