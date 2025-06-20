// server.js - Simple Railway Claude Proxy
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // Make sure 'node-fetch' is installed (npm install node-fetch@2)
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080; // Ensure this port is correctly exposed on Railway

// --- START OF EXPLICIT CORS CONFIGURATION ---
// Define the allowed origins for your frontend
const allowedOrigins = [
  'https://mtgscanner.com',
  // IMPORTANT: Add any local development origins if you test your frontend locally
  // For example, if your React/Vue dev server runs on:
  // 'http://localhost:3000',
  // 'http://localhost:5173',
  // 'http://127.0.0.1:3000', // Common for local development
  // etc.
  // Make sure to match the exact protocol (http/https) and port.
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like from Postman, curl, or mobile apps)
    // or if the origin is explicitly in our allowed list.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocking request from unauthorized origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Specify the HTTP methods your frontend uses
  credentials: true, // Set to true if your frontend sends cookies or Authorization headers
  optionsSuccessStatus: 204 // Standard for preflight success
}));
// --- END OF EXPLICIT CORS CONFIGURATION ---

// Middleware for parsing JSON request bodies
app.use(express.json({ limit: '10mb' })); // Ensure this limit is sufficient for your image data

// Simple test route
app.get('/', (req, res) => {
  res.json({ 
    status: 'MTG Claude Proxy is running',
    version: '1.0.2', // Updated version to track changes
    timestamp: new Date().toISOString()
  });
});

// Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
  try {
    console.log('🧠 Received Claude API request on proxy');
    
    // Check for Claude API key
    const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!claudeApiKey) {
      console.error('❌ Claude API key not configured in environment variables.');
      return res.status(500).json({ error: 'Server configuration error: Claude API key missing.' });
    }

    // THIS IS THE CORRECT ANTHROPIC API URL
    const anthropicApiUrl = 'https://api.anthropic.com/v1/messages';
    
    // Forward request to Claude API
    const response = await fetch(anthropicApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01' // Standard Anthropic API version
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorBody = await response.text(); // Read error response to get more details
      console.error(`❌ Claude API error (${response.status} ${response.statusText}): ${errorBody}`);
      return res.status(response.status).json({ 
        error: `Claude API responded with error: ${response.statusText}`,
        details: errorBody 
      });
    }
    
    const data = await response.json();
    console.log('✅ Claude API response successfully forwarded.');
    
    res.json(data);
    
  } catch (err) {
    console.error('❌ Claude proxy error caught:', err.message);
    res.status(500).json({ 
      error: 'Internal server error from Claude proxy',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(port, () => {
  console.log(`🚂 MTG Claude Proxy running on port ${port}`);
  // In a production environment, avoid logging sensitive keys directly.
  // console.log(`🔑 Claude API Key: ${process.env.CLAUDE_API_KEY ? 'Present' : 'Missing'}`);
});

// For Vercel or serverless deployments, you might export the app
// module.exports = app; 
