"use client";
import { Box, Button, Stack, Typography, TextField } from "@mui/material";
import { Readex_Pro } from "next/font/google";
import Image from "next/image";
import { useState } from "react";
import redFlameGradientLogo from '/app/assets/red_flame_gradient_logo_3.jpg';
import aiAvatar from '/app/assets/aiAvatarChatbot.png';

export default function Home() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hi! I am the FiresideAI AI assistant. How can I help you today?'
  }]);

  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    setMessage('');
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: '' },
    ]);
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let results = '';
      return reader.read().then(async function processText({ done, value }) {
        if (done) {
          return results;
        }
        const text = decoder.decode(value || new Int8Array(), { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            {
              ...lastMessage,
              content: lastMessage.content + text,
            },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  return (
    <Box width="100vw" height="100vh" display="flex" flexDirection="column" alignItems="center">
      
      {/* Hero Section */}
      <Box
        width="100%"
        height="300px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="black"
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Image src={redFlameGradientLogo} alt="logo" width={100} height={100} />
          <Typography variant="h3" color="white">
            Welcome to FiresideAI
          </Typography>
        </Stack>
      </Box>

      {/* Introduction Section */}
      <Box width="80%" mt={4} textAlign="center">
        <Typography variant="h5">
          Meet your AI assistant, here to help you with all your queries and make your experience seamless.
        </Typography>
        <Typography variant="body1" mt={2}>
          Whether you need help navigating our services or have specific questions, the AI assistant is just a click away!
        </Typography>
      </Box>

      {/* Chatbot Section */}
      <Box
        width="600px"
        height="700px"
        border="1px solid black"
        mt={5}
        p={2}
      >
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
                alignItems="center"
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
                  bgcolor={message.role === 'assistant' ? '#FCD19C' : 'grey'}
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
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button variant="contained" style={{ backgroundColor: '#000000' }} onClick={sendMessage}>Send</Button>
          </Stack>
        </Stack>
      </Box>

    </Box>
  );
}
