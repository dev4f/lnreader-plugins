import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';
import { Plugin } from '@typings/plugin';
import CopiableItem from '@components/CopiableItem';
import PathItem from '@components/PathItem';
export default function NovelItemCard({ item }: { item: Plugin.NovelItem }) {
  return (
    <Box sx={{ display: 'flex', p: 1 }}>
      <CardContent>
        <Typography>Summary</Typography>
        <Typography
          sx={{
            overflowY: 'auto',
            height: 300,
            p: 2,
            borderRadius: 2,
            backgroundColor: 'rgba(0,0,0,0.1)',
          }}
        >
          {item.name}
        </Typography>
      </CardContent>
      <CopiableItem content={item.cover}>
        <Tooltip title={item.cover}>
          <CardMedia
            component="img"
            sx={{ width: 200, height: '100%' }}
            image={item.cover}
          />
        </Tooltip>
      </CopiableItem>
      <Box sx={{ display: 'flex', flexDirection: 'column', width: 200 }}>
        <CardContent sx={{ height: 150 }}>
          <Tooltip title={item.name}>
            <Box>
              <CopiableItem content={item.name}>
                <Button variant="outlined">
                  <Typography
                    sx={{
                      overflow: 'scroll',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: '5',
                      WebkitBoxOrient: 'vertical',
                      fontSize: 14,
                    }}
                  >
                    {item.name}
                  </Typography>
                </Button>
              </CopiableItem>
            </Box>
          </Tooltip>
        </CardContent>
        <CardContent>
          <PathItem path={item.path} />
        </CardContent>
      </Box>
    </Box>
  );
}
