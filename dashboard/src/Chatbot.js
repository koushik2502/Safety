import React, { useState } from 'react';

const SERVER = process.env.REACT_APP_SERVER_URL || window.location.origin;

export default function Chatbot({ onClose, visible, socket, selectedDevice }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendPredefinedCommand = (command) => {
    if (!selectedDevice) {
      setMessages([...messages, { text: 'Please select a device first.', sender: 'bot' }]);
      return;
    }
    socket.emit('command', { deviceId: selectedDevice, command });
    setMessages([...messages, { text: `Command "${command}" sent to ${selectedDevice}`, sender: 'bot' }]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { text: input, sender: 'user' }];
    setMessages(newMessages);
    setInput('');

    // Command detection
    const commandMatch = input.match(/^(tell|send|ask) device ([\w-]+) to (.+)/i);
    if (commandMatch) {
      const [, , deviceId, command] = commandMatch;
      socket.emit('command', { deviceId, command });
      setMessages([...newMessages, { text: 'Command sent!', sender: 'bot' }]);
      return;
    }

    try {
      const response = await fetch(`${SERVER}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessages([...newMessages, { text: data.generated_text, sender: 'bot' }]);
    } catch (error) {
      console.error('Error fetching from AI API:', error);
      setMessages([...newMessages, { text: 'Sorry, something went wrong.', sender: 'bot' }]);
    }
  };

  if (!visible) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>AI Chatbot</h3>
        <button onClick={onClose} style={styles.closeButton}>X</button>
      </div>
      <div style={styles.messagesContainer}>
        {messages.map((msg, index) => (
          <div key={index} style={msg.sender === 'user' ? styles.userMessage : styles.botMessage}>
            {msg.text}
          </div>
        ))}
      </div>
      <div style={styles.predefinedCommands}>
        <button onClick={() => sendPredefinedCommand('open youtube')} disabled={!selectedDevice}>
          Open YouTube
        </button>
        <button onClick={() => sendPredefinedCommand('open maps')} disabled={!selectedDevice}>
          Open Maps
        </button>
        <button onClick={() => sendPredefinedCommand('open camera')} disabled={!selectedDevice}>
          Open Camera
        </button>
      </div>
      <div style={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          style={styles.input}
        />
        <button onClick={sendMessage} style={styles.sendButton}>Send</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    width: 350,
    height: 500,
    border: '1px solid #ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #ccc',
    backgroundColor: '#f1f1f1',
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    fontSize: 20,
    cursor: 'pointer',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
    overflowY: 'auto',
  },
  userMessage: {
    textAlign: 'right',
    margin: '5px 0',
    padding: '10px',
    backgroundColor: '#d1e7dd',
    borderRadius: 5,
  },
  botMessage: {
    textAlign: 'left',
    margin: '5px 0',
    padding: '10px',
    backgroundColor: '#f8d7da',
    borderRadius: 5,
  },
  inputContainer: {
    display: 'flex',
    padding: 10,
    borderTop: '1px solid #ccc',
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    border: '1px solid #ccc',
  },
  sendButton: {
    marginLeft: 10,
    padding: '10px 15px',
    borderRadius: 5,
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
  },
  predefinedCommands: {
    padding: 10,
    borderTop: '1px solid #ccc',
  }
};
