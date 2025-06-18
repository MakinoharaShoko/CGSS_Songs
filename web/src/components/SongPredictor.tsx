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
  IconButton,
  Collapse,
  Chip,
} from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { ExpandLess, ExpandMore } from '@mui/icons-material'
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
  const [expanded, setExpanded] = useState(true)

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
      <Paper sx={{ p: 0 }}>
        <Box 
          className="collapsible-header"
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2,
            pb: expanded ? 1 : 2,
            cursor: 'pointer',
            borderRadius: 1,
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              选择偶像 {selectedIdols.length > 0 && `(${selectedIdols.length})`}
            </Typography>
            {!expanded && selectedIdols.length > 0 && (
              <Box className="collapsed-chips" sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {selectedIdols.slice(0, 3).map((idol) => (
                  <Chip 
                    key={idol.id} 
                    label={idol.name}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
                {selectedIdols.length > 3 && (
                  <Chip 
                    label={`+${selectedIdols.length - 3}`}
                    size="small"
                    variant="outlined"
                    color="secondary"
                  />
                )}
              </Box>
            )}
          </Box>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        
        <Collapse in={expanded}>
          <Box sx={{ px: 2, pb: 2 }}>
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
        </Collapse>
      </Paper>
      
      <Paper sx={{ flexGrow: 1, minHeight: 0 }}>
        <DataGrid
          rows={predictions}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          sx={{
            border: 'none',
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