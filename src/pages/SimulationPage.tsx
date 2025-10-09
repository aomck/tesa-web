import { useState, useEffect, useRef, useCallback } from 'react';
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
import { type Camera } from '../types/detection';

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
    camera_token: '3ce795ef-473f-44e9-9a76-57528df1438d',
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
  const [cameraInfo, setCameraInfo] = useState<Camera | null>(null);

  const intervalRef = useRef<number | null>(null);
  const imageIndexRef = useRef(0);
  const imagesRef = useRef<File[]>([]);
  const trackersRef = useRef<ObjectTracker[]>([]);

  // Set document title
  useEffect(() => {
    document.title = 'Tesa 2025 @ CRMA - Simulation';
  }, []);

  // Sync refs with state
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    trackersRef.current = trackers;
  }, [trackers]);

  useEffect(() => {
    // Initialize trackers when num_objects or camera location changes
    const newTrackers: ObjectTracker[] = [];
    for (let i = 0; i < config.num_objects; i++) {
      newTrackers.push(createTracker(i));
    }
    setTrackers(newTrackers);
  }, [config.num_objects, config.center_lat, config.center_lng, cameraInfo?.location]);

  const createTracker = (index: number): ObjectTracker => {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * 100; // meters
    const latOffset = (distance / 111320) * Math.cos(angle);
    const lngOffset = (distance / (111320 * Math.cos((config.center_lat * Math.PI) / 180))) * Math.sin(angle);

    // Determine objective based on camera location
    let objective = 'unknown';
    if (cameraInfo?.location === 'defence') {
      objective = 'unknown';
    } else if (cameraInfo?.location === 'offence') {
      objective = 'our';
    }

    return {
      obj_id: `obj_${String(index).padStart(3, '0')}`,
      type: 'drone',
      current_lat: config.center_lat + latOffset,
      current_lng: config.center_lng + lngOffset,
      objective: objective,
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

  const uploadDetection = useCallback(async () => {
    if (imagesRef.current.length === 0) {
      setStatus('error');
      setStatusMessage('กรุณาอัพโหลดรูปภาพก่อน');
      return;
    }

    try {
      const currentIndex = imageIndexRef.current % imagesRef.current.length;
      const currentImage = imagesRef.current[currentIndex];

      console.log('Uploading image:', currentIndex + 1, '/', imagesRef.current.length, '-', currentImage.name);
      console.log('Current imageIndexRef.current:', imageIndexRef.current);

      // Move all trackers
      const movedTrackers = trackersRef.current.map(moveTracker);
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

      console.log('Response status:', response.status);

      if (response.status === 200 || response.status === 201) {
        console.log('Upload successful, incrementing index from', imageIndexRef.current);
        imageIndexRef.current += 1;
        console.log('After increment, imageIndexRef.current:', imageIndexRef.current);

        // Update camera info from response if available
        if (response.data?.data?.camera) {
          setCameraInfo(response.data.data.camera);
        }

        setStatus('success');
        const nextIndex = imageIndexRef.current % imagesRef.current.length;
        setStatusMessage(`อัพโหลดสำเร็จ: ${currentImage.name} (${objects.length} วัตถุ) - รูปถัดไป: ${nextIndex + 1}/${imagesRef.current.length}`);
        setLastUploadTime(new Date());
      } else {
        console.log('Upload failed with status:', response.status);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setStatus('error');
      setStatusMessage(`เกิดข้อผิดพลาด: ${error.response?.data?.message || error.message}`);

      // Stop simulation if 401 Unauthorized error
      if (error.response?.status === 401) {
        handleStop();
        setStatusMessage('หยุดการจำลอง: Token ไม่ถูกต้องหรือหมดอายุ');
      }
    }
  }, [config.api_base_url, config.camera_id, config.camera_token]);

  const fetchCameraInfo = async () => {
    try {
      const response = await axios.get(
        `${config.api_base_url}/object-detection/info/${config.camera_id}`,
        {
          headers: {
            'x-camera-token': config.camera_token,
          },
        }
      );

      if (response.data.success && response.data.data) {
        const camera = response.data.data;
        setCameraInfo(camera);

        // Update center location based on camera location
        if (camera.location === 'defence') {
          setConfig((prev) => ({
            ...prev,
            center_lat: 14.297567,
            center_lng: 101.166279,
          }));
        } else if (camera.location === 'offence') {
          setConfig((prev) => ({
            ...prev,
            center_lat: 14.286451,
            center_lng: 101.171298,
          }));
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to fetch camera info:', error);
      setStatus('error');
      setStatusMessage('ไม่สามารถดึงข้อมูลกล้องได้ กรุณาตรวจสอบ Camera ID และ Token');
      return false;
    }
  };

  const handleStart = async () => {
    if (images.length === 0) {
      setStatus('error');
      setStatusMessage('กรุณาอัพโหลดรูปภาพก่อนเริ่มการจำลอง');
      return;
    }

    // Fetch camera info first to determine location
    setStatus(null);
    setStatusMessage('กำลังตรวจสอบข้อมูลกล้อง...');
    const success = await fetchCameraInfo();

    if (!success) {
      return;
    }

    console.log('Starting simulation, resetting index to 0');
    imageIndexRef.current = 0;
    setIsRunning(true);
    setStatus(null);

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
    setCameraInfo(null);
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

      {/* Team Banner */}
      {isRunning && cameraInfo && (
        <Box
          sx={{
            textAlign: 'center',
            mb: 3,
            py: 2,
            px: 3,
            bgcolor: cameraInfo.location === 'defence' ? '#1976d2' : '#d32f2f',
            color: 'white',
            borderRadius: 2,
            boxShadow: 2,
          }}
        >
          <Typography variant="h5" fontWeight="bold">
            Team: {cameraInfo.name || 'Unknown'} - {cameraInfo.location === 'defence' ? 'Defence' : 'Offence'}
          </Typography>
        </Box>
      )}

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
                cameraLocation={cameraInfo?.location}
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

            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                color={isRunning ? 'error' : 'success'}
                startIcon={<Icon icon={isRunning ? 'mdi:stop' : 'mdi:play'} />}
                onClick={isRunning ? handleStop : handleStart}
                disabled={!isRunning && images.length === 0}
                fullWidth
              >
                {isRunning ? 'หยุดการจำลอง' : 'เริ่มการจำลอง'}
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
