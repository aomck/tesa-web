import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Slider,
  Button,
  Grid,
  Alert,
  Chip,
  ImageList,
  ImageListItem,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import MapPicker from '../components/MapPicker';
import axios from 'axios';

interface SimulationConfig {
  api_base_url: string;
  camera_id: string;
  camera_token: string;
  upload_interval: number;
  center_lat: number;
  center_lng: number;
  min_movement: number;
  max_movement: number;
  num_objects: number;
}

interface ObjectTracker {
  obj_id: string;
  type: string;
  current_lat: number;
  current_lng: number;
  objective: string;
  size: string;
}

const SimulationPage = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SimulationConfig>({
    api_base_url: import.meta.env.VITE_API_BASE_URL || 'https://tesa-api.crma.dev/api',
    camera_id: '550e8400-e29b-41d4-a716-446655440000',
    camera_token: 'ff13b10a-95bc-4337-9b12-fda59ccc725e',
    upload_interval: 3,
    center_lat: 14.297567,
    center_lng: 101.166279,
    min_movement: 8,
    max_movement: 10,
    num_objects: 3,
  });

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [trackers, setTrackers] = useState<ObjectTracker[]>([]);

  const intervalRef = useRef<number | null>(null);
  const imageIndexRef = useRef(0);

  useEffect(() => {
    // Initialize trackers when num_objects changes
    const newTrackers: ObjectTracker[] = [];
    for (let i = 0; i < config.num_objects; i++) {
      newTrackers.push(createTracker(i));
    }
    setTrackers(newTrackers);
  }, [config.num_objects, config.center_lat, config.center_lng]);

  const createTracker = (index: number): ObjectTracker => {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 100; // meters
    const latOffset = (distance / 111320) * Math.cos(angle);
    const lngOffset = (distance / (111320 * Math.cos((config.center_lat * Math.PI) / 180))) * Math.sin(angle);

    return {
      obj_id: `obj_${String(index).padStart(3, '0')}`,
      type: 'drone',
      current_lat: config.center_lat + latOffset,
      current_lng: config.center_lng + lngOffset,
      objective: ['surveillance', 'tracking', 'monitoring'][Math.floor(Math.random() * 3)],
      size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
    };
  };

  const moveTracker = (tracker: ObjectTracker): ObjectTracker => {
    const angle = Math.random() * 2 * Math.PI;
    const distance = config.min_movement + Math.random() * (config.max_movement - config.min_movement);
    const latOffset = (distance / 111320) * Math.cos(angle);
    const lngOffset = (distance / (111320 * Math.cos((tracker.current_lat * Math.PI) / 180))) * Math.sin(angle);

    return {
      ...tracker,
      current_lat: tracker.current_lat + latOffset,
      current_lng: tracker.current_lng + lngOffset,
    };
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages = Array.from(files);
    setImages(newImages);

    // Create previews
    const previews = newImages.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    // Revoke URL to free memory
    URL.revokeObjectURL(imagePreviews[index]);

    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const uploadDetection = async () => {
    if (images.length === 0) {
      setStatus('error');
      setStatusMessage('กรุณาอัพโหลดรูปภาพก่อน');
      return;
    }

    try {
      const currentImage = images[imageIndexRef.current % images.length];

      // Move all trackers
      const movedTrackers = trackers.map(moveTracker);
      setTrackers(movedTrackers);

      // Prepare objects data
      const objects = movedTrackers.map((tracker) => ({
        obj_id: tracker.obj_id,
        type: tracker.type,
        lat: parseFloat(tracker.current_lat.toFixed(6)),
        lng: parseFloat(tracker.current_lng.toFixed(6)),
        objective: tracker.objective,
        size: tracker.size,
      }));

      const formData = new FormData();
      formData.append('image', currentImage, currentImage.name);
      formData.append('objects', JSON.stringify(objects));

      // Add 7 hours for Thailand timezone (UTC+7)
      const thailandTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
      formData.append('timestamp', thailandTime.toISOString());

      const url = `${config.api_base_url}/object-detection/${config.camera_id}`;
      const response = await axios.post(url, formData, {
        headers: {
          'x-camera-token': config.camera_token,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        setStatus('success');
        setStatusMessage(`อัพโหลดสำเร็จ: ${currentImage.name} (${objects.length} วัตถุ)`);
        setLastUploadTime(new Date());
        imageIndexRef.current += 1;
      }
    } catch (error: any) {
      setStatus('error');
      setStatusMessage(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleStart = () => {
    if (images.length === 0) {
      setStatus('error');
      setStatusMessage('กรุณาอัพโหลดรูปภาพก่อนเริ่มการจำลอง');
      return;
    }

    setIsRunning(true);
    setStatus(null);
    imageIndexRef.current = 0;

    // First upload
    uploadDetection();
  };

  const handleStop = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatusMessage('หยุดการจำลอง');
  };

  // Update interval when upload_interval config changes and simulation is running
  useEffect(() => {
    if (isRunning) {
      // Clear existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Set new interval with updated config
      intervalRef.current = window.setInterval(() => {
        uploadDetection();
      }, config.upload_interval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, config.upload_interval]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Back Button */}
      <Box sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/')} sx={{ color: 'primary.main' }}>
          <Icon icon="mdi:arrow-left" width={28} />
        </IconButton>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          <Icon icon="mdi:play-circle" width={40} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          การจำลองการตรวจจับวัตถุ
        </Typography>
        <Typography variant="body1" color="text.secondary">
          จำลองการส่งข้อมูลการตรวจจับวัตถุไปยัง TESA Service
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              การตั้งค่า
            </Typography>

            {/* API Configuration */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                การเชื่อมต่อ API
              </Typography>
              <TextField
                fullWidth
                label="Camera ID"
                value={config.camera_id}
                onChange={(e) => setConfig({ ...config, camera_id: e.target.value })}
                sx={{ mb: 2 }}
                size="small"
              />
              <TextField
                fullWidth
                label="Camera Token"
                type="password"
                value={config.camera_token}
                onChange={(e) => setConfig({ ...config, camera_token: e.target.value })}
                size="small"
              />
            </Box>

            {/* Location Configuration */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                ตำแหน่งศูนย์กลาง
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Latitude"
                    type="number"
                    value={config.center_lat}
                    onChange={(e) => setConfig({ ...config, center_lat: parseFloat(e.target.value) })}
                    inputProps={{ step: 0.000001 }}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label="Longitude"
                    type="number"
                    value={config.center_lng}
                    onChange={(e) => setConfig({ ...config, center_lng: parseFloat(e.target.value) })}
                    inputProps={{ step: 0.000001 }}
                    size="small"
                  />
                </Grid>
              </Grid>
              <MapPicker
                lat={config.center_lat}
                lng={config.center_lng}
                onLocationChange={(lat, lng) => setConfig({ ...config, center_lat: lat, center_lng: lng })}
              />
            </Box>

            {/* Simulation Parameters */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                พารามิเตอร์การจำลอง
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  ช่วงเวลาการอัพโหลด (วินาที): {config.upload_interval}
                </Typography>
                <Slider
                  value={config.upload_interval}
                  onChange={(_, value) => setConfig({ ...config, upload_interval: value as number })}
                  min={1}
                  max={60}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 30, label: '30' },
                    { value: 60, label: '60' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  การเคลื่อนที่ขั้นต่ำ (เมตร): {config.min_movement}
                </Typography>
                <Slider
                  value={config.min_movement}
                  onChange={(_, value) => setConfig({ ...config, min_movement: value as number })}
                  min={1}
                  max={100}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  การเคลื่อนที่สูงสุด (เมตร): {config.max_movement}
                </Typography>
                <Slider
                  value={config.max_movement}
                  onChange={(_, value) => setConfig({ ...config, max_movement: value as number })}
                  min={1}
                  max={100}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box>
                <Typography variant="body2" gutterBottom>
                  จำนวนวัตถุ: {config.num_objects}
                </Typography>
                <Slider
                  value={config.num_objects}
                  onChange={(_, value) => setConfig({ ...config, num_objects: value as number })}
                  min={1}
                  max={20}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 10, label: '10' },
                    { value: 20, label: '20' },
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Image Upload & Control Panel */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              อัพโหลดรูปภาพ
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<Icon icon="mdi:cloud-upload" />}
                fullWidth
                disabled={isRunning}
              >
                เลือกรูปภาพ (หลายไฟล์)
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
            </Box>

            {images.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  รูปภาพที่เลือก: {images.length} ไฟล์
                </Typography>
                <ImageList cols={3} gap={8} sx={{ maxHeight: 400 }}>
                  {imagePreviews.map((preview, index) => (
                    <ImageListItem key={index}>
                      <Box sx={{ position: 'relative' }}>
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: '100%',
                            height: 120,
                            objectFit: 'cover',
                            borderRadius: 4,
                          }}
                        />
                        {!isRunning && (
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                            }}
                            onClick={() => removeImage(index)}
                          >
                            <Icon icon="mdi:close" width={16} />
                          </IconButton>
                        )}
                      </Box>
                    </ImageListItem>
                  ))}
                </ImageList>
              </Box>
            )}
          </Paper>

          {/* Control Panel */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              การควบคุม
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<Icon icon="mdi:play" />}
                onClick={handleStart}
                disabled={isRunning || images.length === 0}
                fullWidth
              >
                เริ่มการจำลอง
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Icon icon="mdi:stop" />}
                onClick={handleStop}
                disabled={!isRunning}
                fullWidth
              >
                หยุดการจำลอง
              </Button>
            </Box>

            {/* Status */}
            <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    สถานะ:
                  </Typography>
                  <Chip
                    label={isRunning ? 'กำลังทำงาน' : 'หยุด'}
                    color={isRunning ? 'success' : 'default'}
                    size="small"
                    icon={<Icon icon={isRunning ? 'mdi:play-circle' : 'mdi:stop-circle'} />}
                  />
                </Box>

                {statusMessage && status && (
                  <Alert severity={status} sx={{ mb: 2 }}>
                    {statusMessage}
                  </Alert>
                )}

                {statusMessage && !status && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {statusMessage}
                  </Alert>
                )}

                {lastUploadTime && (
                  <Typography variant="body2" color="text.secondary">
                    <Icon icon="mdi:clock-outline" width={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    ส่งล่าสุด: {lastUploadTime.toLocaleString('th-TH')}
                  </Typography>
                )}

                {isRunning && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <Icon icon="mdi:image" width={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    รูปปัจจุบัน: {(imageIndexRef.current % images.length) + 1} / {images.length}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SimulationPage;
