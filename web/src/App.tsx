import React from 'react'
import { Box, Container, Typography } from '@mui/material'
import { SongPredictor } from './components/SongPredictor'

export const App: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4, height: '100vh' }}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          CGSS 歌曲预测器
        </Typography>
        <Box sx={{ flexGrow: 1 }}>
          <SongPredictor />
        </Box>
      </Box>
    </Container>
  )
} 