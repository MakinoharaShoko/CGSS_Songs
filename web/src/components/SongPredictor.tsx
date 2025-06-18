import React, { useEffect, useState } from 'react'
import {
  Box,
  Checkbox,
  FormControlLabel,
  Paper,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { getAllIdols, getSongPredictions } from '../services/database'

interface Idol {
  id: number
  name: string
  originalName: string | null
}

interface SongPrediction {
  id: string
  songName: string
  performers: string
  matchRate: number
  presentCount: number
  totalCount: number
  missingCount: number
}

export const SongPredictor: React.FC = () => {
  const [idols, setIdols] = useState<Idol[]>([])
  const [selectedIdols, setSelectedIdols] = useState<Idol[]>([])
  const [excludeTanaka, setExcludeTanaka] = useState(false)
  const [predictions, setPredictions] = useState<SongPrediction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadIdols = async () => {
      try {
        const idolList = await getAllIdols()
        setIdols(idolList)
        setLoading(false)
      } catch (error) {
        console.error('Failed to load idols:', error)
        setLoading(false)
      }
    }
    loadIdols()
  }, [])

  useEffect(() => {
    const updatePredictions = async () => {
      if (selectedIdols.length === 0) {
        setPredictions([])
        return
      }

      try {
        setLoading(true)
        const results = await getSongPredictions(
          selectedIdols.map(idol => idol.name),
          excludeTanaka
        )
        setPredictions(
          results.map((result, index) => ({
            ...result,
            id: `${index}-${result.songName}`,
          }))
        )
      } catch (error) {
        console.error('Failed to get predictions:', error)
      } finally {
        setLoading(false)
      }
    }
    updatePredictions()
  }, [selectedIdols, excludeTanaka])

  const columns: GridColDef[] = [
    {
      field: 'songName',
      headerName: '歌曲名',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'performers',
      headerName: '演唱者',
      flex: 2,
      minWidth: 300,
    },
    {
      field: 'matchRate',
      headerName: '匹配率',
      type: 'number',
      width: 100,
      valueFormatter: (params) => `${params}%`,
    },
    {
      field: 'presentCount',
      headerName: '出演人数',
      type: 'number',
      width: 100,
    },
    {
      field: 'totalCount',
      headerName: '原配人数',
      type: 'number',
      width: 100,
    },
    {
      field: 'missingCount',
      headerName: '缺席人数',
      type: 'number',
      width: 100,
    },
  ]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          歌曲预测器
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Autocomplete
            multiple
            options={idols}
            getOptionLabel={(idol) => `${idol.name} (${idol.originalName || '无日文名'})`}
            value={selectedIdols}
            onChange={(_, newValue) => setSelectedIdols(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="选择偶像"
                placeholder="开始输入以搜索..."
              />
            )}
            loading={loading}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={excludeTanaka}
                onChange={(e) => setExcludeTanaka(e.target.checked)}
              />
            }
            label="排除田中秀和作词作曲的歌曲"
          />
        </Box>
      </Paper>
      
      <Paper sx={{ flexGrow: 1, height: 400 }}>
        <DataGrid
          rows={predictions}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell': {
              whiteSpace: 'normal',
              lineHeight: 'normal',
            },
          }}
        />
      </Paper>
    </Box>
  )
} 