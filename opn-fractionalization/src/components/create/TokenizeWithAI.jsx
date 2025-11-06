// src/components/create/TokenizeWithAI.jsx
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Loader2, RefreshCw, AlertCircle, 
  CheckCircle, Image, Wand2, Shield, ArrowRight,
  Zap, Info, X, Settings, Cpu, Palette
} from 'lucide-react';
import { useHuggingFaceAI } from '../../services/huggingfaceAI';
import { useProfanityFilter } from '../../utils/profanityFilter';
import { useContract } from '../../hooks/useContract';
import { useWeb3 } from '../../contexts/Web3Context';
import { useApp } from '../../contexts/AppContext';
import { ethers } from 'ethers';

const TokenizeWithAI = () => {
  const { isConnected, address } = useWeb3();
  const { fractionalization } = useContract();
  const { addNotification } = useApp();
  const { 
    generateVariations, 
    loading: aiLoading, 
    error: aiError,
    progress,
    setModel,
    getAvailableModels,
    validateApiKey
  } = useHuggingFaceAI();
  const profanityFilter = useProfanityFilter();

  const [step, setStep] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(false);
  const [selectedModelKey, setSelectedModelKey] = useState('stable-diffusion-xl');
  const [availableModels, setAvailableModels] = useState([]);

  const [formData, setFormData] = useState({
    assetType: 'Digital Art',
    assetName: '',
    assetDescription: '',
    aiPrompt: '',
    totalFractions: 1000,
    pricePerFraction: '0.01',
    requiresKYC: false,
    // AI Settings
    negativePrompt: '',
    steps: 50,
    guidance: 7.5,
  });
  
  const [validation, setValidation] = useState({});
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assetTypes = [
    'Digital Art',
    'Real Estate',
    'Vehicle',
    'Collectible',
    'Other'
  ];

  // Load available models
  useEffect(() => {
    const models = getAvailableModels();
    setAvailableModels(models);
  }, []);

  // Check API key on mount
  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const result = await validateApiKey();
    setApiKeyValid(result.valid);
    if (!result.valid && import.meta.env.VITE_HUGGINGFACE_API_KEY) {
      addNotification({
        type: 'warning',
        title: 'Invalid API Key',
        message: 'Hugging Face API key is invalid. Using mock mode.'
      });
    }
  };

  // Validate input for profanity
  const validateInput = (field, value) => {
    const result = profanityFilter.validate(value);
    
    setValidation(prev => ({
      ...prev,
      [field]: result
    }));

    if (!result.isValid) {
      addNotification({
        type: 'warning',
        title: 'Content Warning',
        message: result.message
      });
    }

    return result.isValid;
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    if (field === 'assetName' || field === 'assetDescription' || field === 'aiPrompt') {
      const isValid = validateInput(field, value);
      if (!isValid) return;
    }

    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle model change
  const handleModelChange = (modelKey) => {
    setSelectedModelKey(modelKey);
    setModel(modelKey);
    addNotification({
      type: 'info',
      title: 'Model Changed',
      message: `Switched to ${modelKey.replace(/-/g, ' ')}`
    });
  };

  // Generate AI images
  const handleGenerateImages = async () => {
    if (!formData.aiPrompt.trim()) {
      addNotification({
        type: 'error',
        title: 'Missing Prompt',
        message: 'Please describe what you want to create'
      });
      return;
    }

    if (!validateInput('aiPrompt', formData.aiPrompt)) {
      return;
    }

    const options = {
      negativePrompt: formData.negativePrompt,
      steps: formData.steps,
      guidance: formData.guidance,
    };

    const images = await generateVariations(formData.aiPrompt, 4, options);
    
    if (images) {
      setGeneratedImages(images);
      setSelectedImage(images[0]);
      setStep(3);
      
      addNotification({
        type: 'success',
        title: 'Images Generated!',
        message: 'Select your favorite or regenerate for more options'
      });
    } else if (aiError) {
      addNotification({
        type: 'error',
        title: 'Generation Failed',
        message: aiError
      });
    }
  };

  // Regenerate images
  const handleRegenerate = async () => {
    const images = await generateVariations(formData.aiPrompt, 4, {
      negativePrompt: formData.negativePrompt,
      steps: formData.steps,
      guidance: formData.guidance,
    });
    
    if (images) {
      setGeneratedImages(images);
      setSelectedImage(images[0]);
    }
  };

  // Submit fractionalization request
  const handleSubmit = async () => {
    if (!fractionalization || !isConnected) return;

    setIsSubmitting(true);
    
    try {
      const imageUrl = selectedImage.url || selectedImage;
      
      const tx = await fractionalization.createFractionalizationRequest(
        formData.assetType,
        formData.assetName,
        formData.assetDescription,
        imageUrl,
        formData.totalFractions,
        ethers.utils.parseEther(formData.pricePerFraction.toString()),
        formData.requiresKYC
      );

      await tx.wait();

      addNotification({
        type: 'success',
        title: 'Asset Created!',
        message: 'Your asset has been submitted for fractionalization'
      });

      // Reset form
      setFormData({
        assetType: 'Digital Art',
        assetName: '',
        assetDescription: '',
        aiPrompt: '',
        totalFractions: 1000,
        pricePerFraction: '0.01',
        requiresKYC: false,
        negativePrompt: '',
        steps: 50,
        guidance: 7.5,
      });
      setGeneratedImages([]);
      setSelectedImage(null);
      setStep(1);
      
    } catch (error) {
      console.error('Submission error:', error);
      addNotification({
        type: 'error',
        title: 'Submission Failed',
        message: error.message || 'Failed to create asset'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-500" />
              <h1 className="text-3xl font-light">AI Asset Tokenization</h1>
            </div>
            
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-neutral-400 font-light">
            Powered by Hugging Face AI - Create unique digital assets and tokenize them
          </p>
          
          {/* API Status */}
          <div className="mt-4 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${apiKeyValid ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-neutral-500">
              {apiKeyValid ? 'Hugging Face Connected' : 'Using Mock Mode (No API Key)'}
            </span>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-6 bg-neutral-950 border border-neutral-900 rounded-lg">
            <h3 className="text-lg font-normal mb-4">AI Settings</h3>
            
            {/* Model Selection */}
            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">AI Model</label>
              <select
                value={selectedModelKey}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white"
              >
                {availableModels.map(model => (
                  <option key={model.key} value={model.key}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Different models produce different artistic styles
              </p>
            </div>

            {/* Advanced Settings */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Inference Steps (Quality)
                </label>
                <input
                  type="number"
                  value={formData.steps}
                  onChange={(e) => handleInputChange('steps', parseInt(e.target.value))}
                  min="20"
                  max="100"
                  className="w-full px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white"
                />
                <p className="text-xs text-neutral-500 mt-1">Higher = Better quality, slower</p>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Guidance Scale (Adherence)
                </label>
                <input
                  type="number"
                  value={formData.guidance}
                  onChange={(e) => handleInputChange('guidance', parseFloat(e.target.value))}
                  min="1"
                  max="20"
                  step="0.5"
                  className="w-full px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white"
                />
                <p className="text-xs text-neutral-500 mt-1">Higher = Follows prompt more closely</p>
              </div>
            </div>

            {/* Negative Prompt */}
            <div className="mt-4">
              <label className="block text-sm text-neutral-400 mb-2">
                Negative Prompt (Optional)
              </label>
              <input
                type="text"
                value={formData.negativePrompt}
                onChange={(e) => handleInputChange('negativePrompt', e.target.value)}
                placeholder="Things to avoid in the image..."
                className="w-full px-4 py-2 bg-black border border-neutral-800 rounded-lg text-white"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Specify what you don't want in the image
              </p>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((num) => (
              <React.Fragment key={num}>
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${step >= num 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                    : 'bg-neutral-900 text-neutral-500'
                  }
                `}>
                  {num}
                </div>
                {num < 4 && (
                  <div className={`
                    w-12 h-0.5 transition-all duration-300
                    ${step > num ? 'bg-purple-600' : 'bg-neutral-800'}
                  `} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Describe Asset */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6 space-y-6">
              <h2 className="text-xl font-normal mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-500" />
                Describe Your Asset
              </h2>
              
              {/* Asset Type */}
              <div>
                <label className="block text-sm font-light text-neutral-400 mb-2">
                  Asset Type
                </label>
                <select
                  value={formData.assetType}
                  onChange={(e) => handleInputChange('assetType', e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                >
                  {assetTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* AI Prompt */}
              <div>
                <label className="block text-sm font-light text-neutral-400 mb-2">
                  Describe what you want to create
                </label>
                <textarea
                  value={formData.aiPrompt}
                  onChange={(e) => handleInputChange('aiPrompt', e.target.value)}
                  placeholder="A futuristic cyberpunk city with neon lights and flying cars..."
                  className={`
                    w-full px-4 py-3 bg-black border rounded-lg text-white 
                    focus:outline-none transition-colors resize-none
                    ${validation.aiPrompt?.isValid === false 
                      ? 'border-red-500' 
                      : 'border-neutral-800 focus:border-purple-500'
                    }
                  `}
                  rows={4}
                />
                {validation.aiPrompt?.isValid === false && (
                  <p className="text-red-500 text-xs mt-1">{validation.aiPrompt.message}</p>
                )}
                <p className="text-xs text-neutral-500 mt-1">
                  Be descriptive! Hugging Face AI will create unique artwork based on your description.
                </p>
              </div>

              {/* Model Info */}
              <div className="p-4 bg-black/50 rounded-lg border border-neutral-900">
                <div className="flex items-start gap-3">
                  <Cpu className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-neutral-300 mb-1">
                      Using: {selectedModelKey.replace(/-/g, ' ')}
                    </p>
                    <p className="text-neutral-500 text-xs">
                      {apiKeyValid 
                        ? 'Connected to Hugging Face API'
                        : 'Mock mode - Add API key in .env for real generation'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={() => setStep(2)}
                disabled={!formData.aiPrompt.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-normal hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Wand2 className="w-5 h-5" />
                Generate with Hugging Face
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Generate Images */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-normal mb-2">Generating Your Assets...</h2>
                <p className="text-neutral-400 text-sm font-light">
                  Creating 4 unique variations with Hugging Face AI
                </p>
              </div>

              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-purple-500/30 animate-pulse" />
                  </div>
                  
                  {/* Progress Bar */}
                  {progress > 0 && (
                    <div className="w-full max-w-xs mt-6">
                      <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-neutral-500 text-xs mt-2 text-center">{progress}%</p>
                    </div>
                  )}
                  
                  <p className="text-neutral-400 mt-4">
                    {progress < 30 
                      ? 'Initializing Hugging Face model...'
                      : progress < 60
                      ? 'Processing your prompt...'
                      : progress < 90
                      ? 'Generating variations...'
                      : 'Almost done...'
                    }
                  </p>
                </div>
              ) : aiError ? (
                <div className="text-center py-16">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-500 mb-2">{aiError}</p>
                  <p className="text-neutral-500 text-sm mb-4">
                    {aiError.includes('loading') 
                      ? 'The model is warming up. Please wait a moment and try again.'
                      : 'There was an issue generating your images.'
                    }
                  </p>
                  <button
                    onClick={handleGenerateImages}
                    className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateImages}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-normal hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Start Generation
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Configure & Select */}
        {step === 3 && (
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8">
              
              {/* Image Selection */}
              <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-normal">Select Your Asset</h2>
                  <button
                    onClick={handleRegenerate}
                    disabled={aiLoading}
                    className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${aiLoading ? 'animate-spin' : ''}`} />
                    Regenerate
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((image, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedImage(image)}
                      className={`
                        relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                        ${(selectedImage?.url || selectedImage) === (image.url || image)
                          ? 'border-purple-500 shadow-lg shadow-purple-500/20' 
                          : 'border-neutral-800 hover:border-neutral-700'
                        }
                      `}
                    >
                      <img 
                        src={image.url || image} 
                        alt={`Generated ${index + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                      {(selectedImage?.url || selectedImage) === (image.url || image) && (
                        <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Model info for generated images */}
                <div className="mt-4 p-3 bg-black/50 rounded border border-neutral-900">
                  <p className="text-xs text-neutral-500">
                    Generated with: {selectedImage?.model || selectedModelKey}
                  </p>
                </div>
              </div>

              {/* Asset Configuration */}
              <div className="bg-neutral-950 border border-neutral-900 rounded-lg p-6 space-y-6">
                <h2 className="text-xl font-normal mb-4">Configure Details</h2>

                {/* Asset Name */}
                <div>
                  <label className="block text-sm font-light text-neutral-400 mb-2">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    value={formData.assetName}
                    onChange={(e) => handleInputChange('assetName', e.target.value)}
                    placeholder="My Amazing Asset"
                    className={`
                      w-full px-4 py-3 bg-black border rounded-lg text-white
                      focus:outline-none transition-colors
                      ${validation.assetName?.isValid === false 
                        ? 'border-red-500' 
                        : 'border-neutral-800 focus:border-purple-500'
                      }
                    `}
                  />
                  {validation.assetName?.isValid === false && (
                    <p className="text-red-500 text-xs mt-1">{validation.assetName.message}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-light text-neutral-400 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.assetDescription}
                    onChange={(e) => handleInputChange('assetDescription', e.target.value)}
                    placeholder="Describe your asset..."
                    className={`
                      w-full px-4 py-3 bg-black border rounded-lg text-white
                      focus:outline-none transition-colors resize-none
                      ${validation.assetDescription?.isValid === false 
                        ? 'border-red-500' 
                        : 'border-neutral-800 focus:border-purple-500'
                      }
                    `}
                    rows={3}
                  />
                </div>

                {/* Fractionalization Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-light text-neutral-400 mb-2">
                      Total Fractions
                    </label>
                    <input
                      type="number"
                      value={formData.totalFractions}
                      onChange={(e) => handleInputChange('totalFractions', parseInt(e.target.value))}
                      min="1"
                      max="1000000"
                      className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-neutral-400 mb-2">
                      Price per Fraction (SAGE)
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerFraction}
                      onChange={(e) => handleInputChange('pricePerFraction', e.target.value)}
                      min="0.001"
                      step="0.001"
                      className="w-full px-4 py-3 bg-black border border-neutral-800 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setStep(4)}
                  disabled={!formData.assetName.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-normal hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Review & Create
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-neutral-950 border border-neutral-900 rounded-lg overflow-hidden">
              {/* Preview Header */}
              <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 p-6 border-b border-neutral-900">
                <h2 className="text-xl font-normal mb-2">Review Your Asset</h2>
                <p className="text-sm text-neutral-400">
                  Please review all details before creating your tokenized asset
                </p>
              </div>

              {/* Asset Preview */}
              <div className="p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Image */}
                  <div>
                    <img 
                      src={selectedImage?.url || selectedImage} 
                      alt={formData.assetName}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Asset Name</p>
                      <p className="text-white font-normal">{formData.assetName}</p>
                    </div>

                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Type</p>
                      <p className="text-white">{formData.assetType}</p>
                    </div>

                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Description</p>
                      <p className="text-neutral-300 text-sm">
                        {formData.assetDescription || 'No description provided'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Total Fractions</p>
                        <p className="text-white">{formData.totalFractions.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Price per Fraction</p>
                        <p className="text-white">{formData.pricePerFraction} SAGE</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Total Value</p>
                      <p className="text-2xl font-light text-white">
                        {(formData.totalFractions * parseFloat(formData.pricePerFraction)).toFixed(2)} SAGE
                      </p>
                    </div>

                    {/* AI Info */}
                    <div className="flex items-center gap-2 text-purple-500">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs">Generated with Hugging Face AI</span>
                    </div>
                  </div>
                </div>

                {/* Platform Notice */}
                <div className="p-4 bg-black rounded-lg border border-neutral-900">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-neutral-300 mb-1">
                        Platform Fee: 2.5% on sales
                      </p>
                      <p className="text-neutral-500 text-xs">
                        This is a testnet deployment. No real value is being transacted.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 bg-neutral-900 text-white rounded-lg font-normal hover:bg-neutral-800 transition-colors"
                  >
                    Back to Edit
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !isConnected}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-normal hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Create Asset
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default TokenizeWithAI;