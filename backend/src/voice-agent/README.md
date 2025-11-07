# Voice Agent Service (TypeScript)

This is the LiveKit voice agent service implemented in TypeScript. It handles real-time voice calls by connecting to LiveKit rooms and managing the voice pipeline (STT → Processing → TTS).

## Architecture

```
┌─────────────────────────────────────────────┐
│           Voice Agent Worker                │
│                                             │
│  ┌─────────────┐      ┌─────────────┐       │
│  │   Room 1    │      │   Room 2    │       │
│  │  VoiceAgent │      │  VoiceAgent │       │
│  └─────────────┘      └─────────────┘       │
│         │                     │             │
│         └──────────┬──────────┘             │
│                    │                        │
│              ┌─────▼──────┐                 │
│              │  Services  │                 │
│              ├────────────┤                 │
│              │    STT     │ Deepgram        │
│              │    TTS     │ ElevenLabs      │
│              │    VAD     │ Energy-based    │
│              └────────────┘                 │
└─────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
   LiveKit Rooms          Redis Commands
```

## Components

### 1. VoiceAgent (`VoiceAgent.ts`)

- Manages a single phone call session
- Connects to LiveKit room as a participant
- Handles voice pipeline: audio input → VAD → STT → processing → TTS → audio output
- Listens for commands from backend (speak, listen, menu, hangup)
- Sends responses back via Redis

### 2. Worker (`worker.ts`)

- Main process that runs continuously
- Listens for new room creation events via Redis
- Spawns a VoiceAgent for each new call
- Manages agent lifecycle

### 3. Services

#### DeepgramSTT (`services/DeepgramSTT.ts`)

- Streaming speech-to-text using Deepgram API
- Real-time transcription with interim and final results
- Configurable language, model, and options

#### ElevenLabsTTS (`services/ElevenLabsTTS.ts`)

- High-quality text-to-speech synthesis
- Supports ElevenLabs and OpenAI TTS
- Streaming audio generation

#### VoiceActivityDetector (`services/VoiceActivityDetector.ts`)

- Detects when user starts/stops speaking
- Energy-based VAD with configurable thresholds
- Emits speech-start and speech-end events

## ⚠️ Important Limitations

This TypeScript implementation requires additional setup for production use:

### 1. Audio Processing in Node.js

Node.js doesn't have native browser AudioContext. You'll need:

```bash
npm install node-web-audio-api
# or
npm install @discordjs/opus
npm install node-webrtc
```

### 2. LiveKit Server SDK

For proper token generation and server-side operations:

```bash
npm install livekit-server-sdk
```

### 3. MediaStream Support

Node.js doesn't have native MediaStream. Options:

- Use `node-webrtc` for WebRTC in Node.js
- Use `wrtc` package
- Consider Python implementation for better WebRTC support

### 4. Audio Encoding/Decoding

For proper audio handling:

```bash
npm install @discordjs/voice
npm install sodium-native  # For encryption
```

## Installation

```bash
# Install additional dependencies
npm install livekit-client livekit-server-sdk
npm install @deepgram/sdk
npm install axios
npm install node-web-audio-api  # For AudioContext
npm install node-webrtc         # For WebRTC
```

## Configuration

Add to `.env`:

```bash
# LiveKit
LIVEKIT_WS_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Voice Providers
DEEPGRAM_API_KEY=your-deepgram-key
ELEVENLABS_API_KEY=your-elevenlabs-key
OPENAI_API_KEY=your-openai-key  # For OpenAI TTS

# Redis
REDIS_URL=redis://localhost:6379
```

## Running the Worker

```bash
# Development
npm run worker:voice:dev

# Production
npm run build
npm run worker:voice
```

Add to `package.json`:

```json
{
    "scripts": {
        "worker:voice": "node dist/voice-agent/worker.js",
        "worker:voice:dev": "tsx src/voice-agent/worker.ts",
        "worker:voice:watch": "tsx watch src/voice-agent/worker.ts"
    }
}
```

## Alternative: Python Implementation

If you encounter too many limitations with TypeScript/Node.js audio handling, consider a hybrid approach:

**Option 1: Pure Python Agent**

- Use `livekit-agents` (official framework)
- Built-in STT/TTS/VAD plugins
- Better WebRTC support
- Example: https://github.com/livekit/agents

**Option 2: Hybrid Approach**

- TypeScript for business logic (commands, state management)
- Python microservice for audio processing
- Communicate via Redis or HTTP

**Option 3: Containerized Python Service**

- Docker container with Python agent
- Managed by your Node.js backend
- Isolated audio processing

## Production Considerations

### 1. Audio Quality

- Implement proper audio buffering
- Handle network jitter
- Echo cancellation
- Noise reduction

### 2. Scaling

- Multiple worker processes
- Load balancing across workers
- Health checks and auto-restart
- Graceful shutdown

### 3. Error Handling

- Retry logic for API calls
- Fallback TTS/STT providers
- Network failure recovery
- Call state persistence

### 4. Monitoring

- Call quality metrics
- STT/TTS latency
- Error rates
- Active call count

### 5. Security

- Secure token generation
- API key rotation
- Rate limiting
- Input validation

## Testing

```bash
# Test with mock room
npm run test:voice-agent

# Test individual components
npm run test:stt
npm run test:tts
npm run test:vad
```

## Debugging

Enable debug logs:

```bash
DEBUG=voice-agent:* npm run worker:voice:dev
```

## Known Issues

1. **AudioContext in Node.js**: Requires polyfill or alternative
2. **MediaStream**: Not native to Node.js, needs WebRTC library
3. **Audio Playback**: Complex in server environment
4. **Real-time Processing**: May have higher latency than Python

## Recommended Path Forward

### Short-term (Get it working)

1. Install required Node.js audio libraries
2. Test with simple audio files
3. Implement mock STT/TTS for testing
4. Verify Redis command bus works

### Medium-term (Production-ready)

1. Add proper audio handling
2. Implement full WebRTC support
3. Add comprehensive error handling
4. Performance optimization

### Long-term (Scale)

1. Consider Python for production
2. Or use hybrid TypeScript/Python approach
3. Add monitoring and alerting
4. Implement auto-scaling

## Support

For questions or issues:

1. Check LiveKit docs: https://docs.livekit.io/
2. Deepgram docs: https://developers.deepgram.com/
3. ElevenLabs docs: https://docs.elevenlabs.io/

## License

Part of FlowMaestro - see main LICENSE file
