// src/services/huggingfaceAI.js
import React, { useState } from 'react';
import axios from 'axios';

// IMPORTANT: Remove the token from code and keep it only in .env file!
// Delete this line: TOKEN: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

class HuggingFaceAI {
  constructor() {
    this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    
    // Popular models for image generation
    this.models = {
    'flux-dev': 'black-forest-labs/FLUX.1-dev',  // New high-quality model
    'stable-diffusion-2': 'stabilityai/stable-diffusion-2-1',  // Backup
    'openjourney': 'prompthero/openjourney-v4',  // Alternative style
  };
    
    this.defaultModel = this.models['flux-dev'];
  this.selectedModel = import.meta.env.VITE_HF_MODEL || this.defaultModel;
}

  /**
   * Set the model to use
   */
  setModel(modelKey) {
    if (this.models[modelKey]) {
      this.selectedModel = this.models[modelKey];
      return true;
    }
    return false;
  }



  async testDirectAPI() {
  // Use the PROXY URL, not direct API
  const testUrl = '/api/huggingface/models/black-forest-labs/FLUX.1-dev';
  
  console.log('🔑 Testing with API key:', this.apiKey?.substring(0, 10) + '...');
  
  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header - proxy adds it
      },
      body: JSON.stringify({
        inputs: "test image of a cat",
        options: {
          wait_for_model: true
        }
      }),
    });
    
    console.log('📡 Proxy API Status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.log('❌ Error details:', error);
      
      if (response.status === 410) {
        console.log('Model not available. Try: black-forest-labs/FLUX.1-schnell instead');
      }
    } else {
      console.log('✅ Proxy API works! FLUX is accessible');
      const blob = await response.blob();
      console.log('Image size:', blob.size, 'bytes');
    }
  } catch (error) {
    console.error('❌ Proxy API failed:', error);
  }
}



  /**
   * Generate image using Hugging Face
   */
  async generateImage(prompt, options = {}) {
  if (!this.apiKey || this.apiKey === 'mock') {
    console.warn('No Hugging Face API key found, using mock generation');
    return this.generateMockImage(prompt);
  }

  try {
    const enhancedPrompt = this.enhancePrompt(prompt);
    
    // Use proxy URL for development
    const API_URL = `/api/huggingface/models/${this.selectedModel}`;
    
    // Different parameters for FLUX model
    const isFluxModel = this.selectedModel.includes('FLUX');
    
    const requestBody = isFluxModel ? {
      inputs: enhancedPrompt,
      // FLUX has simpler parameters
    } : {
      inputs: enhancedPrompt,
      parameters: {
        num_inference_steps: options.steps || 30,
        guidance_scale: options.guidance || 7.5,
        negative_prompt: options.negativePrompt || this.getDefaultNegativePrompt(),
        width: options.width || 512,
        height: options.height || 512,
      },
      options: {
        wait_for_model: true,
        use_cache: false,
      }
    };
    
    const response = await axios.post(
      API_URL,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'blob',
        timeout: 120000, // Increased timeout for FLUX (2 minutes)
      }
    );

    // Convert blob to base64
    const blob = response.data;
    const base64 = await this.blobToBase64(blob);
    
    return {
      success: true,
      image: base64,
      model: this.selectedModel,
      prompt: enhancedPrompt
    };
  } catch (error) {
    console.error('Hugging Face generation error:', error);
    
    // Check if model is loading
    if (error.response?.status === 503) {
      return {
        success: false,
        error: 'Model is loading, please wait 20-30 seconds and try again',
        loading: true
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to generate image'
    };
  }
}

  /**
   * Generate multiple variations
   */
  async generateVariations(prompt, count = 4, options = {}) {
    const promises = [];
    
    // Use different seeds for variations
    for (let i = 0; i < count; i++) {
      const seed = Math.floor(Math.random() * 1000000);
      promises.push(
        this.generateImage(prompt, {
          ...options,
          seed
        })
      );
    }

    try {
      const results = await Promise.all(promises);
      const successfulResults = results.filter(r => r.success);
      
      if (successfulResults.length === 0) {
        // If all failed, return error
        return {
          success: false,
          error: results[0]?.error || 'Failed to generate variations'
        };
      }

      return {
        success: true,
        images: successfulResults.map(r => ({
          url: r.image,
          prompt: r.prompt,
          model: r.model
        }))
      };
    } catch (error) {
      console.error('Error generating variations:', error);
      return {
        success: false,
        error: 'Failed to generate variations'
      };
    }
  }

  /**
   * Enhance prompt for better results
   */
  enhancePrompt(prompt) {
    const enhancements = [
      'high quality',
      'highly detailed',
      'professional',
      'sharp focus'
    ];

    // Add style based on asset type
    if (prompt.toLowerCase().includes('property') || prompt.toLowerCase().includes('real estate')) {
      return `${prompt}, architectural photography, ${enhancements.join(', ')}`;
    } else if (prompt.toLowerCase().includes('vehicle') || prompt.toLowerCase().includes('car')) {
      return `${prompt}, automotive photography, studio lighting, ${enhancements.join(', ')}`;
    } else if (prompt.toLowerCase().includes('art') || prompt.toLowerCase().includes('painting')) {
      return `${prompt}, digital art, ${enhancements.join(', ')}`;
    } else {
      return `${prompt}, ${enhancements.join(', ')}`;
    }
  }

  /**
   * Default negative prompt to improve quality
   */
  getDefaultNegativePrompt() {
    return 'low quality, blurry, pixelated, error, cropped, worst quality, low resolution, ugly, duplicate, morbid, mutilated, out of frame, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, bad anatomy, bad proportions, extra limbs, disfigured, malformed limbs, watermark, signature, text';
  }

  /**
   * Convert blob to base64
   */
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate mock image for testing
   */
  async generateMockImage(prompt) {
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Use placeholder service
    const mockUrl = `https://via.placeholder.com/512x512/${randomColor}/FFFFFF?text=${encodeURIComponent(prompt.slice(0, 30))}`;
    
    return {
      success: true,
      image: mockUrl,
      model: 'mock',
      prompt: prompt
    };
  }

  /**
   * Check if API key is valid
   */
  async validateApiKey(apiKey = null) {
    const keyToTest = apiKey || this.apiKey;
    
    if (!keyToTest) {
      return { valid: false, error: 'No API key provided' };
    }

    try {
      // Use proxy URL
      const API_URL = `/api/huggingface/models/${this.models['stable-diffusion-2']}`;
      
      const response = await axios.get(API_URL, {
        headers: {
          'Content-Type': 'application/json'
          // Authorization handled by proxy
        }
      });
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error.response?.data?.error || 'Invalid API key' 
      };
    }
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    return Object.entries(this.models).map(([key, value]) => ({
      key,
      name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      model: value,
      selected: value === this.selectedModel
    }));
  }

  /**
   * Upload to IPFS (if configured)
   */
  async uploadToIPFS(imageData) {
    if (!import.meta.env.VITE_PINATA_API_KEY) {
      console.log('IPFS not configured');
      return { success: false, error: 'IPFS not configured' };
    }

    try {
      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('file', blob, 'generated-image.png');

      // Upload to Pinata
      const pinataResponse = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          headers: {
            'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY,
            'pinata_secret_api_key': import.meta.env.VITE_PINATA_API_SECRET,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const ipfsHash = pinataResponse.data.IpfsHash;
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      return {
        success: true,
        ipfsHash,
        ipfsUrl
      };
    } catch (error) {
      console.error('IPFS upload error:', error);
      return {
        success: false,
        error: 'Failed to upload to IPFS'
      };
    }
  }
}

// Create singleton instance
const huggingFaceAI = new HuggingFaceAI();

if (typeof window !== 'undefined') {
  window.huggingFaceAI = huggingFaceAI;
}

// React Hook for easy integration
export const useHuggingFaceAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const generateImage = async (prompt, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress(25);
    
    try {
      const result = await huggingFaceAI.generateImage(prompt, options);
      setProgress(100);
      
      if (!result.success) {
        setError(result.error);
        return null;
      }
      
      return result;
    } catch (err) {
      setError('Unexpected error during image generation');
      return null;
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const generateVariations = async (prompt, count = 4, options = {}) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    
    try {
      // Update progress as images generate
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await huggingFaceAI.generateVariations(prompt, count, options);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (!result.success) {
        setError(result.error);
        return null;
      }
      
      return result.images;
    } catch (err) {
      setError('Unexpected error during generation');
      return null;
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return {
    generateImage,
    generateVariations,
    uploadToIPFS: huggingFaceAI.uploadToIPFS.bind(huggingFaceAI),
    setModel: huggingFaceAI.setModel.bind(huggingFaceAI),
    getAvailableModels: huggingFaceAI.getAvailableModels.bind(huggingFaceAI),
    validateApiKey: huggingFaceAI.validateApiKey.bind(huggingFaceAI),
    loading,
    error,
    progress
  };
};

export default huggingFaceAI;