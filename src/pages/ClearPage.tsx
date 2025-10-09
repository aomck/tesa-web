import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ClearPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Set document title
  useEffect(() => {
    document.title = 'Clear Data - Tesa 2025 @ CRMA';
  }, []);

  const handleClear = async () => {
    if (!password) {
      setStatus('error');
      setMessage('กรุณาระบุรหัสผ่าน');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const response = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/object-detection/clear-all`,
        {
          data: { password },
        }
      );

      if (response.data.success) {
        setStatus('success');
        setMessage('ลบข้อมูลทั้งหมดสำเร็จ');
        setPassword('');
      } else {
        setStatus('error');
        setMessage(response.data.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (error: any) {
      setStatus('error');
      if (error.response?.status === 401) {
        setMessage('รหัสผ่านไม่ถูกต้อง');
      } else {
        setMessage(error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Back Button */}
      <Box sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/')} sx={{ color: 'primary.main' }}>
          <Icon icon="mdi:arrow-left" width={28} />
        </IconButton>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Icon icon="mdi:delete-alert" width={64} color="#dc004e" />
          <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mt: 2 }}>
            รีเซ็ตข้อมูล
          </Typography>
          <Typography variant="body1" color="text.secondary">
            ลบข้อมูลการตรวจจับและรูปภาพทั้งหมด
          </Typography>
        </Box>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            คำเตือน: การดำเนินการนี้จะลบข้อมูลทั้งหมดและไม่สามารถกู้คืนได้
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            • ลบข้อมูลการตรวจจับวัตถุทั้งหมด
          </Typography>
          <Typography variant="body2">
            • ลบรูปภาพที่อัพโหลดทั้งหมด
          </Typography>
        </Alert>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            type="password"
            label="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ระบุรหัสผ่านเพื่อยืนยันการลบ"
            disabled={loading}
            autoFocus
          />
        </Box>

        {status !== 'idle' && (
          <Alert severity={status} sx={{ mb: 3 }}>
            {message}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          color="error"
          size="large"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Icon icon="mdi:delete-forever" />}
          onClick={handleClear}
          disabled={!password || loading}
        >
          {loading ? 'กำลังลบข้อมูล...' : 'ลบข้อมูลทั้งหมด'}
        </Button>

        <Button
          fullWidth
          variant="text"
          sx={{ mt: 2 }}
          onClick={() => navigate('/')}
          disabled={loading}
        >
          ยกเลิก
        </Button>
      </Paper>
    </Container>
  );
};

export default ClearPage;
