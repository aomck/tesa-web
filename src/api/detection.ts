import axiosInstance from './axios';
import { type DetectionResponse } from '../types/detection';

export const getRecentDetections = async (
  camId: string,
  token: string
): Promise<DetectionResponse> => {
  const response = await axiosInstance.get(`/object-detection/${camId}`, {
    headers: {
      'x-camera-token': token,
    },
  });
  return response.data;
};
