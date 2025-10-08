import { Container, Grid, Card, CardContent, CardActionArea, Typography, Box } from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Dashboard',
      description: 'ดูข้อมูลการตรวจจับวัตถุแบบเรียลไทม์',
      icon: 'mdi:view-dashboard',
      path: '/dashboard',
      color: '#1976d2',
    },
    {
      title: 'Simulation',
      description: 'จำลองการส่งข้อมูลการตรวจจับวัตถุ',
      icon: 'mdi:play-circle',
      path: '/simulation',
      color: '#dc004e',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          TESA Object Detection
        </Typography>
        <Typography variant="h6" color="text.secondary">
          ระบบตรวจจับและติดตามวัตถุ
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {menuItems.map((item) => (
          <Grid key={item.path} size={{ xs: 12, sm: 6 }}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                onClick={() => navigate(item.path)}
                sx={{ height: '100%', p: 3 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      p: 3,
                      borderRadius: '50%',
                      bgcolor: `${item.color}20`,
                      mb: 2,
                    }}
                  >
                    <Icon
                      icon={item.icon}
                      width={64}
                      height={64}
                      color={item.color}
                    />
                  </Box>
                  <Typography variant="h5" component="h2" gutterBottom fontWeight="bold">
                    {item.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default HomePage;
