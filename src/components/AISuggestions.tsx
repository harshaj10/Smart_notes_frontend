import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem,  
  Chip,
  IconButton, 
  Collapse,
  CircularProgress
} from '@mui/material';
import { 
  Lightbulb as LightbulbIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import { AISuggestion } from '../services/ai';

interface AISuggestionsProps {
  suggestions: AISuggestion[];
  loading: boolean;
  onApplySuggestion: (suggestion: string) => void;
}

interface Position {
  x: number;
  y: number;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({ 
  suggestions, 
  loading, 
  onApplySuggestion 
}) => {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  
  const boxRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setOpen(!open);
  };

  const handleExpandSuggestion = (index: number) => {
    setExpanded(expanded === index ? null : index);
  };

  const handleApplySuggestion = (suggestion: string) => {
    onApplySuggestion(suggestion);
  };

  // Automatically show the panel when new suggestions arrive
  useEffect(() => {
    if (suggestions.length > 0) {
      setOpen(true);
    }
  }, [suggestions]);

  // Display confidence level as a percentage
  const getConfidencePercent = (confidence: number) => {
    return Math.round(confidence * 100);
  };
  
  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (boxRef.current) {
      setIsDragging(true);
      const rect = boxRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      e.preventDefault(); // Prevent text selection during drag
    }
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && boxRef.current) {
      const editorContainer = boxRef.current.parentElement;
      if (editorContainer) {
        const editorRect = editorContainer.getBoundingClientRect();
        const boxRect = boxRef.current.getBoundingClientRect();
        
        // Calculate new position with boundaries
        let newX = e.clientX - editorRect.left - dragOffset.x;
        let newY = e.clientY - editorRect.top - dragOffset.y;
        
        // Enforce boundaries to keep box within editor
        newX = Math.max(0, Math.min(newX, editorRect.width - boxRect.width));
        newY = Math.max(0, Math.min(newY, editorRect.height - boxRect.height));
        
        setPosition({ x: newX, y: newY });
      }
    }
  }, [isDragging, dragOffset]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <Paper 
      ref={boxRef}
      elevation={3}
      sx={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: 260, // Smaller width
        maxHeight: 300, // Smaller max height
        overflow: 'hidden',
        borderRadius: 2,
        transition: isDragging ? 'none' : 'all 0.3s ease',
        zIndex: 100,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.75,
          bgcolor: 'primary.main',
          color: 'white',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          cursor: 'pointer',
        }}
      >
        <Box 
          sx={{ display: 'flex', alignItems: 'center' }}
          onClick={handleToggle}
        >
          <LightbulbIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
          <Typography variant="body2">AI Suggestions</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {loading && <CircularProgress size={16} sx={{ mr: 0.5, color: 'white' }} />}
          <IconButton 
            size="small" 
            sx={{ 
              color: 'white', 
              p: 0.5, 
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' },
              cursor: 'grab',
              mr: 0.5
            }}
            onMouseDown={handleMouseDown}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
          {open ? (
            <IconButton 
              size="small" 
              sx={{ color: 'white', p: 0.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' } }}
              onClick={handleToggle}
            >
              <ExpandLessIcon fontSize="small" />
            </IconButton>
          ) : (
            <IconButton 
              size="small" 
              sx={{ color: 'white', p: 0.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' } }}
              onClick={handleToggle}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box 
          sx={{ 
            maxHeight: 250, 
            overflowY: 'auto', 
            bgcolor: 'background.paper',
            px: 1,
            py: 1,
          }}
        >
          {suggestions.length > 0 ? (
            <List dense disablePadding>
              {suggestions.map((suggestion, index) => (
                <React.Fragment key={index}>
                  <ListItem 
                    alignItems="flex-start" 
                    disablePadding
                    sx={{
                      flexDirection: 'column',
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 0.75,
                    }}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        width: '100%', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="body2"
                          sx={{
                            fontWeight: 'medium',
                            fontSize: '0.8rem',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: expanded === index ? 'unset' : 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleExpandSuggestion(index)}
                        >
                          {suggestion.text}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => handleApplySuggestion(suggestion.text)}
                        sx={{ ml: 0.5, p: 0.5 }}
                      >
                        <CheckIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </Box>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        width: '100%', 
                        justifyContent: 'flex-end',
                        mt: 0.5,
                      }}
                    >
                      <Chip
                        label={`${getConfidencePercent(suggestion.confidence)}% match`}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          height: 16, 
                          '& .MuiChip-label': { 
                            px: 0.75, 
                            fontSize: '0.6rem' 
                          } 
                        }}
                      />
                    </Box>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ py: 1.5, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {loading ? 'Generating suggestions...' : 'No suggestions available yet'}
              </Typography>
              {loading && (
                <CircularProgress size={16} sx={{ mt: 0.5 }} />
              )}
            </Box>
          )}

          <Box sx={{ py: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
              Click on a suggestion to apply it to your note
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default AISuggestions;