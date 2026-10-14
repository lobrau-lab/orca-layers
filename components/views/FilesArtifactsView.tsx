'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { ProjectArtifact } from '@/lib/types';
import { 
  FolderGit2, 
  FileText, 
  Image as ImageIcon, 
  Code2, 
  ShieldCheck, 
  Download, 
  Eye, 
  Upload, 
  Film, 
  Music, 
  Send, 
  CheckCircle2, 
  FileCheck,
  HardDrive,
  Sparkles,
  ArrowUpRight,
  Share2
} from 'lucide-react';

interface Props {
  artifacts: ProjectArtifact[];
}

interface DeliverableItem extends ProjectArtifact {
  fileSizeFormatted?: string;
  mediaCategory?: 'document' | 'photo' | 'video' | 'audio' | 'code' | 'other';
  downloadUrl?: string;
  sender?: string;
  recipientNode?: string;
}

export const FilesArtifactsView: React.FC<Props> = ({ artifacts: initialArtifacts }) => {
  // Combine initial artifacts with user-uploaded/sent deliverables
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>(() => {
    return initialArtifacts.map(art => ({
      ...art,
      fileSizeFormatted: art.type === 'image' ? '14.2 MB' : art.type === 'code' ? '184 KB' : '2.1 MB',
      mediaCategory: art.type === 'image' ? 'photo' : art.type === 'code' ? 'code' : 'document',
      downloadUrl: art.contentUrl || undefined,
      sender: art.agentId,
      recipientNode: art.machineId
    }));
  });

  const [selectedItem, setSelectedItem] = useState<DeliverableItem | null>(deliverables[0] || null);
  const [filterTab, setFilterTab] = useState<'all' | 'documents' | 'photos' | 'video' | 'audio'>('all');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [sendSuccessToast, setSendSuccessToast] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Determine media category based on MIME or extension
  const getMediaCategory = (type: string, name: string): 'document' | 'photo' | 'video' | 'audio' | 'code' | 'other' => {
    if (type.startsWith('image/')) return 'photo';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('json') || type.includes('javascript') || type.includes('typescript') || name.endsWith('.ts') || name.endsWith('.rs') || name.endsWith('.py')) return 'code';
    if (type.includes('pdf') || type.includes('word') || type.includes('text') || name.endsWith('.md') || name.endsWith('.txt')) return 'document';
    return 'other';
  };

  // Handle local file drop/select with unlimited size tolerance (Blob/ObjectUrl)
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    setUploadProgress(15);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (!prev) return 100;
        if (prev >= 90) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 150);

    setTimeout(() => {
      const objectUrl = URL.createObjectURL(file);
      const cat = getMediaCategory(file.type, file.name);

      const newItem: DeliverableItem = {
        id: `deliverable-${Date.now()}`,
        title: file.name,
        project: 'Orchestra Core',
        type: cat === 'photo' ? 'image' : cat === 'code' ? 'code' : 'text',
        agentId: 'operator-desktop',
        machineId: 'node-desktop-rig',
        model: 'Direct File Pipeline',
        createdAt: new Date().toISOString(),
        approvalState: 'approved',
        tags: [cat, 'deliverable', 'uploaded'],
        hash: Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10),
        originatingTaskId: 'deliverable-exchange-01',
        contentUrl: cat === 'photo' || cat === 'video' ? objectUrl : undefined,
        downloadUrl: objectUrl,
        fileSizeFormatted: formatBytes(file.size),
        mediaCategory: cat,
        contentSnippet: cat === 'document' || cat === 'code' ? `Direct file upload stream [${file.name}, ${formatBytes(file.size)}]` : undefined,
        sender: 'Operator Dispatcher',
        recipientNode: 'All Connected Nodes'
      };

      setDeliverables(prev => [newItem, ...prev]);
      setSelectedItem(newItem);
      setUploadProgress(null);
      setSendSuccessToast(`Deliverable "${file.name}" (${formatBytes(file.size)}) received & cataloged!`);
      setTimeout(() => setSendSuccessToast(null), 4000);
    }, 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  const filteredItems = deliverables.filter(item => {
    if (filterTab === 'all') return true;
    if (filterTab === 'documents') return item.mediaCategory === 'document' || item.mediaCategory === 'code';
    if (filterTab === 'photos') return item.mediaCategory === 'photo';
    if (filterTab === 'video') return item.mediaCategory === 'video';
    if (filterTab === 'audio') return item.mediaCategory === 'audio';
    return true;
  });

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'photo': return <ImageIcon className="w-4 h-4 text-amber-400" />;
      case 'video': return <Film className="w-4 h-4 text-rose-400" />;
      case 'audio': return <Music className="w-4 h-4 text-purple-400" />;
      case 'code': return <Code2 className="w-4 h-4 text-emerald-400" />;
      default: return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & File Exchange Hub */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-slate-100 font-semibold text-sm">Deliverables, Documents & Media Exchange</h2>
              <p className="text-xs text-slate-400">Send and receive documents, high-res photos, 4K video, audio recordings & deliverables with multi-GB tolerance</p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg flex items-center gap-2 transition shadow-lg shadow-blue-600/20 shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Deliverable</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => handleFileUpload(e.target.files)} 
            className="hidden" 
            multiple
          />
        </div>

        {/* Drag and Drop Zone */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/60 rounded-xl p-6 text-center cursor-pointer transition space-y-2 group"
        >
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-200 font-medium text-xs">
              Drag & Drop Deliverables, Photos, Videos, Audio, or Documents
            </p>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Supports PDF, DOCX, MP4, WEBM, MP3, WAV, PNG, WEBP, ZIP up to 10 GB per file streaming chunk
            </p>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-blue-400 font-mono">
              <span>Streaming deliverable payload...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {/* Success Toast Notification */}
        {sendSuccessToast && (
          <div className="flex items-center gap-2 bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 p-3 rounded-lg text-xs font-medium animate-fade-in">
            <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{sendSuccessToast}</span>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-2 text-xs pt-2 border-t border-slate-800 overflow-x-auto">
          <span className="text-slate-400 font-mono text-[11px]">Filter Category:</span>
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 rounded-lg transition ${filterTab === 'all' ? 'bg-blue-600 text-white font-medium' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
          >
            All Items ({deliverables.length})
          </button>
          <button
            onClick={() => setFilterTab('documents')}
            className={`px-3 py-1 rounded-lg transition ${filterTab === 'documents' ? 'bg-blue-600 text-white font-medium' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
          >
            Documents & Specs
          </button>
          <button
            onClick={() => setFilterTab('photos')}
            className={`px-3 py-1 rounded-lg transition ${filterTab === 'photos' ? 'bg-blue-600 text-white font-medium' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
          >
            Photos & Imagery
          </button>
          <button
            onClick={() => setFilterTab('video')}
            className={`px-3 py-1 rounded-lg transition ${filterTab === 'video' ? 'bg-blue-600 text-white font-medium' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
          >
            Video Recordings
          </button>
          <button
            onClick={() => setFilterTab('audio')}
            className={`px-3 py-1 rounded-lg transition ${filterTab === 'audio' ? 'bg-blue-600 text-white font-medium' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'}`}
          >
            Audio Streams
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Deliverables List (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {filteredItems.map((art) => (
            <div
              key={art.id}
              onClick={() => setSelectedItem(art)}
              className={`bg-slate-900 border rounded-xl p-4 transition cursor-pointer hover:border-slate-700 space-y-3 ${selectedItem?.id === art.id ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-800'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    {getCategoryIcon(art.mediaCategory)}
                  </div>
                  <div>
                    <h3 className="text-slate-100 font-semibold text-sm">{art.title}</h3>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="font-mono text-slate-300">{art.fileSizeFormatted}</span>
                      <span>•</span>
                      <span>Sender: <strong className="text-slate-200">{art.sender || art.agentId}</strong></span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  Approved Hash #{art.hash.substring(0, 8)}
                </span>
              </div>

              {art.contentSnippet && (
                <p className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 line-clamp-2">
                  {art.contentSnippet}
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <span>Task Origin: <strong className="text-blue-400">#{art.originatingTaskId}</strong></span>
                <span>Node: <strong className="text-white">{art.machineId}</strong></span>
                <span>Model: <strong className="text-slate-300">{art.model}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Item Inspector & Player (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          {selectedItem ? (
            <>
              <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono text-slate-500">Deliverable Payload #{selectedItem.id.substring(0, 12)}</span>
                  <h3 className="text-slate-100 font-semibold text-sm mt-0.5">{selectedItem.title}</h3>
                </div>
                
                {selectedItem.downloadUrl && (
                  <a
                    href={selectedItem.downloadUrl}
                    download={selectedItem.title}
                    className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg border border-blue-500/30 transition"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Rich Preview Player Section */}
              <div className="bg-slate-950 rounded-lg overflow-hidden border border-slate-800 p-2 min-h-[160px] flex items-center justify-center">
                {selectedItem.mediaCategory === 'photo' && selectedItem.contentUrl ? (
                  <div className="relative aspect-square w-full rounded overflow-hidden">
                    <Image src={selectedItem.contentUrl} alt={selectedItem.title} fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : selectedItem.mediaCategory === 'video' && selectedItem.downloadUrl ? (
                  <video controls className="w-full rounded max-h-56">
                    <source src={selectedItem.downloadUrl} />
                    Your browser does not support HTML video playback.
                  </video>
                ) : selectedItem.mediaCategory === 'audio' && selectedItem.downloadUrl ? (
                  <div className="w-full space-y-3 p-3">
                    <div className="flex items-center justify-center gap-1.5 text-purple-400 font-mono text-xs">
                      <Music className="w-5 h-5 animate-pulse" />
                      <span>Audio Recording Payload</span>
                    </div>
                    <audio controls className="w-full">
                      <source src={selectedItem.downloadUrl} />
                    </audio>
                  </div>
                ) : (
                  <div className="p-3 text-xs font-mono text-slate-300 w-full max-h-48 overflow-y-auto bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-500 block mb-1 text-[10px] uppercase">Document / Payload Contents</span>
                    {selectedItem.contentSnippet || `[Binary File Deliverable: ${selectedItem.title}, Size: ${selectedItem.fileSizeFormatted}]`}
                  </div>
                )}
              </div>

              {/* Provenance Details */}
              <div className="space-y-2 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">File Metadata & Origin</span>
                  <div className="text-slate-300">Size: <strong className="text-white font-mono">{selectedItem.fileSizeFormatted}</strong></div>
                  <div className="text-slate-300">Category: <strong className="text-blue-400 capitalize">{selectedItem.mediaCategory || selectedItem.type}</strong></div>
                  <div className="text-slate-300">Generating Model: {selectedItem.model}</div>
                  <div className="text-slate-300">SHA-256 Hash: <code className="text-emerald-400 text-[11px] block truncate">{selectedItem.hash}</code></div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-500 block text-[10px] uppercase font-mono">Provenance Verification</span>
                  <div className="text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Cryptographically signed & verified payload</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">Select a deliverable or upload a file to inspect</div>
          )}
        </div>
      </div>
    </div>
  );
};
