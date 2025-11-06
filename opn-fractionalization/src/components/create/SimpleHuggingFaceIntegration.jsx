// src/components/create/SimpleHuggingFaceIntegration.jsx
// SIMPLE VERSION - Just the AI generation part to add to your existing tokenize component

import React, { useState } from 'react';
import { Wand2, Loader2, RefreshCw } from 'lucide-react';
import axios from 'axios';

// Simple Hugging Face hook
const useSimpleHuggingFace = () => {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;

  const generateImages = async (prompt, count = 4) => {
    setLoading(true);
    const generatedImages = [];

    try {
      // Generate multiple images with different seeds
      for (let i = 0; i < count; i++) {
        const response = await axios.post(
          'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
          {
            inputs: `${prompt}, high quality, detailed, 8k`,
            parameters: {
              num_inference_steps: 30, // Faster generation
              guidance_scale: 7.5,
              seed: Math.floor(Math.random() * 1000000)
            },
            options: {
              wait_for_model: true
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'blob',
            timeout: 30000
          }
        );

        // Convert blob to base64
        const blob = response.data;
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        
        generatedImages.push(base64);
      }

      setImages(generatedImages);
      return generatedImages;
    } catch (error) {
      console.error('Generation error:', error);
      // Return mock images if API fails
      const mockImages = Array(count).fill(null).map((_, i) => 
        `https://via.placeholder.com/512x512/9333ea/ffffff?text=Asset+${i+1}`
      );
      setImages(mockImages);
      return mockImages;
    } finally {
      setLoading(false);
    }
  };

  return { generateImages, loading, images };
};

// Simple component to add to your existing tokenize form
export const HuggingFaceImageGenerator = ({ onImageSelected }) => {
  const { generateImages, loading, images } = useSimpleHuggingFace();
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await generateImages(prompt, 4);
  };

  const handleSelectImage = (image) => {
    setSelectedImage(image);
    if (onImageSelected) {
      onImageSelected(image);
    }
  };

  return (
    <div className="space-y-4">
      {/* Prompt Input */}
      <div>
        <label className="block text-sm text-neutral-400 mb-2">
          AI Image Prompt
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your asset..."
            className="flex-1 px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white"
            disabled={loading}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
          <p className="text-neutral-400 mt-2">Generating with Hugging Face AI...</p>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && !loading && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              onClick={() => handleSelectImage(image)}
              className={`
                relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                ${selectedImage === image
                  ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                  : 'border-neutral-800 hover:border-neutral-700'
                }
              `}
            >
              <img 
                src={image} 
                alt={`Generated ${index + 1}`}
                className="w-full aspect-square object-cover"
              />
              {selectedImage === image && (
                <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                  <div className="bg-purple-600 text-white px-3 py-1 rounded">
                    Selected
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Regenerate Button */}
      {images.length > 0 && !loading && (
        <button
          onClick={handleGenerate}
          className="w-full py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
      )}
    </div>
  );
};

// Example: How to add to your existing form
export const ExampleIntegration = () => {
  const [assetImage, setAssetImage] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetDescription, setAssetDescription] = useState('');

  const handleSubmit = () => {
    console.log('Submitting:', { assetImage, assetName, assetDescription });
    // Your existing submit logic
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-neutral-950 rounded-lg">
      <h2 className="text-2xl font-light mb-6">Create Asset with AI</h2>
      
      {/* AI Image Generator Component */}
      <HuggingFaceImageGenerator 
        onImageSelected={(image) => setAssetImage(image)}
      />

      {/* Your existing form fields */}
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Asset Name
          </label>
          <input
            type="text"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
            className="w-full px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-2">
            Description
          </label>
          <textarea
            value={assetDescription}
            onChange={(e) => setAssetDescription(e.target.value)}
            className="w-full px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white"
            rows={3}
          />
        </div>

        {/* Selected Image Preview */}
        {assetImage && (
          <div>
            <p className="text-sm text-neutral-400 mb-2">Selected Image:</p>
            <img src={assetImage} alt="Selected" className="w-32 h-32 rounded-lg" />
          </div>
        )}

        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Create Asset
        </button>
      </div>
    </div>
  );
};

export default HuggingFaceImageGenerator;
