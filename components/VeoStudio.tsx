import React, { useState, useRef } from 'react';
import { generateVeoVideo, ensureApiKey } from '../services/geminiService';
import { VideoGenerationState } from '../types';
import { Film, Upload, Loader2, Zap } from 'lucide-react';

const VeoStudio: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [genState, setGenState] = useState<VideoGenerationState>({
    isGenerating: false,
    progressMessage: '',
    videoUri: null,
    error: null
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    
    setGenState({ isGenerating: true, progressMessage: 'Initializing Veo Engine...', videoUri: null, error: null });
    
    try {
      await ensureApiKey();
      
      const base64Data = selectedImage.split(',')[1];
      
      setGenState(prev => ({ ...prev, progressMessage: 'Rendering visuals...' }));
      
      const videoUrl = await generateVeoVideo(base64Data, prompt, aspectRatio);
      
      if (videoUrl) {
        setGenState({
          isGenerating: false,
          progressMessage: '',
          videoUri: videoUrl,
          error: null
        });
      } else {
        throw new Error("Failed to generate video URL.");
      }

    } catch (err: any) {
      setGenState({
        isGenerating: false,
        progressMessage: '',
        videoUri: null,
        error: err.message || "Something went wrong."
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      <div className="space-y-2">
        <h2 className="text-6xl font-display font-bold text-white tracking-tighter uppercase">Veo<span className="text-acid">Studio</span></h2>
        <p className="text-stone-400 font-mono text-sm tracking-wide">AI-POWERED CINEMATIC GENERATION // V 3.1</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-acid uppercase tracking-widest">01 // Source Material</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`group border border-dashed rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all ${selectedImage ? 'border-acid bg-surface' : 'border-stone-800 bg-surface hover:border-acid/50'}`}
            >
              {selectedImage ? (
                <div className="relative w-full h-full p-2">
                   <img src={selectedImage} alt="Preview" className="h-full w-full object-contain rounded-xl" />
                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                      <p className="text-acid font-bold uppercase">Change Image</p>
                   </div>
                </div>
              ) : (
                <>
                  <Upload className="text-stone-600 group-hover:text-acid mb-4 transition-colors" size={32} />
                  <span className="text-stone-500 font-mono text-xs uppercase">Drop image or click to browse</span>
                </>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-acid uppercase tracking-widest">02 // Directive</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the movement, lighting, and vibe..."
              className="w-full p-4 bg-surface border border-stone-800 rounded-2xl focus:border-acid outline-none h-32 text-sm text-white placeholder-stone-700 resize-none font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-acid uppercase tracking-widest">03 // Format</label>
            <div className="flex gap-4">
              {['16:9', '9:16'].map((ratio) => (
                <button 
                  key={ratio}
                  onClick={() => setAspectRatio(ratio as '16:9' | '9:16')}
                  className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider rounded-xl border transition-all ${aspectRatio === ratio ? 'bg-white text-black border-white' : 'bg-surface text-stone-500 border-stone-800 hover:border-stone-600'}`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedImage || genState.isGenerating}
            className={`w-full py-5 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-sm transition-all shadow-[0_0_0_0_rgba(204,255,0,0)] ${
              !selectedImage || genState.isGenerating 
                ? 'bg-stone-900 text-stone-700 border border-stone-800 cursor-not-allowed' 
                : 'bg-acid text-black hover:bg-white hover:shadow-[0_0_30px_rgba(204,255,0,0.3)]'
            }`}
          >
            {genState.isGenerating ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : (
              <>
                <Zap size={20} fill="currentColor" />
                Generate Output
              </>
            )}
          </button>
          
          {genState.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono rounded-xl">
              ERROR: {genState.error}
            </div>
          )}
        </div>

        {/* Output Section */}
        <div className="lg:col-span-7 bg-surface rounded-3xl border border-stone-800 overflow-hidden relative min-h-[500px] flex flex-col items-center justify-center">
            {/* Grid Background */}
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.2 }}></div>

            {genState.isGenerating ? (
              <div className="text-center space-y-6 z-10 p-8">
                 <div className="w-24 h-24 border-4 border-stone-800 border-t-acid rounded-full animate-spin mx-auto"></div>
                 <div className="space-y-1">
                   <p className="text-acid font-mono text-xs uppercase animate-pulse">{genState.progressMessage}</p>
                   <p className="text-stone-600 font-mono text-[10px] uppercase">Allocating GPU Resources...</p>
                 </div>
              </div>
            ) : genState.videoUri ? (
              <div className="w-full h-full p-4 flex flex-col gap-4 z-10">
                 <div className="flex-grow rounded-2xl overflow-hidden bg-black relative border border-white/10 shadow-2xl">
                    <video 
                      src={genState.videoUri} 
                      controls 
                      autoPlay 
                      loop 
                      className="w-full h-full object-contain"
                    />
                 </div>
                 <div className="flex justify-end">
                    <a 
                      href={genState.videoUri} 
                      download="veo_creation.mp4"
                      className="text-black bg-white hover:bg-acid px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Download MP4
                    </a>
                 </div>
              </div>
            ) : (
              <div className="text-center space-y-4 opacity-20 z-10">
                <Film size={80} className="mx-auto text-white" />
                <p className="font-display font-bold text-2xl tracking-tight text-white">READY FOR INPUT</p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default VeoStudio;