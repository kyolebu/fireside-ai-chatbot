"use client";
import { Box, Button, Stack, Typography, TextField, IconButton, Fab } from "@mui/material";
import Image from "next/image";
import { useState } from "react";
import aiAvatar from '/app/assets/aiAvatarChatbot.png';
import ChatIcon from '@mui/icons-material/Chat';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { keyframes } from '@mui/material/styles';


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

const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;
const appear = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px); /* Optional: adds a slight upward movement */
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const typingAnimation = keyframes`
  0% { transform: translateY(0); opacity: 0.5; }
  50% { transform: translateY(-10px); opacity: 1; }
  100% { transform: translateY(0); opacity: 0.5; }
`;

const PendingBubble = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 60,
      height: 30,
      bgcolor: '#FCD19C',
      borderRadius: '16px',
      animation: `${typingAnimation} 1s infinite`,
    }}
  >
    <Box
      sx={{
        width: 8,
        height: 8,
        bgcolor: 'black',
        borderRadius: '50%',
        margin: '0 4px',
        animation: `${typingAnimation} 1.5s infinite`,
      }}
    />
    <Box
      sx={{
        width: 8,
        height: 8,
        bgcolor: 'black',
        borderRadius: '50%',
        margin: '0 4px',
        animation: `${typingAnimation} 1.5s infinite`,
      }}
    />
    <Box
      sx={{
        width: 8,
        height: 8,
        bgcolor: 'black',
        borderRadius: '50%',
        margin: '0 4px',
        animation: `${typingAnimation} 1.5s infinite`,
      }}
    />
  </Box>
);

export default function ChatbotInterface() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hi! I'm Fireside, your personal assistant. How can I help you today?"
  }]);

  const [message, setMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const togglePopup = () => {
    setIsChatOpen(prevIsChatOpen => !prevIsChatOpen);
  };
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showButton, setShowButton] = useState(true);

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
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
        console.log("LLM response: ", text)
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box 
        width="100vw" 
        minHeight="100vh" 
        display="flex" 
        flexDirection= 'column'
        alignItems="center"
        justifyContent="flex-start"
        bgcolor="background.default"
        paddingTop={5}
        paddingBottom={5}
        sx={{
          // Ensures padding on small screens to prevent overlap
          paddingX: { xs: 2, sm: 4 },  // Responsive padding
        }}
        
      >
        <Box>
          <Typography 
            variant="h2" 
            component="h1" 
            color="primary" 
            gutterBottom 
            sx={{
                animation: `${appear} 3s ease-out`, // Apply the fade-in animation
                textAlign: 'center',
                marginBottom: { xs: 3, sm: 5 },  // Margin to ensure space for the grey boxes
              }}
            
          >
            Fireside.ai Chatbot
          </Typography>
        </Box>
        <Box
          width="100%"
          display="flex"
          justifyContent="center"
          alignItems="center"
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={8}
          mt={4}
        >
          <Box
            width="90%"
            maxWidth="500px"
            height="400px"
            bgcolor="#E0E0E0" // Light grey background
            borderRadius={2}
            p={3}
            boxShadow={2}
            textAlign="center"
            sx={{
              animation: `${appear} 3s ease-out`, // Apply the fade-in animation
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            <Typography variant="h6" color="black" fontWeight="bold">
              What is FiresideAI?
            </Typography>
            <Typography variant="body1" color="black" mt={2}>
              FiresideAI is an innovative platform designed to enhance your interview preparation. It provides AI-powered solutions to help you prepare effectively, offering various interview types and detailed feedback to track your progress. 
              <br /><br />
              What sets us apart is our robust AI avatar experience, utilizing Cartesia Sonic's generative audio technology. This ensures a dynamic and realistic interaction, making your preparation more engaging and effective.
            </Typography>
          </Box>
          
          <Box
            width="90%"
            maxWidth="500px"
            height="400px"
            bgcolor="#E0E0E0" // Light grey background
            borderRadius={2}
            p={{ xs: 2, sm: 3 }}
            boxShadow={2}
            textAlign="center"
            sx={{
              animation: `${appear} 3s ease-out`, // Apply the fade-in animation
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            <Typography variant="h6" color="black" fontWeight="bold">
              Meet Your Chatbot Assistant
            </Typography>
            <Typography variant="body1" color="black" mt={2}>
              Our chatbot is here to assist you with navigating the site and answering any questions about FiresideAI. As FiresideAI is currently in development, feel free to ask the chatbot anything to learn more about our features and what’s coming next.
              <br /><br />
              If you’re interested in staying updated, click below to join the waitlist!
              <br></br>
              <br></br>
              <a href="https://getwaitlist.com/waitlist/19424" target="_blank" rel="noreferrer">
              <Button variant="contained" style={{ backgroundColor: '#FCD19C', color:'black'}} onClick={sendMessage}>Join Waitlist</Button>
              </a>
            </Typography>
          </Box>
        </Box>

        {!isChatOpen && (
          <Box
            sx={{
              position: 'fixed', // Use 'fixed' to keep the arrow in a specific position relative to the viewport
              bottom: { xs: 65, sm: 90 }, // Adjust to place the arrow slightly above the bottom
              right: { xs: 65, sm: 90 }, // Adjust to place the arrow slightly left from the right edge
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(45deg)', // Rotate the arrow to point towards the chat icon
              fontSize: { xs: '40px', sm: '60px' },  // Responsive icon size
            }}
          >
            <ArrowForwardIcon
              sx={{
                fontSize: { xs: 90, sm: 150 },
                color: '#FCD19C',
                animation: `${pulseAnimation} 1.5s infinite `, // Apply the pulsing animation
              }}
            />
          </Box>
        )}

        {/* Floating Chatbot Icon */}
{/* Conditionally render the Floating Chatbot Icon */}
        {!isChatOpen && (
          <Fab
            aria-label="open chat"
            sx={{
              position: 'fixed',
              bottom: { xs: 16, sm: 32 },
              right: { xs: 16, sm: 32 },
              bgcolor: 'primary.main',
              color: 'secondary.main',
              '&:hover': { 
                bgcolor: 'primary.light',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
              borderRadius: '50%',
              boxShadow: 6,
              width: { xs: 60, sm: 80 },
              height: { xs: 60, sm: 80 },
            }}
            onClick={togglePopup}
          >
            <ChatIcon sx={{ fontSize: { xs: 30, sm: 40 } }} />
          </Fab>
        )}

        {/* Chatbot Drawer */}
        {isChatOpen && (
        <Box
          width="90%"
          maxWidth="500px"
          height="80%"
          maxHeight="500px"
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
              top: 3,
              left: 3,
            }}
          >
            <CloseIcon sx={{ color: 'white' }} />
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
              pr={2}
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
                    {message.content || (loading && <PendingBubble />)}
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
