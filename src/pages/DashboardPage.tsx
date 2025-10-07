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
  Grid
} from '@mui/material';
import { Icon } from '@iconify/react';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import MapComponent from '../components/MapComponent';
import DetectionCard from '../components/DetectionCard';
import { useDetections } from '../hooks/useDetections';
import { useSocket } from '../hooks/useSocket';
import { type DetectionEvent, type DetectedObject } from '../types/detection';

const DashboardPage = () => {
  const [cameraId, setCameraId] = useState('550e8400-e29b-41d4-a716-446655440000');
  const [token, setToken] = useState('ff13b10a-95bc-4337-9b12-fda59ccc725e');
  const [isConnected, setIsConnected] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Fetch initial data
  const { data, isLoading, error, refetch } = useDetections(
    cameraId,
    token,
    isConnected
  );

  // Socket connection for real-time updates
  const { realtimeData, isConnected: socketConnected } = useSocket(
    cameraId,
    isConnected
  );

  // Merge real-time data with fetched data
  const [allDetections, setAllDetections] = useState<DetectionEvent[]>([]);

  useEffect(() => {
    if (data?.data) {
      setAllDetections(data.data);
    }
  }, [data]);

  useEffect(() => {
    if (realtimeData) {
      setAllDetections((prev) => [realtimeData, ...prev]);
    }
  }, [realtimeData]);

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
      setIsConnected(true);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAllDetections([]);
  };

  const handleSearch = () => {
    refetch();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth={false} disableGutters sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Connection Form */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                label="Camera ID"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                disabled={isConnected}
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
                disabled={isConnected}
                placeholder="your-camera-token-here"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              {!isConnected ? (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleConnect}
                  disabled={!cameraId || !token}
                  startIcon={<Icon icon="mdi:connection" />}
                >
                  Connect
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
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                label={socketConnected ? 'Socket Connected' : 'Socket Disconnected'}
                color={socketConnected ? 'success' : 'default'}
                icon={<Icon icon={socketConnected ? 'mdi:check-circle' : 'mdi:circle-outline'} />}
              />
              <Typography variant="body2" color="text.secondary">
                Total Detections: {allDetections.length}
              </Typography>
            </Box>
          )}
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Error loading detections: {error.message}
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Main Content */}
        {isConnected && !isLoading && (
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
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Right Column - Filters and Feed */}
            <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Date Filters */}
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Filter by Date
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={(newValue) => setStartDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <Button
                    variant="contained"
                    onClick={handleSearch}
                    startIcon={<Icon icon="mdi:magnify" />}
                  >
                    Search
                  </Button>
                </Box>
              </Paper>

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
      </Container>
    </LocalizationProvider>
  );
};

export default DashboardPage;
