// components/court/CourtControls.tsx
import React from 'react';
import { RotateCcw, FastForward, Play, Pause, FileText, Volume2, VolumeX, Eye } from 'lucide-react';

export interface CourtControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReplay: () => void;
  onSkipToVerdict: () => void;
  speed: 1 | 2;
  onToggleSpeed: () => void;
  isTranscriptOpen: boolean;
  onToggleTranscript: () => void;
  soundActive: boolean;
  onToggleSound: () => void;
  currentPhaseName?: string;
  isDebating?: boolean;
}

export const CourtControls: React.FC<CourtControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onReplay,
  onSkipToVerdict,
  speed,
  onToggleSpeed,
  isTranscriptOpen,
  onToggleTranscript,
  soundActive,
  onToggleSound,
  currentPhaseName = 'IDLE',
  isDebating = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#0a0c10] border border-white/10 rounded-xl text-xs font-mono text-zinc-300">
      {/* Left: Phase indicator */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            isDebating ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'
          }`}
        />
        <span className="text-zinc-500 text-[11px] uppercase tracking-wider">Session State:</span>
        <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
          {currentPhaseName}
        </span>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer transition-colors"
          title={isPlaying ? 'Pause timeline' : 'Resume timeline'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        {/* Replay */}
        <button
          onClick={onReplay}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white cursor-pointer transition-colors"
          title="Replay trial from beginning"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay</span>
        </button>

        {/* Skip to Verdict */}
        <button
          onClick={onSkipToVerdict}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white cursor-pointer transition-colors"
          title="Jump directly to risk ruling & verdict"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>Skip to Ruling</span>
        </button>

        {/* Playback Speed (1x / 2x) */}
        <button
          onClick={onToggleSpeed}
          className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer transition-colors ${
            speed === 2
              ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
          }`}
          title="Toggle playback speed"
        >
          {speed}x
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
            soundActive
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300'
          }`}
          title={soundActive ? 'Audio enabled' : 'Audio muted'}
        >
          {soundActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Full Transcript Drawer Button */}
        <button
          onClick={onToggleTranscript}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
            isTranscriptOpen
              ? 'bg-white text-black font-bold'
              : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Transcript</span>
        </button>
      </div>
    </div>
  );
};
