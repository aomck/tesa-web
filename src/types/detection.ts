export interface DetectedObject {
  obj_id: string;
  type: string;
  lat: number;
  lng: number;
  objective: string;
  size: string;
  details?: Record<string, any>;
}

export interface DetectionEvent {
  id: number;
  cam_id: string;
  timestamp: string;
  image_path: string;
  objects: DetectedObject[];
}

export interface DetectionResponse {
  success: boolean;
  data: DetectionEvent[];
}

export interface CameraConnection {
  cam_id: string;
  token: string;
}
