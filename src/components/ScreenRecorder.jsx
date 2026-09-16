import React, { useState, useRef, useEffect } from 'react';
import { Monitor, Mic, Camera, Volume2, Play, Pause, Square, Download, RefreshCw, AlertCircle, Video } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function ScreenRecorder({ dict }) {
  const MODES = [
    { id: 'screen', label: dict.screen, icon: Monitor, desc: dict.screen_desc },
    { id: 'screen_mic', label: dict.screen_mic, icon: Mic, desc: dict.screen_mic_desc },
    { id: 'webcam', label: dict.webcam, icon: Camera, desc: dict.webcam_desc },
    { id: 'audio_only', label: dict.audio_only, icon: Volume2, desc: dict.audio_only_desc },
  ];

  const [mode, setMode] = useState('screen');
  const [status, setStatus] = useState('idle'); // idle, recording, paused, preview, error
  const [errorMsg, setErrorMsg] = useState('');
  const [timeMs, setTimeMs] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const playbackRef = useRef(null);

  // Stop all tracks in a stream
  const stopStream = (stream) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const getMediaStream = async (selectedMode) => {
    try {
      let stream;
      if (selectedMode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else if (selectedMode === 'screen_mic') {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }).catch(() => null);
        if (!displayStream) throw new Error("Screen sharing cancelled");

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null);
        
        if (micStream) {
          const audioContext = new AudioContext();
          const dest = audioContext.createMediaStreamDestination();
          
          if (displayStream.getAudioTracks().length > 0) {
            const displaySource = audioContext.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]]));
            displaySource.connect(dest);
          }
          
          const micSource = audioContext.createMediaStreamSource(micStream);
          micSource.connect(dest);
          
          const tracks = [
            ...displayStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ];
          stream = new MediaStream(tracks);
          
          // Cleanup audio context when stream ends
          stream.getVideoTracks()[0].onended = () => {
            audioContext.close();
          };
        } else {
          stream = displayStream; // Fallback if mic fails
        }
      } else if (selectedMode === 'webcam') {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } else if (selectedMode === 'audio_only') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      return stream;
    } catch (err) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.message.includes('cancelled')) {
        throw new Error('Permission denied or request cancelled.');
      }
      throw new Error('Failed to get media devices. Ensure you have granted permissions.');
    }
  };

  const startRecording = async () => {
    setErrorMsg('');
    try {
      const stream = await getMediaStream(mode);
      streamRef.current = stream;

      // Handle user stopping stream via browser native UI
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (status === 'recording' || status === 'paused') {
            stopRecording();
          }
        };
      }

      // Show live preview
      if (videoPreviewRef.current && mode !== 'audio_only') {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true; // Avoid feedback loop
        videoPreviewRef.current.play();
      }

      const options = { mimeType: getSupportedMimeType(mode === 'audio_only') };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: options.mimeType || (mode === 'audio_only' ? 'audio/webm' : 'video/webm') });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setStatus('preview');
        stopStream(streamRef.current);
        clearInterval(timerRef.current);
      };

      mediaRecorder.start(1000); // 1 second chunks
      setStatus('recording');
      setTimeMs(0);
      
      timerRef.current = setInterval(() => {
        setTimeMs((prev) => prev + 1000);
      }, 1000);

    } catch (err) {
      setErrorMsg(err.message);
      setStatus('idle');
    }
  };

  const getSupportedMimeType = (isAudioOnly) => {
    if (isAudioOnly) {
      const types = ['audio/webm', 'audio/ogg', 'audio/mp4'];
      return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    }
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
      timerRef.current = setInterval(() => {
        setTimeMs((prev) => prev + 1000);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
    }
  };

  const recordAgain = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setStatus('idle');
    setTimeMs(0);
    setErrorMsg('');
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      stopStream(streamRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
      
      {/* Configuration / Idle State */}
      {status === 'idle' && (
        <div className="space-y-8 animate-in fade-in zoom-in duration-300">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">{dict.choose}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MODES.map((m) => {
                const Icon = m.icon;
                const isSelected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
                      isSelected 
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-900/30 ring-1 ring-rose-500" 
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", isSelected ? "bg-rose-100 dark:bg-rose-500 text-rose-600 dark:text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300")}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">{m.label}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{m.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-4 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl border border-red-100 dark:border-red-900/50">
              <AlertCircle size={20} />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={startRecording}
              aria-label="Start Recording"
              className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-8 rounded-full text-lg shadow-sm transition-all hover:shadow-md flex items-center gap-2"
            >
              <div aria-hidden="true" className="w-3 h-3 rounded-full bg-white"></div>
              {dict.start}
            </button>
          </div>
        </div>
      )}

      {/* Active Recording State */}
      {(status === 'recording' || status === 'paused') && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
            <div className="flex items-center gap-4">
              <div className={cn("w-4 h-4 rounded-full", status === 'recording' ? "bg-rose-500 animate-pulse" : "bg-amber-500")}></div>
              <span className="font-mono text-2xl font-semibold text-slate-800 dark:text-white">
                {formatTime(timeMs)}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {status === 'recording' ? dict.recording : dict.paused}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {status === 'recording' ? (
                <button aria-label="Pause Recording" onClick={pauseRecording} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Pause aria-hidden="true" size={18} /> <span className="hidden sm:inline">{dict.pause}</span>
                </button>
              ) : (
                <button aria-label="Resume Recording" onClick={resumeRecording} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Play aria-hidden="true" size={18} /> <span className="hidden sm:inline">{dict.resume}</span>
                </button>
              )}
              
              <button aria-label="Stop Recording" onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-rose-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-rose-700 transition-colors">
                <Square aria-hidden="true" size={18} /> {dict.stop}
              </button>
            </div>
          </div>

          {/* Live Preview */}
          {mode !== 'audio_only' && (
            <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
              <video 
                ref={videoPreviewRef} 
                aria-label="Live Recording Preview"
                className="max-w-full max-h-full object-contain"
                autoPlay 
                muted 
                playsInline
              />
              <div className="absolute top-4 left-4 bg-black/50 text-white/90 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-2">
                <Video aria-hidden="true" size={14} /> {dict.preview}
              </div>
            </div>
          )}
          {mode === 'audio_only' && (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <Volume2 size={48} className="text-rose-400 mb-4 animate-pulse" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">{dict.audio}</p>
            </div>
          )}
        </div>
      )}

      {/* Preview & Download State */}
      {status === 'preview' && recordedUrl && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-xl overflow-hidden bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700">
            {mode === 'audio_only' ? (
              <div className="p-8 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <audio aria-label="Recorded Audio Playback" ref={playbackRef} src={recordedUrl} controls className="w-full max-w-md" />
              </div>
            ) : (
              <video 
                ref={playbackRef} 
                aria-label="Recorded Video Playback"
                src={recordedUrl} 
                controls 
                className="w-full aspect-video object-contain"
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-white">{dict.duration}</span> {formatTime(timeMs)}
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={recordAgain}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
              >
                <RefreshCw size={18} /> {dict.again}
              </button>
              <a 
                href={recordedUrl}
                download={`recording_${new Date().getTime()}.${mode === 'audio_only' ? 'webm' : 'webm'}`}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                <Download size={18} /> {dict.download}
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
