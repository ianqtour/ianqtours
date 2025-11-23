import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const WebcamModal = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    startWebcam();
    return () => {
      stopWebcam();
    };
  }, []);

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast({
        title: "Acesso à câmera negado",
        description: "Por favor, permita o acesso à câmera para capturar sua foto.",
        variant: "destructive",
      });
    }
  };

  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageData);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopWebcam();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    stopWebcam();
    startWebcam();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-2xl w-full"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Capturar Foto</h2>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative aspect-[3/4] sm:aspect-video bg-black rounded-xl overflow-hidden mb-6">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Circular mask overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 sm:hidden" style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 80px, rgba(0,0,0,0.7) 81px)'
                  }}></div>
                  <div className="absolute inset-0 hidden sm:block" style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 128px, rgba(0,0,0,0.7) 129px)'
                  }}></div>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-64 sm:h-64 rounded-full border-3 sm:border-4 border-[#ECAE62]"></div>
                </div>
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-4">
            {!capturedImage ? (
              <Button
                onClick={capturePhoto}
                className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-white text-lg py-6"
              >
                <Camera className="mr-2 h-5 w-5" />
                Capturar Foto
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleRetake}
                  className="flex-1 bg-transparent border border-white/30 text-white hover:bg-white/10 text-base sm:text-lg py-4 sm:py-6"
                >
                  <span className="sm:hidden">Nova Foto</span>
                  <span className="hidden sm:inline">Tirar Novamente</span>
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1 bg-[#ECAE62] hover:bg-[#8C641C] text-[#0B1420] font-semibold text-base sm:text-lg py-4 sm:py-6"
                >
                  Confirmar
                </Button>
              </>
            )}
          </div>

          <p className="text-white/60 text-sm text-center mt-4">
            Posicione seu rosto dentro do círculo para a melhor foto
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WebcamModal;