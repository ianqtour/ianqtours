import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Bot, User, Play, Pause, Volume2, Trash2, Sparkles, MessageSquare, Shield, Zap, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Avatar from '@radix-ui/react-avatar';

const WEBHOOK_URL = 'https://n8n-n8n.j6kpgx.easypanel.host/webhook/agente';
const STORAGE_KEY = 'ianqtours_chat_history';

const AudioPlayer = ({ src, isUser }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current.duration === Infinity) {
      audioRef.current.currentTime = 1e101;
      audioRef.current.ontimeupdate = () => {
        audioRef.current.ontimeupdate = onTimeUpdate;
        setDuration(audioRef.current.duration);
        audioRef.current.currentTime = 0;
      };
    } else {
      setDuration(audioRef.current.duration);
    }
  };

  const onTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 py-2 min-w-[220px]">
      <audio 
        ref={audioRef} 
        src={src} 
        onLoadedMetadata={onLoadedMetadata} 
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        className="hidden"
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlay}
        className={cn(
          "w-10 h-10 rounded-full shrink-0 backdrop-blur-md transition-all duration-300",
          isUser 
            ? "bg-white/20 text-white hover:bg-white/30" 
            : "bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30"
        )}
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
      </Button>
      
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
          <motion.div 
            className={cn("h-full absolute left-0 top-0 rounded-full", isUser ? "bg-white" : "bg-[#25D366]")}
            initial={{ width: 0 }}
            animate={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono opacity-70 tracking-tight">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <Volume2 size={16} className="opacity-50" />
    </div>
  );
};

const ChatAgente = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const clearSession = () => {
    if (window.confirm('Deseja limpar todo o histórico do chat?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSend = async (content, type = 'text', audioBlob = null) => {
    if (!content && type === 'text') return;

    const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;

    const newMessage = {
      id: Date.now(),
      type,
      content: type === 'text' ? content : 'Áudio enviado',
      audioUrl,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const payload = {
        type,
        timestamp: new Date().toISOString(),
        [type === 'text' ? 'chatInput' : 'base64']: content
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        let botText = '';
        
        if (Array.isArray(data)) {
          const firstItem = data[0];
          botText = firstItem.output || firstItem.response || firstItem.text || firstItem.message || (typeof firstItem === 'string' ? firstItem : '');
        } else {
          botText = data.output || data.response || data.text || data.message || (typeof data === 'string' ? data : '');
        }
        
        if (botText && botText !== 'Workflow was started') {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: 'text',
            content: botText,
            sender: 'bot',
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
        
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          handleSend(base64Audio, 'audio', audioBlob);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const formatMessage = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={i} className="font-bold text-white">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-50 overflow-hidden font-sans relative">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#25D366]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[35%] h-[35%] bg-blue-500/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.02]" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', 
               backgroundSize: '32px 32px' 
             }} 
        />
      </div>

      {/* Header */}
      <header className="relative z-30 bg-slate-950/50 backdrop-blur-xl border-b border-white/5 p-4 sm:px-6 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/admin')}
            className="h-10 w-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </Button>
          <Avatar.Root className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-2xl ring-0 border border-white/5">
            <Avatar.Image 
              src="https://ujowugielrmzvmwqenhb.supabase.co/storage/v1/object/public/excursoes/logo-ianq.png" 
              className="aspect-square h-full w-full object-cover"
            />
            <Avatar.Fallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#25D366] to-[#1DA851] text-slate-950 font-bold">
              IQ
            </Avatar.Fallback>
          </Avatar.Root>
          
          <div className="flex flex-col">
            <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
              Agente IanqTour
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]"></span>
              </span>
              Sincronizado
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearSession}
            className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-95"
          >
            <Trash2 size={20} />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 z-10 custom-scrollbar relative"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-6"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#25D366] to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                <Bot size={40} className="text-slate-950" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">O que vamos descobrir hoje?</h2>
                <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                  Sou seu assistente inteligente. Pergunte sobre excursões, parcelas ou novas aventuras.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm px-4">
                {[
                  { icon: Zap, text: 'Parcelas em atraso' },
                  { icon: MessageSquare, text: 'Próximas viagens' },
                  { icon: Shield, text: 'Pagamento por tipo' },
                  { icon: Sparkles, text: 'Aniversariantes' }
                ].map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(item.text)}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium text-left"
                  >
                    <item.icon size={16} className="text-[#25D366]" />
                    {item.text}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className={cn("flex flex-col gap-2", msg.sender === 'user' ? 'items-end' : 'items-start')}
            >
              <div className={cn(
                "group relative max-w-[85%] sm:max-w-[75%] px-5 py-4 shadow-2xl",
                msg.sender === 'user' 
                  ? "bg-gradient-to-br from-[#25D366] to-[#1DA851] text-slate-950 rounded-[2rem] rounded-tr-none font-medium" 
                  : "bg-slate-900/80 backdrop-blur-md border border-white/10 text-slate-100 rounded-[2rem] rounded-tl-none"
              )}>
                {msg.type === 'audio' ? (
                  <AudioPlayer src={msg.audioUrl} isUser={msg.sender === 'user'} />
                ) : (
                  <p className="text-[15px] sm:text-base leading-relaxed whitespace-pre-wrap tracking-tight">
                    {formatMessage(msg.content)}
                  </p>
                )}
                
                <div className={cn(
                  "flex items-center gap-1.5 mt-2 opacity-40 text-[10px] font-mono tracking-widest uppercase",
                  msg.sender === 'user' ? "justify-end text-slate-900" : "justify-start text-white"
                )}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.sender === 'user' && (
                    <svg width="14" height="14" viewBox="0 0 16 11" fill="none">
                      <path d="M11.0001 1L5.50006 6.5L2.50006 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15.0001 1L9.50006 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                <Bot size={20} className="text-[#25D366]" />
              </div>
              <div className="px-6 py-4 rounded-3xl bg-white/5 border border-white/10 flex gap-2 items-center backdrop-blur-md">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-30 p-4 sm:p-6 bg-slate-950/50 backdrop-blur-2xl border-t border-white/5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#25D366] to-emerald-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
            <div className="relative flex items-center bg-slate-900 border border-white/10 rounded-2xl overflow-hidden min-h-[52px]">
              {isRecording ? (
                <div className="flex-1 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                    />
                    <span className="text-sm font-bold tracking-tight text-white/80 uppercase">Gravando áudio...</span>
                  </div>
                  <div className="flex gap-1.5 h-8 items-center">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <motion.div 
                        key={i}
                        animate={{ height: [4, 16, 4] }} 
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                        className="w-1 bg-[#25D366] rounded-full"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                  placeholder="Digite sua mensagem"
                  className="bg-transparent border-none text-white placeholder:text-white/30 h-12 px-6 text-base focus-visible:ring-0 focus-visible:ring-offset-0 font-medium"
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {inputValue.trim() || isRecording ? (
                <motion.div key="send" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 45 }}>
                  <Button 
                    onClick={() => isRecording ? stopRecording() : handleSend(inputValue)}
                    className={cn(
                      "w-12 h-12 rounded-2xl shadow-2xl transition-all active:scale-90 flex items-center justify-center p-0",
                      isRecording 
                        ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" 
                        : "bg-[#25D366] hover:bg-[#1DA851] text-slate-950 shadow-emerald-500/20"
                    )}
                  >
                    {isRecording ? <Square size={24} fill="currentColor" /> : <Send size={24} />}
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Button 
                    onClick={startRecording}
                    variant="ghost"
                    className="w-12 h-12 rounded-2xl text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/10 transition-all active:scale-90"
                  >
                    <Mic size={24} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(37, 211, 102, 0.2); }
      `}</style>
    </div>
  );
};

export default ChatAgente;
