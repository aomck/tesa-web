import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { type DetectionEvent } from '../types/detection';

export const useSocket = (camId: string, enabled: boolean) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realtimeData, setRealtimeData] = useState<DetectionEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !camId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(import.meta.env.VITE_SOCKET_URL);

    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);

      // Subscribe to camera
      socketInstance.emit('subscribe_camera', { cam_id: camId });
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setIsConnected(false);
    });

    socketInstance.on('object_detection', (data: any) => {
      console.log('Received object detection:', data);
      setRealtimeData({
        id: Date.now(),
        cam_id: data.cam_id,
        camera: data.camera,
        timestamp: data.timestamp,
        image_path: data.image.path,
        objects: data.objects,
      });
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.emit('unsubscribe_camera', { cam_id: camId });
        socketInstance.disconnect();
      }
    };
  }, [camId, enabled]);

  return { socket, realtimeData, isConnected };
};
