'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { CreativeShot } from '@/lib/types';
import { Palette, Film, Sparkles, Music, Play, Send, Image as ImageIcon, Sliders, RefreshCw, Eye, Download } from 'lucide-react';

interface Props {
  shots: CreativeShot[];
  onGenerateShot: (shot: Partial<CreativeShot>) => void;
}

export const CreativeStudioView: React.FC<Props> = ({ shots, onGenerateShot }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'music'>('visual');

  // Prompt Composer Form State
  const [project, setProject] = useState('Motel Lazarus');
  const [character, setCharacter] = useState('Detective Vance');
  const [loraTrigger, setLoraTrigger] = useState('motel_lazarus_cybernoir_v2');
  const [shotSize, setShotSize] = useState('Medium Close-up');
  const [lighting, setLighting] = useState('Magenta/Cyan Anamorphic Neon');
  const [prompt, setPrompt] = useState('Detective Vance standing under flickering neon sign in rain-slicked alleyway, reflections on wet pavement, high contrast film grain.');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, cartoon, overexposed');
  const [seed, setSeed] = useState(84920194);
  const [resolution, setResolution] = useState('1024x1024');

  // Music Workflow State
  const [musicSource, setMusicSource] = useState('Motel Lazarus Chapter 4 script section: The Midnight Call.');
  const [musicPrompt, setMusicPrompt] = useState('Dark synthwave track with melancholic saxophone solo, 85 BPM, analogue chorus synth, rain ambiance background.');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  const handleShotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateShot({
      project,
      sceneName: 'Scene 4B',
      character,
      loraTrigger,
      prompt,
      negativePrompt,
      seed,
      width: 1024,
      height: 1024,
      sampler: 'Euler A',
      status: 'rendering',
      aspectRatio: '1:1',
      createdAt: new Date().toISOString()
    });
  };

  const handleGenerateMusic = () => {
    setIsGeneratingMusic(true);
    setTimeout(() => {
      setIsGeneratingMusic(false);
      setGeneratedAudioUrl('https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_hum.ogg');
    }, 2500);
  };

  return (
    <div className="space-y-4">
      {/* Creative Studio Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-slate-100 font-semibold text-sm">Creative Studio — Motel Lazarus & Hyperion City</h2>
            <p className="text-xs text-slate-400">Cinematic prompt composer, ComfyUI workflow dispatcher, and music generator</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 font-medium ${activeTab === 'visual' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Visual Concept Studio (ComfyUI)</span>
          </button>
          <button
            onClick={() => setActiveTab('music')}
            className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 font-medium ${activeTab === 'music' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Music & Audio Workflow</span>
          </button>
        </div>
      </div>

      {activeTab === 'visual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Prompt Composer Form (1 col) */}
          <form onSubmit={handleShotSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Cinematic Shot Composer
            </h3>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Project Workspace:</label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                >
                  <option value="Motel Lazarus">Motel Lazarus</option>
                  <option value="Hyperion City">Hyperion City</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Character:</label>
                  <input
                    type="text"
                    value={character}
                    onChange={(e) => setCharacter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">LoRA Trigger:</label>
                  <input
                    type="text"
                    value={loraTrigger}
                    onChange={(e) => setLoraTrigger(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Prompt Text:</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Negative Prompt:</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-400 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Seed:</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Lighting / Style:</label>
                  <input
                    type="text"
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition shadow-lg shadow-amber-600/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Submit to ComfyUI Render Queue</span>
            </button>
          </form>

          {/* Render Queue & Shot Gallery (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-slate-100 font-semibold text-sm">ComfyUI Render Gallery & Shot Provenance</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {shots.map((shot) => (
                <div key={shot.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="relative aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                    {shot.previewUrl ? (
                      <Image src={shot.previewUrl} alt={shot.sceneName} fill className="object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-center p-4">
                        <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
                        <span className="text-xs font-mono text-amber-300">ComfyUI Rendering Step 28/35...</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{shot.project} — {shot.sceneName}</span>
                      <span className="text-[10px] font-mono text-slate-500">Seed: {shot.seed}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{shot.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Music Workflow Tab */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 max-w-2xl mx-auto">
          <h3 className="text-slate-100 font-semibold text-sm flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-400" />
            Script to Music & Sound Production Pipeline
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Ingested Script Seed Text:</label>
              <textarea
                value={musicSource}
                onChange={(e) => setMusicSource(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Production Audio Prompt:</label>
              <textarea
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:outline-none"
              />
            </div>

            <button
              onClick={handleGenerateMusic}
              disabled={isGeneratingMusic}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition"
            >
              {isGeneratingMusic ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{isGeneratingMusic ? 'Synthesizing Audio Stream...' : 'Synthesize Audio Track'}</span>
            </button>

            {generatedAudioUrl && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 mt-4">
                <span className="text-xs text-emerald-400 font-medium block">Audio Stream Synthesized Successfully:</span>
                <audio controls src={generatedAudioUrl} className="w-full" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
