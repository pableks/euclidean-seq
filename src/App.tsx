import React, { useState, useEffect, useCallback, useRef } from 'react';

interface TrackSettings {
  steps: number;
  pulses: number;
  gain: number;
  frequency: number;
  pan: number;
  waveform: OscillatorType;
  pattern: boolean[];
  scheduleNote: (time: number, duration: number) => void;
  patternLength: number; // Add this line
}

interface TrackProps {
  trackId: number;
  audioContext: AudioContext;
  masterGainNode: GainNode;
  onSettingsChange: (trackId: number, settings: TrackSettings) => void;
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  
}

const NOTE_DURATION = 0.2;

const Track: React.FC<TrackProps> = ({ 
  trackId, 
  audioContext, 
  masterGainNode, 
  onSettingsChange, 
  
  currentStep,
  
}) => {
  const [steps, setSteps] = useState(16);
  const [pulses, setPulses] = useState(4);
  const [rotations, setRotations] = useState(0);
  const [gain, setGain] = useState(0.5);
  const [frequency, setFrequency] = useState(440);
  const [pan, setPan] = useState(0);
  const [waveform, setWaveform] = useState<OscillatorType>('sine');
  const [pattern, setPattern] = useState<boolean[]>([]);

  const gainNodeRef = useRef<GainNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);

  const generatePattern = useCallback((steps: number, pulses: number, rotations: number) => {
    if (pulses === 0) return new Array(steps).fill(false);
    let pattern = new Array(steps).fill(false);
    const increment = steps / pulses;
    let index = 0;
    for (let i = 0; i < pulses; i++) {
      pattern[Math.floor(index) % steps] = true;
      index += increment;
    }
    pattern = [...pattern.slice(rotations), ...pattern.slice(0, rotations)];
    return pattern;
  }, []);

  useEffect(() => {
    const newPattern = generatePattern(steps, Math.min(pulses, steps), rotations);
    setPattern(newPattern);
    onSettingsChange(trackId, {
      steps,
      pulses: Math.min(pulses, steps),
      gain,
      frequency,
      pan,
      waveform,
      pattern: newPattern,
      scheduleNote,
      patternLength: steps
    });
  }, [steps, pulses, rotations, gain, frequency, pan, waveform, generatePattern, onSettingsChange, trackId]);

  useEffect(() => {
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContext.createGain();
      pannerNodeRef.current = audioContext.createStereoPanner();
      gainNodeRef.current.connect(pannerNodeRef.current);
      pannerNodeRef.current.connect(masterGainNode);
    }
    gainNodeRef.current.gain.setValueAtTime(gain, audioContext.currentTime);
    if (pannerNodeRef.current) {
      pannerNodeRef.current.pan.setValueAtTime(pan, audioContext.currentTime);
    }
  }, [audioContext, masterGainNode, gain, pan]);

  const scheduleNote = useCallback((time: number, duration: number) => {
    const oscillator = audioContext.createOscillator();
    const noteGainNode = audioContext.createGain();

    oscillator.connect(noteGainNode);
    noteGainNode.connect(gainNodeRef.current!);

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, time);
    noteGainNode.gain.setValueAtTime(0, time);
    noteGainNode.gain.linearRampToValueAtTime(1, time + 0.005);
    noteGainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    oscillator.start(time);
    oscillator.stop(time + duration);
  }, [audioContext, frequency, waveform]);


  const renderCircularPattern = () => {
    const radius = 50;
    const centerX = 60;
    const centerY = 60;
  
    return (
      <div className="flex items-center justify-center">
        <svg width="300" height="300" viewBox="0 0 120 120">
          {pattern.map((active, index) => {
            const angle = (index / steps) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            const isCurrentStep = index === Math.floor(currentStep / 32 * steps) % steps;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={4}
                fill={isCurrentStep ? '#FFFFFF' : (active ? '#4CAF50' : '#757575')}
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="mb-4 p-4 bg-neutral-950 rounded-lg text-white">
      <h3 className="text-xl font-bold mb-2">Track {trackId}</h3>
      <div className="mt-4 flex justify-center">
        {renderCircularPattern()}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block">
          Steps:
          <input
            type="range"
            min="1"
            max="32"
            value={steps}
            onChange={(e) => setSteps(parseInt(e.target.value))}
            className="ml-2 w-full"
          />
          <span>{steps}</span>
        </label>
        <label className="block">
  Pulses:
  <input
    type="range"
    min="0"
    max={steps}
    value={Math.min(pulses, steps)}
    onChange={(e) => setPulses(Math.min(parseInt(e.target.value), steps))}
    className="ml-2 w-full"
  />
  <span>{Math.min(pulses, steps)}</span>
</label>
        <label className="block">
          Rotations:
          <input
            type="range"
            min="0"
            max={steps - 1}
            value={rotations}
            onChange={(e) => setRotations(parseInt(e.target.value))}
            className="ml-2 w-full"
          />
          <span>{rotations}</span>
        </label>
        <label className="block">
          Pan:
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={pan}
            onChange={(e) => setPan(parseFloat(e.target.value))}
            className="ml-2 w-full"
          />
          <span>{pan.toFixed(1)}</span>
        </label>
        <label className="block">
          Volume:
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={gain}
            onChange={(e) => setGain(parseFloat(e.target.value))}
            className="ml-2 w-full"
          />
          <span>{(Math.log10(gain) * 20).toFixed(1)} dB</span>
        </label>
        <label className="block">
          Pitch:
          <input
            type="range"
            min="55"
            max="1760"
            value={frequency}
            onChange={(e) => setFrequency(parseInt(e.target.value))}
            className="ml-2 w-full"
          />
          <span>{frequency} Hz</span>
        </label>
        <label className="block">
          Waveform:
          <select
            value={waveform}
            onChange={(e) => setWaveform(e.target.value as OscillatorType)}
            className="ml-2 bg-gray-700 rounded"
          >
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
        </label>
      </div>
     
    </div>
  );
};

const EuclideanSequencer: React.FC = () => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [masterGain, setMasterGain] = useState(0.7);
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(currentStep);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const tracksRef = useRef<Record<number, TrackSettings>>({});

  const lastPausedTimeRef = useRef(0);
  const lastPlayedStepRef = useRef<Record<number, number>>({});

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainNodeRef.current = audioContextRef.current.createGain();
      masterGainNodeRef.current.connect(audioContextRef.current.destination);
    }
    if (masterGainNodeRef.current) {
      masterGainNodeRef.current.gain.setValueAtTime(masterGain, audioContextRef.current.currentTime);
    }
  }, [masterGain]);

  const handleSettingsChange = useCallback((trackId: number, settings: TrackSettings) => {
    tracksRef.current[trackId] = settings;
  }, []);
  const scheduler = useCallback(() => {
    const currentTime = audioContextRef.current!.currentTime;
    const secondsPerBeat = 60.0 / bpm;
    const secondsPer16th = secondsPerBeat / 4;
  
    while (nextNoteTimeRef.current < currentTime + 0.1) {
      Object.entries(tracksRef.current).forEach(([trackIdStr, track]) => {
        const trackId = parseInt(trackIdStr, 10);
        const trackStep = Math.floor(currentStepRef.current / 32 * track.steps) % track.steps;
        
        // Check if this step is active and hasn't been played in this cycle
        if (track.pattern[trackStep] && lastPlayedStepRef.current[trackId] !== trackStep) {
          track.scheduleNote(nextNoteTimeRef.current, NOTE_DURATION);
          lastPlayedStepRef.current[trackId] = trackStep;
        }
      });
  
      nextNoteTimeRef.current += secondsPer16th;
      currentStepRef.current = (currentStepRef.current + 1) % 32;
      setCurrentStep(currentStepRef.current);
    }
  
    schedulerRef.current = requestAnimationFrame(scheduler);
  }, [bpm]);

  const startSequencer = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    const currentTime = audioContextRef.current!.currentTime;
    
    if (!isPlaying) {
      if (isPaused) {
        // Remove the declaration of the 'elapsedTime' variable
        // const elapsedTime = currentTime - lastPausedTimeRef.current;
        nextNoteTimeRef.current = currentTime + (nextNoteTimeRef.current - lastPausedTimeRef.current);
      } else {
        nextNoteTimeRef.current = currentTime;
        currentStepRef.current = 0;
        lastPlayedStepRef.current = {}; // Reset last played steps
      }
    }
  
    scheduler();
    setIsPlaying(true);
    setIsPaused(false);
  }, [scheduler, isPlaying, isPaused]);
  
  const stopSequencer = () => {
    if (schedulerRef.current !== null) {
      cancelAnimationFrame(schedulerRef.current);
    }
    setIsPlaying(false);
    setIsPaused(false);
    currentStepRef.current = 0;
    nextNoteTimeRef.current = 0;
    lastPausedTimeRef.current = 0;
    lastPlayedStepRef.current = {}; // Reset last played steps
    setCurrentStep(0);
  };

  const pauseSequencer = () => {
    if (schedulerRef.current !== null) {
      cancelAnimationFrame(schedulerRef.current);
    }
    setIsPlaying(false);
    setIsPaused(true);
    lastPausedTimeRef.current = audioContextRef.current!.currentTime;
  };

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
    if (isPlaying) {
      const currentTime = audioContextRef.current!.currentTime;
      const newSecondsPerBeat = 60.0 / newBpm;
      const newSecondsPer16th = newSecondsPerBeat / 4;

      nextNoteTimeRef.current = currentTime + newSecondsPer16th;

      if (schedulerRef.current !== null) {
        cancelAnimationFrame(schedulerRef.current);
      }
      scheduler();
    }
  };

  return (
    <div className="p-4 bg-neutral-950 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-white">Euclidean Sequencer</h2>
      <h6 className=" font-bold mb-2  text-white">by try.pabl0</h6>
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-white block">
          BPM:
          <input
            type="number"
            value={bpm}
            onChange={(e) => handleBpmChange(Math.max(1, parseInt(e.target.value) || 1))}
            className="ml-2 p-1 border rounded w-20 text-black"
          />
        </label>
        <label className="block text-white">
          Master Gain:
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterGain}
            onChange={(e) => setMasterGain(parseFloat(e.target.value))}
            className="ml-2 w-full"
          />
        </label>
      </div>
      <div className="mb-4 flex space-x-2">
        <button
          onClick={startSequencer}
          className={`px-4 py-2 text-white rounded transition-colors ${
            isPlaying ? 'bg-purple-500 hover:bg-purple-600' : 'bg-purple-500 hover:bg-purple-600'
          }`}
        >
          {isPlaying ? 'Resume' : 'Start'}
        </button>
        <button
          onClick={pauseSequencer}
          disabled={!isPlaying}
          className={`px-4 py-2 text-white rounded transition-colors ${
            isPlaying
              ? 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Pause
        </button>
        <button
          onClick={stopSequencer}
          disabled={!isPlaying && !isPaused}
          className={`px-4 py-2 text-white rounded transition-colors ${
            isPlaying || isPaused
              ? 'bg-purple-500 hover:bg-purple-600'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Stop
        </button>
      </div>
      {audioContextRef.current && masterGainNodeRef.current && (
        <>
          <Track
          trackId={1}
          audioContext={audioContextRef.current}
          masterGainNode={masterGainNodeRef.current}
          onSettingsChange={handleSettingsChange}
          isPlaying={isPlaying}
          currentStep={currentStep}
          bpm={bpm}
        />
        <Track
          trackId={2}
          audioContext={audioContextRef.current}
          masterGainNode={masterGainNodeRef.current}
          onSettingsChange={handleSettingsChange}
          isPlaying={isPlaying}
          currentStep={currentStep}
          bpm={bpm}
        />
           <Track
          trackId={3}
          audioContext={audioContextRef.current}
          masterGainNode={masterGainNodeRef.current}
          onSettingsChange={handleSettingsChange}
          isPlaying={isPlaying}
          currentStep={currentStep}
          bpm={bpm}
        />
        </>
      )}
    </div>
  );
};


export default EuclideanSequencer;