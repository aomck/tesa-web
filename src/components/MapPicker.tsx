import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Paper, TextField, InputAdornment, IconButton, List, ListItem, ListItemButton, ListItemText, Popper, ClickAwayListener } from '@mui/material';
import { Icon } from '@iconify/react';
import axios from 'axios';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

const LOCATIONS = {
  defence: { lng: 101.166279, lat: 14.297567 },
  offence: { lng: 101.171298, lat: 14.286451 },
};

interface MapPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  cameraLocation?: string;
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

const MapPicker = ({ lat, lng, onLocationChange, cameraLocation }: MapPickerProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainer.current || initialized) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [lng, lat],
      zoom: 15,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: '#1976d2',
    })
      .setLngLat([lng, lat])
      .addTo(map.current);

    marker.current.on('dragend', () => {
      if (marker.current) {
        const lngLat = marker.current.getLngLat();
        onLocationChange(lngLat.lat, lngLat.lng);
      }
    });

    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      }
      onLocationChange(lat, lng);
    });

    setInitialized(true);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current && marker.current && initialized) {
      marker.current.setLngLat([lng, lat]);
      map.current.setCenter([lng, lat]);
    }
  }, [lat, lng, initialized]);

  // Update map when camera location changes
  useEffect(() => {
    if (map.current && marker.current && initialized && cameraLocation) {
      let targetLng = lng;
      let targetLat = lat;

      if (cameraLocation === 'defence') {
        targetLng = LOCATIONS.defence.lng;
        targetLat = LOCATIONS.defence.lat;
      } else if (cameraLocation === 'offence') {
        targetLng = LOCATIONS.offence.lng;
        targetLat = LOCATIONS.offence.lat;
      }

      marker.current.setLngLat([targetLng, targetLat]);
      map.current.flyTo({
        center: [targetLng, targetLat],
        zoom: 15,
        duration: 1000,
      });
      onLocationChange(targetLat, targetLng);
    }
  }, [cameraLocation, initialized]);

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        {
          params: {
            access_token: mapboxgl.accessToken,
            limit: 5,
            language: 'th',
          },
        }
      );

      if (response.data.features) {
        setSearchResults(
          response.data.features.map((feature: any) => ({
            id: feature.id,
            place_name: feature.place_name,
            center: feature.center,
          }))
        );
        setShowResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleSelectLocation = (result: SearchResult) => {
    const [lng, lat] = result.center;
    onLocationChange(lat, lng);

    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1000,
      });
    }

    setSearchQuery(result.place_name);
    setShowResults(false);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  return (
    <Paper elevation={2}>
      <Box sx={{ p: 2, pb: 0 }}>
        <ClickAwayListener onClickAway={() => setShowResults(false)}>
          <Box ref={searchInputRef} sx={{ position: 'relative' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="ค้นหาสถานที่..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon icon="mdi:magnify" width={20} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowResults(false);
                      }}
                    >
                      <Icon icon="mdi:close" width={20} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Popper
              open={showResults && searchResults.length > 0}
              anchorEl={searchInputRef.current}
              placement="bottom-start"
              style={{ width: searchInputRef.current?.clientWidth, zIndex: 1000 }}
            >
              <Paper elevation={3} sx={{ maxHeight: 200, overflow: 'auto', mt: 0.5 }}>
                <List disablePadding>
                  {searchResults.map((result) => (
                    <ListItem key={result.id} disablePadding>
                      <ListItemButton onClick={() => handleSelectLocation(result)}>
                        <ListItemText
                          primary={result.place_name}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Popper>
          </Box>
        </ClickAwayListener>
      </Box>
      <Box
        ref={mapContainer}
        sx={{
          width: '100%',
          height: 300,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      />
    </Paper>
  );
};

export default MapPicker;
