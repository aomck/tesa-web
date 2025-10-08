import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { type DetectedObject } from '../types/detection';
import ImageViewer from './ImageViewer';

interface DetectionPopupProps {
  object: DetectedObject;
  imagePath?: string;
}

const DetectionPopup = ({ object, imagePath }: DetectionPopupProps) => {
  const imageUrl = imagePath
    ? `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${imagePath}`
    : null;

  const getObjectIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      person: 'mdi:account',
      vehicle: 'mdi:car',
      car: 'mdi:car',
      truck: 'mdi:truck',
      bicycle: 'mdi:bike',
      bike: 'mdi:bike',
      motorcycle: 'mdi:motorbike',
      drone: 'mdi:drone',
      default: 'mdi:map-marker',
    };
    return iconMap[type.toLowerCase()] || iconMap.default;
  };

  return (
    <Card sx={{ minWidth: 280 }}>
      {imageUrl && (
        <ImageViewer
          src={imageUrl}
          alt="Detection"
          width="100%"
          height={150}
          objectFit="cover"
        />
      )}

      <CardContent sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {/* Object ID */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon icon={getObjectIcon(object.type)} width={20} />
            <Typography variant="subtitle2" fontWeight="bold">
              {object.obj_id}
            </Typography>
          </Stack>

          {/* Type and Size */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon icon="mdi:tag" width={18} />
            <Typography variant="body2" color="text.secondary">
              {object.type} • {object.size}
            </Typography>
          </Stack>

          {/* Objective */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon icon="mdi:target" width={18} />
            <Typography variant="body2" color="text.secondary">
              {object.objective}
            </Typography>
          </Stack>

          {/* Location */}
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Icon icon="mdi:map-marker" width={18} style={{ marginTop: 2 }} />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Lat: {typeof object.lat === 'number' ? object.lat.toFixed(6) : object.lat}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Lng: {typeof object.lng === 'number' ? object.lng.toFixed(6) : object.lng}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DetectionPopup;
