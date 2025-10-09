import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  TextField,
  Button,
  Paper,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import MapComponent from '../components/MapComponent';
import DetectionCard from '../components/DetectionCard';
import ImageViewer from '../components/ImageViewer';
import { useDetections } from '../hooks/useDetections';
import { useSocket } from '../hooks/useSocket';
import { type DetectionEvent, type DetectedObject, type Camera } from '../types/detection';
import { formatThaiDateTime } from '../utils/dateFormat';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [cameraId, setCameraId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [token, setToken] = useState('3ce795ef-473f-44e9-9a76-57528df1438d');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filterExpanded, setFilterExpanded] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch initial data
  const { data, isLoading, error, refetch } = useDetections(
    cameraId,
    token,
    isConnecting
  );

  // Socket connection for real-time updates (only after fully connected)
  const { realtimeData, isConnected: socketConnected } = useSocket(
    cameraId,
    isConnected
  );

  // Merge real-time data with fetched data
  const [allDetections, setAllDetections] = useState<DetectionEvent[]>([]);
  const [cameraInfo, setCameraInfo] = useState<Camera | null>(null);

  const fetchCameraInfo = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/object-detection/info/${cameraId}`,
        {
          headers: {
            'x-camera-token': token,
          },
        }
      );

      if (response.data.success && response.data.data) {
        setCameraInfo(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch camera info:', error);
    }
  };

  useEffect(() => {
    if (data?.data && isConnecting) {
      // Data loaded successfully, mark as fully connected
      setAllDetections(data.data);
      setIsConnecting(false);
      setIsConnected(true);

      // Fetch camera info separately
      fetchCameraInfo();
    }
  }, [data, isConnecting]);

  useEffect(() => {
    if (realtimeData) {
      setAllDetections((prev) => [realtimeData, ...prev]);
    }
  }, [realtimeData]);

  // Auto disconnect on connection error
  useEffect(() => {
    if (error && (isConnecting || isConnected)) {
      setIsConnecting(false);
      setIsConnected(false);
      setAllDetections([]);
    }
  }, [error, isConnecting, isConnected]);

  // Filter detections by date range
  const filteredDetections = useMemo(() => {
    let filtered = [...allDetections];

    if (startDate) {
      filtered = filtered.filter(
        (d) => new Date(d.timestamp) >= startDate
      );
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(
        (d) => new Date(d.timestamp) <= endOfDay
      );
    }

    return filtered;
  }, [allDetections, startDate, endDate]);

  // Get all unique objects for map with latest position based on timestamp
  const allObjects = useMemo(() => {
    const objectsMap = new Map<string, { object: DetectedObject; timestamp: string }>();

    filteredDetections.forEach((detection) => {
      detection.objects.forEach((obj) => {
        const existing = objectsMap.get(obj.obj_id);

        // If object doesn't exist or current detection is newer, update it
        if (!existing || new Date(detection.timestamp) > new Date(existing.timestamp)) {
          objectsMap.set(obj.obj_id, {
            object: obj,
            timestamp: detection.timestamp,
          });
        }
      });
    });

    return Array.from(objectsMap.values()).map((item) => item.object);
  }, [filteredDetections]);

  const handleConnect = () => {
    if (cameraId && token) {
      setIsConnecting(true);
    }
  };

  const handleDisconnect = () => {
    setIsConnecting(false);
    setIsConnected(false);
    setAllDetections([]);
    setCameraInfo(null);
  };

  const handleSearch = () => {
    refetch();
  };

  const handleClearData = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/object-detection/clear/${cameraId}`,
        {
          headers: {
            'x-camera-token': token,
          },
        }
      );

      if (response.data.success) {
        setActionMessage({ type: 'success', text: response.data.message });
        setAllDetections([]);
        setClearDialogOpen(false);
      }
    } catch (error: any) {
      setActionMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to clear data'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL}/object-detection/token/${cameraId}`,
        {
          token: token,
        }
      );

      if (response.data.success) {
        setNewToken(response.data.token);
        setActionMessage({ type: 'success', text: response.data.message });
      }
    } catch (error: any) {
      setActionMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to generate token'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTokenDialog = () => {
    const tokenWasGenerated = !!newToken;
    setTokenDialogOpen(false);
    setNewToken('');
    setActionMessage(null);

    // Disconnect if token was successfully generated
    if (tokenWasGenerated) {
      handleDisconnect();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth={false} disableGutters sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Back Button */}
        <Box sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate('/')} sx={{ color: 'primary.main' }}>
            <Icon icon="mdi:arrow-left" width={28} />
          </IconButton>
        </Box>

        {/* Team Banner */}
        {isConnected && cameraInfo && (
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

        {/* Connection Form */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                label="Camera ID"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                disabled={isConnecting || isConnected}
                placeholder="550e8400-e29b-41d4-a716-446655440000"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                label="Token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isConnecting || isConnected}
                placeholder="your-camera-token-here"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              {!isConnected && !isConnecting ? (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleConnect}
                  disabled={!cameraId || !token}
                  startIcon={<Icon icon="mdi:connection" />}
                >
                  Connect
                </Button>
              ) : isConnecting ? (
                <Button
                  fullWidth
                  variant="contained"
                  disabled
                  startIcon={<CircularProgress size={20} />}
                >
                  Connecting...
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnect}
                  startIcon={<Icon icon="mdi:close-network" />}
                >
                  Disconnect
                </Button>
              )}
            </Grid>
          </Grid>

          {isConnected && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={socketConnected ? 'Socket Connected' : 'Socket Disconnected'}
                color={socketConnected ? 'success' : 'default'}
                icon={<Icon icon={socketConnected ? 'mdi:check-circle' : 'mdi:circle-outline'} />}
              />
              <Typography variant="body2" color="text.secondary">
                Total Detections: {allDetections.length}
              </Typography>
              <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Icon icon="mdi:delete" />}
                  onClick={() => setClearDialogOpen(true)}
                >
                  ลบข้อมูล
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Icon icon="mdi:key-refresh" />}
                  onClick={() => setTokenDialogOpen(true)}
                >
                  Generate Token
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading detections: {error.message}
          </Alert>
        )}

        {actionMessage && (
          <Alert severity={actionMessage.type} sx={{ mb: 3 }} onClose={() => setActionMessage(null)}>
            {actionMessage.text}
          </Alert>
        )}

        {/* Main Content */}
        {isConnected && (
          <Grid container spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
            {/* Left Column - Map */}
            <Grid size={{ xs: 12, md: 8 }} sx={{ height: '100%' }}>
              <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Detection Map
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <MapComponent
                    objects={allObjects}
                    imagePath={filteredDetections[0]?.image_path}
                    detections={filteredDetections}
                    cameraLocation={cameraInfo?.location}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Right Column - Filters and Feed */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Date Filters - Collapsible */}
              <Paper sx={{ mb: 2 }}>
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                  onClick={() => setFilterExpanded(!filterExpanded)}
                >
                  <Typography variant="h6">
                    Filter by Date
                  </Typography>
                  <IconButton size="small">
                    <Icon icon={filterExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={24} />
                  </IconButton>
                </Box>
                <Collapse in={filterExpanded}>
                  <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={(newValue) => setStartDate(newValue)}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={(newValue) => setEndDate(newValue)}
                      slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                    />
                    <Button
                      variant="contained"
                      onClick={handleSearch}
                      startIcon={<Icon icon="mdi:magnify" />}
                      size="small"
                    >
                      Search
                    </Button>
                  </Box>
                </Collapse>
              </Paper>

              {/* Last Image */}
              {filteredDetections.length > 0 && filteredDetections[0].image_path && (
                <Paper sx={{ mb: 2, overflow: 'hidden' }}>
                  <Box sx={{ p: 2, pb: 1 }}>
                    <Typography variant="h6">
                      Last Image
                    </Typography>
                  </Box>
                  <ImageViewer
                    src={`${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${filteredDetections[0].image_path}`}
                    alt="Last Detection"
                    width="100%"
                    objectFit="contain"
                    style={{ maxHeight: '300px' }}
                  />
                  <Box sx={{ p: 2, pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <Icon icon="mdi:clock-outline" width={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      {formatThaiDateTime(filteredDetections[0].timestamp)}
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* Detection Feed */}
              <Paper sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Detection Feed
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: '#f1f1f1',
                      borderRadius: '10px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: '#888',
                      borderRadius: '10px',
                      '&:hover': {
                        backgroundColor: '#555',
                      },
                    },
                  }}
                >
                  {filteredDetections.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Icon icon="mdi:image-off" width={48} height={48} color="#ccc" />
                      <Typography color="text.secondary" sx={{ mt: 2 }}>
                        No detections found
                      </Typography>
                    </Box>
                  ) : (
                    filteredDetections.map((detection) => (
                      <DetectionCard key={detection.id} detection={detection} />
                    ))
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Clear Data Confirmation Dialog */}
        <Dialog
          open={clearDialogOpen}
          onClose={() => !actionLoading && setClearDialogOpen(false)}
        >
          <DialogTitle>ยืนยันการลบข้อมูล</DialogTitle>
          <DialogContent>
            <DialogContentText>
              คุณต้องการลบข้อมูลการตรวจจับทั้งหมดของกล้องนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setClearDialogOpen(false)} disabled={actionLoading}>
              ยกเลิก
            </Button>
            <Button
              onClick={handleClearData}
              color="error"
              variant="contained"
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} /> : <Icon icon="mdi:delete" />}
            >
              {actionLoading ? 'กำลังลบ...' : 'ลบข้อมูล'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Generate Token Dialog */}
        <Dialog
          open={tokenDialogOpen}
          onClose={() => !actionLoading && handleCloseTokenDialog()}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Generate New Token</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              คุณต้องการสร้าง Token ใหม่สำหรับกล้องนี้หรือไม่? Token เดิมจะไม่สามารถใช้งานได้อีกต่อไป
            </DialogContentText>
            {newToken && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Token ใหม่ถูกสร้างเรียบร้อยแล้ว กรุณาคัดลอกและเก็บรักษาไว้
                </Alert>
                <TextField
                  fullWidth
                  label="Token ใหม่"
                  value={newToken}
                  InputProps={{
                    readOnly: true,
                  }}
                  multiline
                  rows={2}
                  sx={{ mb: 1 }}
                />
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Icon icon="mdi:content-copy" />}
                  onClick={() => {
                    navigator.clipboard.writeText(newToken);
                    setActionMessage({ type: 'success', text: 'คัดลอก Token แล้ว' });
                  }}
                >
                  คัดลอก Token
                </Button>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTokenDialog} disabled={actionLoading}>
              {newToken ? 'ปิด' : 'ยกเลิก'}
            </Button>
            {!newToken && (
              <Button
                onClick={handleGenerateToken}
                color="primary"
                variant="contained"
                disabled={actionLoading}
                startIcon={actionLoading ? <CircularProgress size={16} /> : <Icon icon="mdi:key-refresh" />}
              >
                {actionLoading ? 'กำลังสร้าง...' : 'สร้าง Token'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default DashboardPage;
