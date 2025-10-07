# TESA Web Dashboard

Dashboard monitoring for object detection from TESA GPS Tracking Service.

## Tech Stack

- **Vite** - Fast build tool
- **React TypeScript** - UI framework
- **Material-UI (MUI)** - UI components
- **Mapbox GL** - Map visualization
- **Iconify** - Icon library
- **TanStack Query** - Data fetching and caching
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client

## Features

### Dashboard Page

- **Connection Panel** (Grid 5-5-2)
  - Camera ID input field
  - Token input field
  - Connect button to fetch latest data and connect to Socket.IO

- **Two Column Layout**

  **Left Column (Map)**
  - Interactive Mapbox map displaying detected objects
  - Clickable object icons showing detailed information
  - Auto-centers on detected objects

  **Right Column (Filters & Feed)**
  - Date range filter (start_date, end_date)
  - Search button to query filtered data
  - Scrollable detection feed with cards
  - Real-time updates via Socket.IO

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` file:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=your-mapbox-token-here
```

3. Get a Mapbox token:
   - Sign up at [mapbox.com](https://www.mapbox.com/)
   - Create an access token
   - Add it to `.env`

## Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
```

## Usage

1. Enter your Camera ID (UUID format)
2. Enter your Camera Token
3. Click "Connect" to:
   - Fetch last 24 hours of detection data
   - Connect to Socket.IO for real-time updates
4. Use date filters to narrow down results
5. Click on map markers to view object details
6. Scroll through detection feed on the right panel

## Project Structure

```
tesa-web/
├── src/
│   ├── api/
│   │   ├── axios.ts          # Axios instance configuration
│   │   └── detection.ts      # Detection API calls
│   ├── components/
│   │   ├── MapComponent.tsx  # Mapbox map with markers
│   │   └── DetectionCard.tsx # Detection feed card
│   ├── hooks/
│   │   ├── useDetections.ts  # TanStack Query hook
│   │   └── useSocket.ts      # Socket.IO hook
│   ├── pages/
│   │   └── DashboardPage.tsx # Main dashboard page
│   ├── types/
│   │   └── detection.ts      # TypeScript interfaces
│   ├── App.tsx               # App entry point
│   └── main.tsx              # React entry point
├── .env                      # Environment variables
├── .env.example              # Environment template
└── package.json
```

## API Integration

The dashboard integrates with TESA Service API:

- `GET /api/object-detection/:cam_id` - Fetch recent detections (last 24 hours)
- WebSocket events:
  - `subscribe_camera` - Subscribe to camera updates
  - `object_detection` - Receive real-time detection data

See [tesa-service/docs/api-usage.md](../tesa-service/docs/api-usage.md) for API documentation.

## Features in Detail

### Real-time Updates
- Automatic connection to Socket.IO on "Connect"
- New detections appear instantly in the feed
- Map updates with new object locations

### Date Filtering
- Filter detections by start and end date
- Search button refreshes data with filters applied
- Maintains real-time updates while filtering

### Map Visualization
- Different icons for object types (person, car, truck, etc.)
- Popup with object details on marker click
- Auto-zoom to fit all objects
- Image preview in popup

### Detection Feed
- Chronological list of detections
- Scrollable with custom scrollbar
- Shows timestamp, camera info, and detected objects
- Image preview for each detection
- Object chips with type and size information

## License

Private project for ATNYK/Tesa
