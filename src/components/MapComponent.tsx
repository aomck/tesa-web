import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Box, IconButton } from '@mui/material';
import { Icon } from '@iconify/react';
import { type DetectedObject } from '../types/detection';
import DetectionPopup from './DetectionPopup';
import 'mapbox-gl/dist/mapbox-gl.css';

// Load Iconify for dynamic icons
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://code.iconify.design/3/3.1.0/iconify.min.js';
  if (!document.querySelector('script[src*="iconify"]')) {
    document.head.appendChild(script);
  }
}

const LOCATIONS = {
  defence: { lng: 101.166279, lat: 14.297567 },
  offence: { lng: 101.171298, lat: 14.286451 },
};

interface MapComponentProps {
  objects: DetectedObject[];
  imagePath?: string;
  detections?: Array<{
    id: number;
    cam_id: string;
    timestamp: string;
    image_path: string;
    objects: DetectedObject[];
  }>;
  cameraLocation?: string;
}

const MapComponent = ({ objects, imagePath, detections, cameraLocation }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number } | null>(null);
  const selectedMarkerRef = useRef<HTMLDivElement | null>(null);

  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

  const getMapCenter = () => {
    if (cameraLocation === 'defence') return [LOCATIONS.defence.lng, LOCATIONS.defence.lat];
    if (cameraLocation === 'offence') return [LOCATIONS.offence.lng, LOCATIONS.offence.lat];
    return [101.166279, 14.297567]; // default
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: getMapCenter() as [number, number],
      zoom: 17,
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update map center when camera location changes
  useEffect(() => {
    if (map.current && cameraLocation) {
      map.current.flyTo({
        center: getMapCenter() as [number, number],
        zoom: 17,
        duration: 1000,
      });
    }
  }, [cameraLocation]);

  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    if (objects.length === 0) return;

    // Create markers for each object
    objects.forEach((obj) => {
      const color = getColorForObjectId(obj.obj_id);
      const iconName = getIconName(obj.type);

      const el = document.createElement('div');
      el.className = 'marker';
      el.style.cssText = `
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // Pulsating alert circle
      const pulseCircle = document.createElement('div');
      pulseCircle.className = 'pulse-circle';
      pulseCircle.style.cssText = `
        position: absolute;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${color};
        opacity: 0.4;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 2s ease-out infinite;
        pointer-events: none;
      `;

      // Icon container with Iconify
      const iconContainer = document.createElement('div');
      iconContainer.className = 'iconify-marker';
      iconContainer.style.cssText = `
        cursor: pointer;
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid ${color};
      `;

      // Create iconify element
      const iconElement = document.createElement('span');
      iconElement.className = 'iconify';
      iconElement.setAttribute('data-icon', iconName);
      iconElement.style.cssText = `
        color: ${color};
        font-size: 24px;
      `;

      iconContainer.appendChild(iconElement);
      el.appendChild(pulseCircle);
      el.appendChild(iconContainer);

      // Click - show card
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedObject(obj);
        selectedMarkerRef.current = el;
        const rect = el.getBoundingClientRect();
        setCardPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      });

      const lat = typeof obj.lat === 'number' ? obj.lat : parseFloat(obj.lat);
      const lng = typeof obj.lng === 'number' ? obj.lng : parseFloat(obj.lng);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Fit bounds to show all markers
    // if (objects.length > 0) {
    //   const bounds = new mapboxgl.LngLatBounds();
    //   objects.forEach((obj) => {
    //     const lat = typeof obj.lat === 'number' ? obj.lat : parseFloat(obj.lat);
    //     const lng = typeof obj.lng === 'number' ? obj.lng : parseFloat(obj.lng);
    //     bounds.extend([lng, lat]);
    //   });
    //   map.current.fitBounds(bounds, {
    //     padding: 50,
    //     maxZoom: 17,
    //   });
    // }
  }, [objects, imagePath]);

  const getIconName = (type: string): string => {
    const iconMap: Record<string, string> = {
      person: 'mdi:account',
      car: 'mdi:car',
      truck: 'mdi:truck',
      bike: 'mdi:bike',
      drone: 'healthicons:drone',
      default: 'mdi:map-marker',
    };
    return iconMap[type.toLowerCase()] || iconMap.default;
  };

  const getColorForObjectId = (objectId: string): string => {
    // Array of distinct colors
    const colors = [
      '#FF5722', // Deep Orange
      '#2196F3', // Blue
      '#4CAF50', // Green
      '#FFC107', // Amber
      '#9C27B0', // Purple
      '#00BCD4', // Cyan
      '#E91E63', // Pink
      '#FF9800', // Orange
      '#009688', // Teal
      '#F44336', // Red
      '#3F51B5', // Indigo
      '#8BC34A', // Light Green
      '#FFEB3B', // Yellow
      '#673AB7', // Deep Purple
      '#00E676', // Bright Green
    ];

    // Generate a hash from object_id
    let hash = 0;
    for (let i = 0; i < objectId.length; i++) {
      hash = objectId.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use hash to select color
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Get image path for selected object
  const selectedImagePath = imagePath;

  const handleClose = () => {
    setSelectedObject(null);
    setCardPosition(null);
    selectedMarkerRef.current = null;
  };

  // Update card position when map moves
  useEffect(() => {
    if (!map.current || !selectedMarkerRef.current) return;

    const updateCardPosition = () => {
      if (selectedMarkerRef.current) {
        const rect = selectedMarkerRef.current.getBoundingClientRect();
        setCardPosition({
          x: rect.left + rect.width / 2,
          y: rect.top,
        });
      }
    };

    map.current.on('move', updateCardPosition);
    map.current.on('zoom', updateCardPosition);

    return () => {
      map.current?.off('move', updateCardPosition);
      map.current?.off('zoom', updateCardPosition);
    };
  }, [selectedObject]);

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: translate(-50%, -50%) scale(0.5);
              opacity: 0.8;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.2);
              opacity: 0.4;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.8);
              opacity: 0;
            }
          }
        `}
      </style>
      <Box
        ref={mapContainer}
        sx={{
          height: '100%',
          width: '100%',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      />

      {/* Detection Popup */}
      {selectedObject && cardPosition && (
        <Box
          sx={{
            position: 'fixed',
            left: cardPosition.x,
            top: cardPosition.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 9999,
            mb: 1,
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
              },
            }}
          >
            <Icon icon="mdi:close" width={16} />
          </IconButton>

          <DetectionPopup object={selectedObject} imagePath={selectedImagePath} />
        </Box>
      )}
    </Box>
  );
};

export default MapComponent;
