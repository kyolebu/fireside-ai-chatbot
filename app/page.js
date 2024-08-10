"use client";
import { Box, Button, Stack, Typography, TextField, IconButton, Fab } from "@mui/material";
import Image from "next/image";
import { useState } from "react";
import aiAvatar from '/app/assets/aiAvatarChatbot.png';
import ChatIcon from '@mui/icons-material/Chat';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FCD19C',
    },
    secondary: {
      main: '#000000',
    },
    background: {
      default: '#1A1A1A',
      paper: '#2C2C2C',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default function ChatbotInterface() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hi! I am an AI assistant. How can I help you today?'
  }]);

  const [message, setMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const togglePopup = () => {
    setIsChatOpen(prevIsChatOpen => !prevIsChatOpen);
  };
  const [open, setOpen] = useState(false);
  const [showButton, setShowButton] = useState(true);

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    setMessage('');
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: message },
      { role: "assistant", content: '' },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, { role: "user", content: message }]),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          const updatedMessages = prevMessages.slice(0, -1);
          return [
            ...updatedMessages,
            {
              ...lastMessage,
              content: lastMessage.content + text,
            },
          ];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box 
        width="100vw" 
        height="100vh" 
        display="flex" 
        flexDirection="column" 
        alignItems="center"
        justifyContent="center"
        bgcolor="background.default"
      >
        <Typography variant="h2" component="h1" color="primary" gutterBottom>
          Fireside.ai Chatbot Demo
        </Typography>
        
        <Typography variant="h5" color="text.secondary" paragraph textAlign="center">
          Experience the power of AI conversation.<br/>Click the chat icon to get started.
        </Typography>

        {/* Floating Chatbot Icon */}
{/* Conditionally render the Floating Chatbot Icon */}
        {!isChatOpen && (
          <Fab
            aria-label="open chat"
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              bgcolor: 'primary.main',
              color: 'secondary.main',
              '&:hover': { 
                bgcolor: 'primary.light',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
              borderRadius: '50%',
              boxShadow: 6,
              width: 80,
              height: 80,
            }}
            onClick={togglePopup}
          >
            <ChatIcon sx={{ fontSize: 40 }} />
          </Fab>
        )}

        {/* Chatbot Drawer */}
        {isChatOpen && (
        <Box
          width="500px"
          height="600px"
          border="1px solid black"
          position="fixed"
          bottom={16}
          right={16}
          bgcolor="grey.800"
          boxShadow={3}
          borderRadius={2}
          p={2}
        >
          {/* Close Button */}
          <IconButton
            onClick={togglePopup}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
            }}
          >
            <CloseIcon />
          </IconButton>

          <Stack
            direction="column"
            width="100%"
            height="100%"
            spacing={3}
          >
            <Stack
              direction="column"
              spacing={2}
              flexGrow={1}
              overflow="auto"
              maxHeight="100%"
            >
              {messages.map((message, index) => (
                <Box
                  key={index}
                  display="flex"
                  justifyContent={message.role === 'assistant' ? 'flex-start' : 'flex-end'}
                >
                  {message.role === 'assistant' && (
                    <Image
                      src={aiAvatar}
                      alt="ai_avatar"
                      width={60}
                      height={60}
                    />
                  )}
                  <Box
                    bgcolor={message.role === 'assistant' ? '#FCD19C' : 'white'}
                    color="black"
                    borderRadius={16}
                    p={3}
                    ml={message.role === 'assistant' ? 2 : 0}
                    mr={message.role === 'assistant' ? 0 : 2}
                  >
                    {message.content}
                  </Box>
                </Box>
              ))}
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Message"
                sx={{
                  '& .MuiInputBase-input': {
                  color: 'white', // Text color
                },
                '& .MuiInputLabel-root': {
                  color: 'white', // Label color
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: 'white', // Label color when focused
                },
                '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white', // Border color
                },
                '&:hover .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white', // Border color on hover
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white', // Border color when focused
                },
                }}
                fullWidth
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button variant="contained" style={{ backgroundColor: '#000000', color:'white'}} onClick={sendMessage}>Send</Button>
            </Stack>
          </Stack>
        </Box>
      )}
      </Box>
    </ThemeProvider>
  );
}
