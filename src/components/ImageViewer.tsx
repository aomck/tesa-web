import { useState } from 'react';
import { Box, IconButton, Modal, Backdrop } from '@mui/material';
import { Icon } from '@iconify/react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

const ImageViewer = ({
  src,
  alt = 'Image',
  width = '100%',
  height = 'auto',
  style,
  objectFit = 'cover',
}: ImageViewerProps) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      {/* Thumbnail Image */}
      <Box
        component="img"
        src={src}
        alt={alt}
        onClick={handleOpen}
        sx={{
          width,
          height,
          objectFit,
          cursor: 'pointer',
          transition: 'transform 0.2s, opacity 0.2s',
          '&:hover': {
            transform: 'scale(1.02)',
            opacity: 0.9,
          },
          ...style,
        }}
      />

      {/* Modal Popup */}
      <Modal
        open={open}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10000,
            },
          },
        }}
        sx={{
          zIndex: 10000,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            outline: 'none',
            zIndex: 10001,
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
              },
            }}
          >
            <Icon icon="mdi:close" width={24} />
          </IconButton>

          {/* Full Size Image */}
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: 1,
            }}
          />
        </Box>
      </Modal>
    </>
  );
};

export default ImageViewer;
