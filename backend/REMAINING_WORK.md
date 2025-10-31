# Voice Calls Implementation - Remaining Work

## ✅ Completed Components (75%)

### Backend Infrastructure (100%)
- ✅ Database schema for call executions, transcripts, and events
- ✅ Type definitions for all call-related models
- ✅ CallExecutionRepository with full CRUD operations
- ✅ Telnyx webhook handler for call lifecycle events
- ✅ Business hours validation logic
- ✅ Redis pub/sub command bus for agent communication
- ✅ Voice node executors (greet, listen, menu, hangup)
- ✅ WebSocket event integration for real-time updates
- ✅ Event emitter convenience methods

### Voice Agent Service (100%)
- ✅ VoiceAgent class with full pipeline orchestration
- ✅ DeepgramSTT service for streaming speech-to-text
- ✅ ElevenLabsTTS service for high-quality voice synthesis
- ✅ VoiceActivityDetector for speech/silence detection
- ✅ Worker process with Redis event subscription
- ✅ LiveKit room connection and management
- ✅ Command handling (speak, listen, menu, hangup)
- ✅ Interruption handling and barge-in support
- ✅ npm scripts for running voice worker
- ✅ Dependencies installed (livekit, deepgram, audio libs)

---

## 🚧 Remaining Work (25%)

### 1. Voice Agent Testing & Integration (Critical)

#### 1.1 Audio Library Integration Testing
**Priority**: HIGH
**Estimated Time**: 4-6 hours

**Tasks**:
- [ ] Test AudioContext polyfill in Node.js environment
- [ ] Verify MediaStream handling with node-webrtc
- [ ] Test audio encoding/decoding with @discordjs/opus
- [ ] Validate audio buffer processing in VAD
- [ ] Test TTS audio playback through LiveKit
- [ ] Verify STT audio streaming to Deepgram

**Potential Issues**:
- `node-webrtc` shows engine compatibility warning (Node v22 vs v0.6)
- May need alternative WebRTC library or downgrade Node version
- AudioContext polyfill may have limited feature support
- Real-time audio processing latency needs measurement

**Fallback Options**:
1. Use `@discordjs/voice` instead of node-webrtc
2. Implement Python voice agent as separate microservice
3. Use pre-recorded audio files for testing before live audio

#### 1.2 End-to-End Call Testing
**Priority**: HIGH
**Estimated Time**: 6-8 hours

**Tasks**:
- [ ] Set up LiveKit server (cloud or local)
- [ ] Configure Telnyx SIP trunk with LiveKit
- [ ] Create test phone numbers in Telnyx
- [ ] Test incoming call flow: Telnyx → LiveKit → Agent
- [ ] Test outgoing call flow (if needed)
- [ ] Verify call recording functionality
- [ ] Test call hangup scenarios (caller, agent, error)
- [ ] Validate transcript accuracy and timing
- [ ] Test business hours validation
- [ ] Test multiple concurrent calls

**Required Resources**:
- LiveKit Cloud account or self-hosted server
- Telnyx account with SIP trunking enabled
- Test phone number
- Deepgram API credits
- ElevenLabs API credits

#### 1.3 Error Handling & Resilience
**Priority**: MEDIUM
**Estimated Time**: 4-6 hours

**Tasks**:
- [ ] Add retry logic for API failures (Deepgram, ElevenLabs)
- [ ] Handle LiveKit disconnections gracefully
- [ ] Implement fallback TTS/STT providers
- [ ] Add call timeout handling
- [ ] Handle agent crashes (auto-restart)
- [ ] Implement proper logging and monitoring
- [ ] Add health checks for voice worker
- [ ] Test network failure recovery

---

### 2. Frontend Implementation (25% of total project)

#### 2.1 Phone Call Trigger UI
**Priority**: HIGH
**Estimated Time**: 8-10 hours

**Components to Create**:

```
frontend/src/components/triggers/
├── PhoneCallTriggerForm.tsx       # Main form for phone call trigger
├── PhoneNumberInput.tsx           # E.164 formatted phone input
├── BusinessHoursSchedule.tsx      # Weekly schedule editor
└── VoiceSettings.tsx              # Voice provider, language, etc.
```

**Features**:
- [ ] Phone number input with E.164 validation
- [ ] Telnyx connection selector (from credentials)
- [ ] Greeting message editor with variable interpolation
- [ ] Business hours schedule editor (per-day time ranges)
- [ ] Voice provider selection (ElevenLabs, OpenAI)
- [ ] Voice ID picker with preview
- [ ] STT provider selection (Deepgram, OpenAI)
- [ ] Language selection
- [ ] Call recording toggle
- [ ] Max call duration setting
- [ ] Timeout settings for menu/listen nodes

**Integration Points**:
- Create/update trigger via API
- Fetch available Telnyx connections
- Validate phone number format
- Preview greeting message with TTS

#### 2.2 Voice Node Types for Workflow Canvas
**Priority**: HIGH
**Estimated Time**: 10-12 hours

**Nodes to Implement**:

```typescript
// Voice node types to add to canvas registry
interface VoiceNodeTypes {
    voice_greet: {
        label: "Say Message";
        icon: "🗣️";
        color: "#8B5CF6";
        inputs: ["previous"];
        outputs: ["next"];
        config: VoiceGreetNodeConfig;
    };
    voice_listen: {
        label: "Listen";
        icon: "🎤";
        color: "#EC4899";
        inputs: ["previous"];
        outputs: ["next"];
        config: VoiceListenNodeConfig;
    };
    voice_menu: {
        label: "Menu";
        icon: "📋";
        color: "#F59E0B";
        inputs: ["previous"];
        outputs: string[];  // Dynamic per option
        config: VoiceMenuNodeConfig;
    };
    voice_hangup: {
        label: "Hang Up";
        icon: "📞";
        color: "#EF4444";
        inputs: ["previous"];
        outputs: [];
        config: VoiceHangupNodeConfig;
    };
}
```

**Files to Create/Modify**:

```
frontend/src/components/canvas/nodes/
├── VoiceGreetNode.tsx           # Say message node
├── VoiceListenNode.tsx          # Listen for speech node
├── VoiceMenuNode.tsx            # IVR menu node
└── VoiceHangupNode.tsx          # Hang up node

frontend/src/components/canvas/config-panels/
├── VoiceGreetConfigPanel.tsx   # Message, voice settings
├── VoiceListenConfigPanel.tsx  # Max duration, language
├── VoiceMenuConfigPanel.tsx    # Options, retry logic
└── VoiceHangupConfigPanel.tsx  # Farewell message

frontend/src/lib/
├── nodeRegistry.ts              # Register voice nodes
└── nodeValidation.ts            # Validate voice node configs
```

**Tasks**:
- [ ] Create voice node components with proper styling
- [ ] Implement config panels for each node type
- [ ] Add voice nodes to node palette/sidebar
- [ ] Implement node validation (required fields)
- [ ] Add variable interpolation UI for text fields
- [ ] Implement voice preview for TTS messages
- [ ] Add multi-output support for menu nodes
- [ ] Implement node documentation/help text
- [ ] Add node testing mode (mock responses)

#### 2.3 Live Call Monitoring Dashboard
**Priority**: MEDIUM
**Estimated Time**: 12-15 hours

**Components to Create**:

```
frontend/src/pages/
└── CallMonitoringPage.tsx       # Main monitoring page

frontend/src/components/calls/
├── ActiveCallsList.tsx          # List of active calls
├── CallDetailsPanel.tsx         # Single call detail view
├── LiveTranscriptView.tsx       # Real-time transcript
├── CallHistoryTable.tsx         # Past calls table
├── CallStatsWidget.tsx          # Call statistics
└── CallRecordingPlayer.tsx      # Audio playback
```

**Features**:
- [ ] Real-time list of active calls
- [ ] Live transcript with speaker labels (user/agent)
- [ ] Call status indicators (ringing, active, completed)
- [ ] Call duration timer
- [ ] Current workflow node indicator
- [ ] Call history table with filters
- [ ] Call recording playback
- [ ] Call statistics (avg duration, success rate, etc.)
- [ ] Export call data (CSV, JSON)
- [ ] Search/filter calls by number, date, status

**WebSocket Integration**:
- [ ] Subscribe to call:* events
- [ ] Handle call:transcript events for live updates
- [ ] Handle call:incoming, call:active, call:ended
- [ ] Update UI state based on events
- [ ] Show notifications for new calls

#### 2.4 Telnyx Connection Management UI
**Priority**: MEDIUM
**Estimated Time**: 4-6 hours

**Tasks**:
- [ ] Add Telnyx to connection type dropdown
- [ ] Create Telnyx credentials form (API key, SIP settings)
- [ ] Test connection functionality
- [ ] Display available phone numbers
- [ ] Show SIP trunk status
- [ ] Add webhook URL configuration guide

**Integration**:
- [ ] Add Telnyx to `shared/src/types.ts` ConnectionType
- [ ] Create credential storage in database
- [ ] Add Telnyx API client to backend
- [ ] Implement phone number listing endpoint

---

### 3. Documentation & Deployment

#### 3.1 User Documentation
**Priority**: MEDIUM
**Estimated Time**: 4-6 hours

**Documents to Create**:
- [ ] User guide: Setting up phone call triggers
- [ ] Tutorial: Building a simple IVR workflow
- [ ] Tutorial: Voice-powered customer support workflow
- [ ] FAQ: Common issues and troubleshooting
- [ ] Video walkthrough of phone call features

#### 3.2 Developer Documentation
**Priority**: LOW
**Estimated Time**: 3-4 hours

**Tasks**:
- [ ] Document voice agent architecture
- [ ] API documentation for voice endpoints
- [ ] WebSocket event documentation
- [ ] Guide for adding new voice providers
- [ ] Guide for custom voice node types
- [ ] Performance tuning guide

#### 3.3 Deployment Configuration
**Priority**: HIGH
**Estimated Time**: 6-8 hours

**Tasks**:
- [ ] Add voice worker to Docker Compose
- [ ] Create production Dockerfile for voice agent
- [ ] Add environment variables documentation
- [ ] Configure LiveKit server (cloud or self-hosted)
- [ ] Set up Telnyx webhook endpoints
- [ ] Configure Redis for production
- [ ] Add monitoring and alerting
- [ ] Set up log aggregation for voice worker
- [ ] Create deployment guide
- [ ] Test production deployment

**Environment Variables Needed**:
```bash
# LiveKit
LIVEKIT_WS_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Telnyx
TELNYX_API_KEY=your-telnyx-key
TELNYX_PUBLIC_KEY=your-public-key  # For webhook verification

# Voice Providers
DEEPGRAM_API_KEY=your-deepgram-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Redis (already configured)
REDIS_URL=redis://localhost:6379
```

---

### 4. Performance & Optimization

#### 4.1 Audio Processing Optimization
**Priority**: LOW
**Estimated Time**: 4-6 hours

**Tasks**:
- [ ] Profile audio processing pipeline
- [ ] Optimize VAD energy calculation
- [ ] Implement audio buffer pooling
- [ ] Add audio compression for storage
- [ ] Optimize WebRTC connection settings
- [ ] Reduce STT/TTS latency

#### 4.2 Scaling Considerations
**Priority**: LOW
**Estimated Time**: 6-8 hours

**Tasks**:
- [ ] Implement horizontal scaling for voice workers
- [ ] Add load balancing across workers
- [ ] Implement call distribution strategy
- [ ] Add worker health monitoring
- [ ] Test with concurrent calls (10, 50, 100+)
- [ ] Optimize Redis pub/sub performance
- [ ] Add call queue management
- [ ] Implement rate limiting

---

### 5. Security & Compliance

#### 5.1 Security Hardening
**Priority**: HIGH
**Estimated Time**: 4-6 hours

**Tasks**:
- [ ] Verify Telnyx webhook signatures
- [ ] Implement caller ID spoofing protection
- [ ] Add rate limiting for phone numbers
- [ ] Sanitize call recordings (PCI/PII)
- [ ] Add encryption for stored recordings
- [ ] Implement access controls for call data
- [ ] Add audit logging for sensitive operations
- [ ] Test for injection vulnerabilities

#### 5.2 Compliance
**Priority**: MEDIUM
**Estimated Time**: 3-4 hours

**Tasks**:
- [ ] Add call recording consent message
- [ ] Implement GDPR data deletion
- [ ] Add call data retention policies
- [ ] Document TCPA compliance requirements
- [ ] Add opt-out/DNC list support
- [ ] Implement caller consent tracking

---

## 📋 Implementation Priorities

### Phase 1: Critical Path (Week 1)
1. Voice agent audio library testing and integration
2. End-to-end call flow testing with real phone
3. Phone call trigger UI implementation
4. Voice node types for workflow canvas

### Phase 2: Core Features (Week 2)
1. Live call monitoring dashboard
2. Telnyx connection management UI
3. Error handling and resilience
4. Security hardening

### Phase 3: Polish & Deploy (Week 3)
1. Performance optimization
2. User documentation
3. Deployment configuration
4. Production testing

---

## 🔍 Known Issues & Risks

### High Risk
1. **node-webrtc Compatibility**: Engine warning with Node v22
   - **Mitigation**: Test with @discordjs/voice or Python fallback

2. **Audio Latency**: Real-time processing may have delays
   - **Mitigation**: Profile and optimize, use faster STT/TTS models

3. **LiveKit Setup**: Requires external service or self-hosting
   - **Mitigation**: Document both cloud and self-hosted options

### Medium Risk
1. **API Rate Limits**: Deepgram/ElevenLabs may have limits
   - **Mitigation**: Implement caching, fallback providers

2. **Concurrent Call Limits**: May need scaling strategy
   - **Mitigation**: Load testing, horizontal scaling

### Low Risk
1. **TypeScript Audio APIs**: Less mature than Python
   - **Mitigation**: Already built, can iterate or replace

---

## 🎯 Success Criteria

### Minimum Viable Product (MVP)
- [ ] Can receive incoming call from Telnyx
- [ ] Agent joins LiveKit room automatically
- [ ] Can play TTS greeting to caller
- [ ] Can capture user speech via STT
- [ ] Can present IVR menu with options
- [ ] Can execute workflow based on menu choice
- [ ] Can hang up call gracefully
- [ ] Frontend shows live call status
- [ ] Frontend shows call transcripts in real-time

### Production Ready
- [ ] All MVP criteria met
- [ ] Handles 10+ concurrent calls
- [ ] 99%+ call connection success rate
- [ ] &lt;2 second STT latency
- [ ] &lt;1 second TTS latency
- [ ] Error recovery works reliably
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Deployed and monitored

---

## 📚 Resources

### Services to Set Up
- **LiveKit**: https://livekit.io/ (Cloud or self-hosted)
- **Telnyx**: https://telnyx.com/ (Phone numbers, SIP trunk)
- **Deepgram**: https://deepgram.com/ (STT credits)
- **ElevenLabs**: https://elevenlabs.io/ (TTS credits)

### Development Tools
- **LiveKit CLI**: For local testing
- **ngrok/localtunnel**: For webhook testing
- **Postman/Insomnia**: For API testing
- **Audio test files**: For agent testing

### Estimated Total Time
- **Testing & Integration**: 14-20 hours
- **Frontend Implementation**: 34-43 hours
- **Documentation & Deployment**: 13-18 hours
- **Performance & Security**: 17-24 hours

**Total**: 78-105 hours (2-3 weeks for 1 developer)

---

## 🚀 Quick Start for Testing

### 1. Start Voice Worker
```bash
cd backend
npm run worker:voice:dev
```

### 2. Set Up Environment Variables
```bash
# Add to backend/.env
LIVEKIT_WS_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
DEEPGRAM_API_KEY=your-key
ELEVENLABS_API_KEY=your-key
```

### 3. Test with Mock Room
```bash
# Create test script in backend/tests/voice/
tsx tests/voice/mock-call.ts
```

### 4. Configure Telnyx Webhook
```
Webhook URL: https://your-domain.com/api/triggers/phone-call
Events: call.initiated, call.answered, call.hangup
```

### 5. Make Test Call
```
Call your Telnyx number and monitor logs
```

---

## 💡 Recommendations

### For Fastest MVP
1. **Skip audio testing initially**: Use mock responses in voice executors
2. **Test workflow logic first**: Validate command flow without real audio
3. **Use Python for production**: If TypeScript audio proves too complex
4. **Start with cloud LiveKit**: Faster than self-hosting

### For Production Quality
1. **Invest in proper audio setup**: Test thoroughly with real calls
2. **Implement comprehensive monitoring**: Track call quality metrics
3. **Add robust error handling**: Graceful failures and retries
4. **Scale horizontally**: Multiple workers with load balancing

### For Best User Experience
1. **Real-time UI updates**: WebSocket events for live monitoring
2. **Clear error messages**: Help users debug call issues
3. **Voice previews**: Let users hear TTS before using in workflows
4. **Call testing mode**: Test workflows without making real calls
