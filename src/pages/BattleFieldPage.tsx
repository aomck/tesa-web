import { useEffect } from 'react';
import { Container, Box, Typography, Grid, IconButton } from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import DashboardPage from './DashboardPage';

const BattleFieldPage = () => {
  const navigate = useNavigate();

  // Set document title
  useEffect(() => {
    document.title = 'Battle Field - Tesa 2025 @ CRMA';
  }, []);

  return (
    <Container maxWidth={false} disableGutters sx={{
      minHeight: '100vh',
      height: { xs: 'auto', lg: '100vh' },
      display: 'flex',
      flexDirection: 'column',
      p: 2
    }}>
      {/* Back Button */}
      <Box sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/')} sx={{ color: 'primary.main' }}>
          <Icon icon="mdi:arrow-left" width={28} />
        </IconButton>
      </Box>

      {/* Title */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h3" component="h1" fontWeight="bold">
          Battle Field
        </Typography>
      </Box>

      {/* Two Column Layout */}
      <Grid container spacing={2} sx={{
        flex: { xs: 'none', lg: 1 },
        overflow: { xs: 'visible', lg: 'hidden' },
        pb: { xs: 2, lg: 0 },
        mb: { xs: 0, lg: 0 }
      }}>
        {/* Left Column - Defence Dashboard */}
        <Grid size={{ xs: 12, lg: 6 }} sx={{
          height: { xs: 'auto', lg: '100%' },
          minHeight: { xs: 'auto', lg: 'auto' },
          mb: { xs: 3, lg: 0 }
        }}>
          <Box sx={{
            height: '100%',
            overflow: { xs: 'visible', lg: 'auto' },
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
          }}>
            <DashboardPage info="left" />
          </Box>
        </Grid>

        {/* Right Column - Offence Dashboard */}
        <Grid size={{ xs: 12, lg: 6 }} sx={{
          height: { xs: 'auto', lg: '100%' },
          minHeight: { xs: 'auto', lg: 'auto' },
          mb: { xs: 3, lg: 0 }
        }}>
          <Box sx={{
            height: '100%',
            overflow: { xs: 'visible', lg: 'auto' },
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
          }}>
            <DashboardPage info="right" />
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default BattleFieldPage;
