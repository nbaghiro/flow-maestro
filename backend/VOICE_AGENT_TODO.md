# Voice Agent Implementation - Required Dependencies

## 📦 Missing Dependencies

The voice agent service is structurally complete but requires additional npm packages to function. Add these to `backend/package.json`:

```bash
# LiveKit SDKs
npm install livekit-client
npm install livekit-server-sdk

# Speech-to-Text
npm install @deepgram/sdk

# Audio Processing (Node.js doesn't have native AudioContext)
npm install node-web-audio-api
npm install node-webrtc

# Optional: Better audio handling
npm install @discordjs/opus
npm install sodium-native
```

## 🔧 Implementation Notes

### Current Status
✅ Service structure created
✅ VoiceAgent class with full pipeline
✅ DeepgramSTT service
✅ ElevenLabsTTS service
✅ VoiceActivityDetector
✅ Worker with Redis integration
✅ Command handling architecture

❌ Missing Node.js audio libraries (see above)
❌ Not yet tested with actual audio

### Key Challenge: Audio in Node.js

Node.js doesn't have native browser APIs like:
- `AudioContext`
- `MediaStream`
- `AudioBuffer`
- `ScriptProcessorNode`

**Solutions:**
1. Use `node-web-audio-api` - Polyfill for Web Audio API
2. Use `node-webrtc` - WebRTC implementation for Node.js
3. Use `@discordjs/opus` - Audio encoding/decoding
4. Or switch to Python (`livekit-agents` has these built-in)

## 🐍 Alternative: Python Implementation

If TypeScript audio handling proves too complex, the Python approach is more mature:

```python
# Python has better audio support via livekit-agents
pip install livekit-agents
pip install livekit-plugins-deepgram
pip install livekit-plugins-elevenlabs

# The pipeline is much simpler:
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import deepgram, elevenlabs

async def entrypoint(ctx: JobContext):
    async with VoiceAssistant(
        stt=deepgram.STT(),
        tts=elevenlabs.TTS(),
        # ... rest is handled automatically
    ) as assistant:
        assistant.start(ctx.room)
```

## 🚀 Quick Start (After Installing Dependencies)

1. Install dependencies:
```bash
cd backend
npm install livekit-client livekit-server-sdk @deepgram/sdk node-web-audio-api node-webrtc
```

2. Configure environment variables in `.env`:
```bash
# LiveKit
LIVEKIT_WS_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Voice Providers
DEEPGRAM_API_KEY=your-deepgram-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Redis (already configured)
REDIS_URL=redis://localhost:6379
```

3. Run the voice agent worker:
```bash
npm run worker:voice:dev
```

## 📝 Testing Checklist

After installing dependencies:

- [ ] Worker starts without errors
- [ ] Can connect to LiveKit server
- [ ] Can generate access tokens
- [ ] Redis subscription works
- [ ] AudioContext initializes (with polyfill)
- [ ] Deepgram connection works
- [ ] ElevenLabs TTS works
- [ ] VAD detects speech
- [ ] Commands flow correctly
- [ ] Responses are sent back

## 🔍 Debugging

If you encounter issues:

1. **LiveKit Connection Failed**
   - Check LIVEKIT_WS_URL is correct
   - Verify API key/secret
   - Test with LiveKit web client first

2. **AudioContext Errors**
   - Ensure node-web-audio-api is installed
   - Check polyfill is loaded correctly
   - Consider using @discordjs/voice instead

3. **Deepgram Connection Issues**
   - Verify API key
   - Check network connectivity
   - Test with Deepgram REST API first

4. **TTS Not Working**
   - Check ElevenLabs/OpenAI API key
   - Test API directly with curl
   - Verify audio format compatibility

## 💡 Recommendations

**For MVP/Testing:**
- Use TypeScript implementation with mocked audio
- Test command flow without real audio
- Validate architecture and integration

**For Production:**
- Consider Python implementation (more mature)
- Or invest in proper TypeScript audio setup
- Implement comprehensive error handling
- Add monitoring and alerting

## 📚 Resources

- LiveKit Docs: https://docs.livekit.io/
- LiveKit Agents (Python): https://github.com/livekit/agents
- Deepgram Docs: https://developers.deepgram.com/
- ElevenLabs Docs: https://docs.elevenlabs.io/
- node-webrtc: https://github.com/node-webrtc/node-webrtc
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
