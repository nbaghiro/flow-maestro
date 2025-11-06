# Voice Calls with LiveKit + Telnyx: Comprehensive Overview

## Table of Contents
1. Architecture Overview
2. Call Flow: Step-by-Step
3. Component Responsibilities
4. Data Flow & State Management
5. Real-Time Communication Patterns
6. Error Handling & Edge Cases
7. Integration Points with FlowMaestro
8. Deployment Architecture

---

## 1. Architecture Overview

### High-Level Architecture

The voice call system is built on three primary layers:

**Layer 1: Telephony (Telnyx)**
- Handles PSTN (Public Switched Telephone Network) connectivity
- Manages phone number provisioning and routing
- Converts traditional phone calls into SIP (Session Initiation Protocol) traffic
- Provides webhook notifications for call events

**Layer 2: Real-Time Media (LiveKit)**
- Bridges SIP traffic to WebRTC
- Manages real-time audio streaming with low latency
- Handles room creation and participant management
- Provides quality of service (QoS) features: adaptive bitrate, echo cancellation, noise suppression

**Layer 3: AI Voice Pipeline (LiveKit Agents)**
- Orchestrates the STT → LLM → TTS pipeline
- Manages voice activity detection (VAD)
- Handles interruptions and barge-in
- Integrates with FlowMaestro workflows

**Layer 4: Workflow Orchestration (FlowMaestro + Temporal)**
- Executes workflow definitions
- Manages durable state across call lifecycle
- Handles business logic and integrations
- Provides real-time updates to frontend

### Why This Architecture?

**Separation of Concerns**: Each layer handles its domain expertise
- Telnyx: Telecom/PSTN connectivity and compliance
- LiveKit: Real-time media streaming and WebRTC
- Agents: AI pipeline orchestration
- FlowMaestro: Business logic and workflow execution

**Scalability**: Each layer can scale independently based on its bottlenecks

**Reliability**: Failures in one layer don't cascade to others

**Flexibility**: Can swap providers (Telnyx → Twilio) or AI services without rewriting the entire stack

---

## 2. Call Flow: Step-by-Step

### Phase 1: Call Initiation (0-500ms)

**Step 1: Incoming Call Arrives**
```
User dials +1-555-123-4567 → PSTN → Telnyx Network
```
- Call hits Telnyx's SIP trunk
- Telnyx identifies the destination number
- Looks up webhook URL configured for that number

**Step 2: Webhook Notification**
```
Telnyx → HTTP POST → FlowMaestro API (/api/webhooks/phone-call)
```
Webhook payload includes:
- `call_sid`: Unique call identifier
- `from`: Caller's phone number (E.164 format: +15551234567)
- `to`: Destination number (our FlowMaestro number)
- `call_status`: "ringing" or "initiated"
- `direction`: "inbound"
- Caller metadata: location, carrier info

**Step 3: FlowMaestro Processes Webhook**
```
Webhook Handler:
1. Validate webhook signature (security)
2. Look up trigger by phone number in database
3. Find associated workflow definition
4. Create call_execution record in database
5. Generate unique LiveKit room name (e.g., "call-CA123abc")
6. Return SIP redirect response to Telnyx
```

**Step 4: Telnyx Bridges Call to LiveKit**
```
FlowMaestro returns XML response:
<Response>
  <Dial>
    <Sip>sip:call-CA123abc@sip.livekit.io</Sip>
  </Dial>
</Response>
```
- Telnyx establishes SIP connection to LiveKit
- Audio from phone call now flows to LiveKit as RTP packets
- Caller hears ringing or hold music

### Phase 2: Agent Initialization (500-1000ms)

**Step 5: LiveKit Room Created**
```
LiveKit Server:
1. Receives SIP INVITE from Telnyx
2. Creates new room: "call-CA123abc"
3. Adds SIP participant (represents the phone caller)
4. Converts SIP/RTP audio to WebRTC
5. Waits for agent to join
```

**Step 6: Agent Worker Dispatched**
```
LiveKit Agent Pool:
1. LiveKit Server notifies available workers (via WebSocket)
2. Worker with lowest load accepts the job
3. Worker spawns new Agent instance for this room
4. Agent joins room as second participant
```

**Step 7: Agent Initializes Voice Pipeline**
```
Voice Pipeline Components:
1. VAD (Voice Activity Detection): Listens for when user speaks
2. STT (Speech-to-Text): Deepgram streaming transcription
3. LLM (Optional): OpenAI for conversational AI
4. TTS (Text-to-Speech): ElevenLabs for voice output
5. Audio Mixer: Combines TTS with background audio if needed
```

**Step 8: Agent Fetches Workflow Context**
```
Agent → FlowMaestro API:
GET /api/internal/call-context/{call_execution_id}

Response:
{
  "workflow_definition": { nodes, edges },
  "trigger_config": { greeting_message, language, max_duration },
  "variables": { caller_name, account_id, etc. }
}
```

### Phase 3: Initial Greeting (1000-2000ms)

**Step 9: First Node Execution**
```
Agent starts Temporal workflow execution:
- Workflow type: "triggeredWorkflow"
- Input: call_execution_id, workflow_definition
- Temporal schedules first activity
```

**Step 10: Execute voice_greet Node**
```
Activity: executeVoiceGreet
1. Read config: { message: "Hello ${caller_name}!" }
2. Interpolate variables: "Hello John!"
3. Send to TTS: ElevenLabs.synthesize(text, voice="rachel")
4. Stream audio chunks back (50ms latency per chunk)
5. Agent plays audio to LiveKit room
6. SIP bridge sends audio to Telnyx
7. User hears greeting on their phone
```

**Timeline**:
- T+0ms: TTS request sent
- T+50ms: First audio chunk received
- T+50ms: User hears first word
- T+2000ms: Full greeting completed

### Phase 4: Interactive Conversation (Variable Duration)

**Step 11: Execute voice_listen Node**
```
Activity: executeVoiceListen
1. Agent enables listening mode
2. VAD monitors audio input from user
3. When speech detected → STT starts transcribing
4. Streaming transcription (partial results every 100ms)
5. VAD detects end of speech (500ms silence)
6. Final transcript returned: "I need to check my account balance"
7. Stored in workflow context: variables.userInput
```

**Concurrent Processes**:
- **Audio Input**: Phone → Telnyx → LiveKit → Agent → Deepgram STT
- **Partial Results**: Deepgram → Agent → FlowMaestro (for real-time display)
- **VAD**: Continuously analyzing audio energy and speech patterns

**Step 12: Execute LLM Node (if present)**
```
Activity: executeLLM
1. Read prompt template: "User said: ${userInput}. Respond helpfully."
2. Interpolate: "User said: I need to check my account balance. Respond helpfully."
3. Call OpenAI API
4. Response: "I can help you with that. Let me look up your account balance."
5. Store in variables.llmOutput
```

**Step 13: Execute voice_speak Node**
```
Activity: executeVoiceSpeak
1. Read config: { message: "${llmOutput}", interruptible: true }
2. Send to TTS
3. Begin streaming audio playback
4. VAD still monitoring for interruptions
5. If user speaks → interrupt TTS, jump to listen mode
6. If completed → continue to next node
```

**Step 14: Database Query Node (example integration)**
```
Activity: executeDatabaseQuery
1. Query: "SELECT balance FROM accounts WHERE phone = ${caller_number}"
2. Result: { balance: 1234.56 }
3. Store in variables.account_balance
```

**Step 15: Dynamic Response**
```
Activity: executeVoiceSpeak
1. Message: "Your current balance is $${account_balance}"
2. TTS output: "Your current balance is $1234.56"
3. User hears response
```

### Phase 5: Call Termination (Variable)

**Step 16: Final Node**
```
Activity: executeVoiceHangup
1. Optional farewell message: "Thank you for calling. Goodbye!"
2. Play farewell via TTS
3. Wait for completion (2 seconds)
4. Send hangup command to LiveKit
```

**Step 17: LiveKit Cleanup**
```
LiveKit:
1. Agent leaves room
2. SIP participant receives BYE message
3. Room marked for deletion (30 second grace period)
4. Recording finalized and uploaded to S3
```

**Step 18: Telnyx Terminates Call**
```
Telnyx:
1. Receives SIP BYE from LiveKit
2. Terminates PSTN call
3. Sends final webhook: call_status = "completed"
4. Includes final metrics: duration, cost, quality stats
```

**Step 19: FlowMaestro Finalizes Execution**
```
Temporal Activity: completeCallExecution
1. Update call_executions table:
   - call_status: "completed"
   - call_duration_seconds: 127
   - recording_url: "s3://bucket/calls/CA123.mp3"
   - transcript: { turns: [...] }
2. Update workflow_executions table:
   - status: "completed"
   - output: { final_variables }
3. Emit WebSocket event: "call:completed"
4. Frontend updates UI
```

---

## 3. Component Responsibilities

### Telnyx (SIP Provider)

**Core Responsibilities**:
- **Number Management**: Provision, port, and manage phone numbers
- **PSTN Gateway**: Bridge traditional phone network to SIP
- **Call Routing**: Route incoming calls to correct SIP endpoint
- **Compliance**: E911 service, CNAM (caller ID), STIR/SHAKEN authentication
- **Billing**: Track usage, provide CDRs (Call Detail Records)

**What Telnyx Does NOT Do**:
- AI/ML processing
- Real-time media manipulation
- Workflow orchestration
- Application logic

**Communication Patterns**:
- **Outbound**: SIP signaling (INVITE, BYE, ACK) + RTP media streams
- **Inbound**: HTTP webhooks for call events

### LiveKit (Media Server)

**Core Responsibilities**:
- **SIP Bridge**: Convert SIP/RTP to WebRTC
- **Room Management**: Create, manage, destroy call rooms
- **Media Routing**: Route audio between participants (SIP caller ↔ Agent)
- **Quality of Service**:
  - Adaptive bitrate
  - Forward Error Correction (FEC)
  - Jitter buffer management
  - Echo cancellation
  - Noise suppression
- **Recording**: Capture call audio to files

**What LiveKit Does NOT Do**:
- AI processing (transcription, TTS)
- Business logic
- Database operations
- Billing/metering

**Communication Patterns**:
- **SIP Side**: Receives RTP audio from Telnyx, sends RTP audio back
- **Agent Side**: WebRTC signaling + media streams
- **Control Plane**: WebSocket connection to agent workers

### LiveKit Agents (Voice Pipeline)

**Core Responsibilities**:
- **VAD (Voice Activity Detection)**: Detect when user is speaking vs. silence
- **STT Integration**: Stream audio to Deepgram/Whisper, receive transcripts
- **TTS Integration**: Send text to ElevenLabs, receive audio chunks
- **Pipeline Orchestration**: Coordinate STT → (optional LLM) → TTS flow
- **Interruption Handling**: Detect barge-in, stop TTS, switch to listening
- **FlowMaestro Integration**: Communicate workflow state and commands

**Agent Lifecycle**:
1. **Idle**: Worker registered, waiting for jobs
2. **Dispatched**: Assigned to new call room
3. **Initializing**: Joining room, setting up pipeline
4. **Active**: Executing workflow nodes
5. **Draining**: Call ended, cleaning up resources
6. **Terminated**: Worker can accept new job

**Communication Patterns**:
- **LiveKit Server**: WebSocket (signaling) + WebRTC (media)
- **FlowMaestro Backend**: HTTP REST API or Redis pub/sub
- **AI Services**: HTTP REST APIs (Deepgram, ElevenLabs, OpenAI)

### FlowMaestro Backend

**Core Responsibilities**:
- **Trigger Management**: Store and manage phone_call triggers
- **Workflow Orchestration**: Execute workflows via Temporal
- **State Management**: Track call executions, store transcripts
- **Business Logic**: Execute nodes (database queries, API calls, conditionals)
- **Real-Time Updates**: WebSocket events to frontend
- **Security**: Authentication, authorization, encryption

**Key Services**:
- **PhoneCallWebhookService**: Handle Telnyx webhooks
- **PhoneCallTriggerRepository**: CRUD for triggers
- **CallExecutionRepository**: Track call state
- **VoiceCommandBus**: Communicate with agents (via Redis)
- **Temporal Workers**: Execute activity node executors

### FlowMaestro Frontend

**Core Responsibilities**:
- **Trigger UI**: Create/edit phone call triggers
- **Workflow Canvas**: Design workflows with voice nodes
- **Live Monitoring**: Display active calls, transcripts
- **Call History**: Browse past calls, listen to recordings
- **Analytics**: Call metrics, success rates, duration

**Real-Time Features**:
- Live transcript display (updates as user speaks)
- Call status indicators (ringing, active, completed)
- Node execution progress
- Variable values updating

---

## 4. Data Flow & State Management

### State Storage Layers

**Layer 1: In-Memory (Agent)**
- Current audio buffers
- Partial transcription results
- TTS chunk queue
- VAD state

**Layer 2: Redis (Ephemeral State)**
- Active call sessions
- Voice command queue (FlowMaestro → Agent)
- Voice event stream (Agent → FlowMaestro)
- Pub/sub for real-time coordination

**Layer 3: PostgreSQL (Persistent State)**
- Workflow definitions
- Trigger configurations
- Call execution records
- Complete transcripts
- User data and variables

**Layer 4: Temporal (Workflow State)**
- Workflow execution history
- Activity state and retry counts
- Pending activities
- Timers and signals

**Layer 5: S3 (Blob Storage)**
- Call recordings (MP3/WAV)
- Audio chunks for debugging
- Long-term archive

### Communication Patterns

**Synchronous (Request/Response)**:
- Telnyx → FlowMaestro: Webhooks (HTTP POST)
- Agent → FlowMaestro API: Fetch workflow context (HTTP GET)
- FlowMaestro → AI Services: STT/TTS/LLM (HTTP POST)

**Asynchronous (Event-Driven)**:
- LiveKit → Agent Workers: Job dispatch (WebSocket)
- Agent → FlowMaestro: Voice events via Redis pub/sub
- FlowMaestro → Frontend: Real-time updates via WebSocket

**Streaming (Continuous)**:
- Phone → Telnyx → LiveKit: RTP audio stream
- LiveKit → Agent: WebRTC audio stream
- Agent → Deepgram: Audio chunks for STT
- ElevenLabs → Agent: TTS audio chunks
- Agent → LiveKit: TTS playback audio

### Variable Scope and Context

**Call-Level Context** (entire call duration):
```
{
  call_sid: "CA123abc",
  caller_number: "+15551234567",
  called_number: "+15559876543",
  call_started_at: "2025-01-15T10:30:00Z",
  language: "en-US",
  recording_enabled: true
}
```

**Workflow-Level Context** (workflow execution):
```
{
  workflow_id: "wf-456",
  execution_id: "exec-789",
  user_id: "user-123",
  variables: {
    userInput: "I need help",
    llmOutput: "How can I assist you?",
    account_balance: 1234.56,
    custom_data: {...}
  }
}
```

**Node-Level Context** (single node execution):
```
{
  node_id: "node-5",
  node_type: "voice_listen",
  config: { maxDuration: 30, endSilenceMs: 500 },
  started_at: "2025-01-15T10:30:15Z"
}
```

### Context Passing Flow

```
1. Webhook arrives → Create call_execution record
2. Agent fetches context → Load workflow + variables
3. Execute node → Temporal activity receives full context
4. Node updates variables → Context updated in Temporal
5. Next node receives updated context → Repeat
6. Call ends → Final context saved to database
```

---

## 5. Real-Time Communication Patterns

### Agent ↔ FlowMaestro Communication

**Pattern: Command Queue (Redis)**

FlowMaestro needs to send commands to agent:
```
FlowMaestro:
  Redis PUBLISH voice:commands:{call_execution_id}
  Payload: {
    type: "speak",
    text: "Hello!",
    voice: "rachel",
    request_id: "req-123"
  }

Agent:
  Redis SUBSCRIBE voice:commands:{call_execution_id}
  Receives command → Executes → Publishes result
  Redis PUBLISH voice:events:{call_execution_id}
  Payload: {
    type: "speak_complete",
    request_id: "req-123",
    duration_ms: 2000
  }
```

**Pattern: Event Stream (Redis)**

Agent publishes events as they happen:
```
Agent Events:
- call:agent_joined
- speech:started (user started speaking)
- speech:partial (intermediate transcript)
- speech:complete (final transcript)
- tts:started
- tts:chunk (audio chunk played)
- tts:complete
- tts:interrupted (user barged in)
- call:agent_left
- error:* (any error)

FlowMaestro subscribes and:
1. Updates database with events
2. Forwards to frontend via WebSocket
3. Triggers workflow logic based on events
```

### Frontend Real-Time Updates

**WebSocket Event Flow**:
```
Backend → Frontend Events:
- call:ringing { call_execution_id, caller_number }
- call:answered { call_execution_id, started_at }
- call:transcript_update { text, is_final, speaker }
- call:node_executing { node_id, node_type }
- call:variable_updated { key, value }
- call:completed { duration, status, recording_url }
```

**Frontend State Management**:
```
React Component:
useEffect(() => {
  websocket.on("call:transcript_update", (data) => {
    if (data.is_final) {
      setTranscript(prev => [...prev, data]);
    } else {
      setPartialTranscript(data.text);
    }
  });
}, []);
```

### Temporal Workflow Signals

**For Long-Running Interactions**:

Example: Call on hold while waiting for human agent
```
Workflow receives signal:
  await workflow.condition(() => humanAgentAvailable);

Activity sends signal from external service:
  temporalClient.workflow.signal(
    executionId,
    "humanAgentAvailable",
    { agentId: "agent-456" }
  );
```

**For User Input During Call**:
```
voice_wait_for_approval node:
1. Agent asks: "Should I proceed? Say yes or no."
2. Workflow waits for signal: await workflow.condition(() => userApproved !== null)
3. User says: "Yes"
4. Agent sets signal: workflow.signal("setUserApproval", true)
5. Workflow continues
```

---

## 6. Error Handling & Edge Cases

### Network-Level Issues

**Packet Loss (1-5%)**:
- **Detection**: LiveKit tracks packet loss metrics per participant
- **Recovery**: Opus codec with FEC reconstructs lost packets
- **Adaptation**: Reduce bitrate if loss > 3%
- **Alerting**: Log warning if sustained loss > 5%

**High Latency (>150ms)**:
- **Detection**: Monitor RTT (Round-Trip Time) via RTCP
- **Impact**: Causes cross-talk, unnatural conversation
- **Mitigation**: Adjust jitter buffer, use geographically closer LiveKit region
- **Escalation**: If latency >300ms, consider switching regions

**Network Disconnection**:
- **SIP Side**: Telnyx sends BYE, call ends
- **Agent Side**: LiveKit detects WebRTC disconnect, agent marks call as failed
- **Recovery**: No automatic recovery for phone calls (user must redial)
- **Cleanup**: Temporal workflow cancelled, resources released

### Audio Quality Issues

**Background Noise**:
- **Detection**: Analyze audio energy spectrum
- **Mitigation**: Enable LiveKit noise suppression filter
- **STT Adaptation**: Use Deepgram "diarize" mode to separate speakers
- **User Feedback**: If STT confidence <60%, ask user to repeat

**Echo**:
- **Cause**: Audio from agent's TTS feeding back into microphone
- **Prevention**: LiveKit echo cancellation enabled by default
- **Detection**: Acoustic echo canceller (AEC) metrics
- **Fallback**: Reduce TTS volume if echo detected

**Poor STT Recognition**:
- **Causes**: Accent, mumbling, background noise, poor connection
- **Detection**: Deepgram confidence score < 0.5
- **Mitigation**:
  1. Ask user to repeat: "Sorry, I didn't catch that. Could you repeat?"
  2. Offer alternative input: "Press 1 for yes, 2 for no"
  3. Fallback to DTMF input
- **Logging**: Store low-confidence transcripts for model improvement

### DTMF Issues

**DTMF Not Detected**:
- **Cause**: In-band DTMF with lossy codec (G.729)
- **Solution**: Use RFC 2833 out-of-band DTMF (configured in SIP trunk)
- **Fallback**: Use voice input ("say yes or no") instead of DTMF

**DTMF Delay**:
- **Cause**: Buffering in network or LiveKit jitter buffer
- **Impact**: User presses key, 500ms delay before detected
- **Mitigation**: Reduce jitter buffer for DTMF events
- **UX**: Provide audio feedback immediately (beep tone)

### Agent Service Issues

**Agent Crash Mid-Call**:
- **Detection**: LiveKit server loses WebSocket connection to agent
- **Impact**: Call becomes dead air, user hears silence
- **Recovery**:
  1. LiveKit notifies FlowMaestro of agent disconnect
  2. Attempt to spawn new agent (10 second timeout)
  3. New agent joins room, resumes from last saved state
  4. If recovery fails, play apology message and hang up

**Agent Pool Exhausted**:
- **Cause**: All workers at max capacity
- **Detection**: Job remains unassigned for >5 seconds
- **Mitigation**: Auto-scale worker pool (add 2 workers within 60 seconds)
- **User Experience**: User hears hold music during agent wait
- **Escalation**: If wait >30 seconds, offer callback

**Memory Leak**:
- **Detection**: Worker memory usage grows over time (>2GB)
- **Prevention**: Proper cleanup of audio buffers, STT/TTS streams
- **Mitigation**: Health check kills workers exceeding threshold
- **Graceful Shutdown**: Worker stops accepting new jobs, drains active calls

### Call Flow Edge Cases

**User Hangs Up Mid-Workflow**:
- **Detection**: Telnyx webhook: call_status = "completed"
- **Impact**: Workflow still running, wasting compute
- **Cleanup**:
  1. Webhook handler sends cancellation signal to Temporal
  2. Workflow cancels pending activities
  3. Agent leaves room
  4. Database updated: status = "user_hangup"

**Call Exceeds Max Duration** (e.g., 30 minutes):
- **Prevention**: Temporal timer: `await workflow.sleep(maxDuration)`
- **Action**:
  1. Agent plays warning: "This call will end in 1 minute"
  2. If call continues, play farewell and hang up
  3. Mark execution as "timeout"

**User Silent for Extended Period**:
- **Detection**: VAD detects no speech for >30 seconds during listen node
- **Action**:
  1. Prompt user: "Are you still there?"
  2. Wait 10 more seconds
  3. If still silent, hang up gracefully

**Rapid Interruptions (User Keeps Interrupting)**:
- **Detection**: TTS interrupted >3 times in 10 seconds
- **Interpretation**: User frustrated or TTS too slow
- **Adaptation**:
  1. Switch to faster TTS model (sacrifice quality for speed)
  2. Shorten responses
  3. Ask user: "Would you like me to transfer you to a human agent?"

### Workflow Logic Errors

**Node Executor Throws Exception**:
- **Temporal Behavior**: Automatic retry (3 attempts with exponential backoff)
- **After Max Retries**: Activity fails, workflow can catch error
- **Error Handling**:
  1. Play apology: "I'm having technical difficulties"
  2. Option 1: Skip to next node
  3. Option 2: Transfer to human agent
  4. Option 3: Hang up and log error

**Infinite Loop in Workflow**:
- **Prevention**: Max iteration count on loop nodes (default: 100)
- **Detection**: Workflow execution time >10 minutes
- **Mitigation**: Temporal timeout cancels workflow
- **User Experience**: "This call is taking longer than expected. Please try again later."

**Variable Not Found**:
- **Cause**: Node references ${variable} that doesn't exist
- **Detection**: Variable interpolation returns undefined
- **Handling**:
  1. Log warning with node details
  2. Use fallback value or empty string
  3. Continue execution (don't crash call)

---

## 7. Integration Points with FlowMaestro

### Trigger System Integration

**New Trigger Type**: `phone_call`

**Configuration Schema**:
```
{
  trigger_type: "phone_call",
  phone_number: "+15551234567",  // Provisioned from Telnyx
  sip_provider: "telnyx",
  connection_id: "uuid",  // Telnyx credentials
  config: {
    greeting_message: "Hello, how can I help you?",
    language: "en-US",
    max_call_duration: 1800,  // 30 minutes
    enable_recording: true,
    voicemail_enabled: false,
    business_hours: {
      enabled: true,
      timezone: "America/New_York",
      schedule: { mon: "9-17", tue: "9-17", ... }
    }
  }
}
```

**Trigger Registration Flow**:
1. User creates phone_call trigger in frontend
2. Backend provisions number from Telnyx (or uses existing)
3. Configure Telnyx webhook URL: `https://api.flowmaestro.com/api/webhooks/phone-call/{trigger_id}`
4. Store trigger in database
5. Test call to verify setup

### Workflow Node Types

**New Node Category**: Voice Nodes (icon: phone)

**voice_greet** - Play TTS message
- Config: message (string), voice (dropdown), interruptible (boolean)
- Output: None
- Use case: Greetings, confirmations, information delivery

**voice_listen** - Capture user speech
- Config: prompt (optional), max_duration (seconds), language, end_silence_ms
- Output: transcript (string), confidence (number)
- Use case: Open-ended questions, data collection

**voice_menu** - Present options
- Config: prompt (string), options (array of {key, label, nextNode})
- Output: selected_option (string)
- Use case: IVR menus, routing decisions

**voice_transfer** - Transfer to human/external number
- Config: destination (phone/SIP URI), announce_message
- Output: transfer_status (string)
- Use case: Escalation, warm transfer

**voice_hangup** - End call
- Config: farewell_message (optional)
- Output: None
- Use case: Call completion

**voice_record** - Record user audio (extended duration)
- Config: prompt, max_duration, beep_sound
- Output: recording_url, transcript
- Use case: Voicemail, testimonials, detailed feedback

**voice_dtmf_collect** - Collect DTMF digits
- Config: prompt, num_digits, timeout
- Output: digits (string)
- Use case: PIN entry, phone number collection, legacy IVR compatibility

### Variable System Integration

**Automatic Variables** (available in all voice workflows):
- `${call_sid}`: Unique call identifier
- `${caller_number}`: E.164 phone number of caller
- `${called_number}`: FlowMaestro phone number called
- `${call_duration}`: Current call duration in seconds
- `${caller_location}`: City, state from caller ID
- `${caller_carrier}`: Telecom carrier name

**Variable Interpolation** in voice nodes:
```
voice_greet node config:
  message: "Hello ${caller_name}, your balance is $${account_balance}"

Runtime:
  1. Fetch caller_name from database using ${caller_number}
  2. Fetch account_balance from previous node
  3. Interpolate: "Hello John, your balance is $1234.56"
  4. Send to TTS
```

### Connection System Integration

**New Connection Type**: `telnyx` (and `twilio`)

**Credentials Stored** (encrypted):
- API Key
- API Secret (if applicable)
- Account SID
- Webhook signing secret (for validation)

**Connection Test**:
```
Test button → API call to Telnyx:
GET /v2/phone_numbers
Authorization: Bearer {api_key}

Success: "Connected successfully. Found X phone numbers."
Failure: "Authentication failed. Please check your API key."
```

### Real-Time Events Integration

**New WebSocket Event Types**:
- `call:incoming` - New call arriving
- `call:active` - Call answered and agent connected
- `call:transcript` - Real-time transcript updates
- `call:node_change` - Workflow moved to new node
- `call:ended` - Call completed
- `call:error` - Error occurred

**Frontend Subscription**:
```
Frontend connects to WebSocket:
ws://api.flowmaestro.com/ws?token={jwt}

Subscribe to workflow:
{ type: "subscribe", channel: "workflow:{workflow_id}" }

Receive events:
{
  type: "call:transcript",
  call_execution_id: "...",
  speaker: "user",
  text: "I need help",
  is_final: true,
  confidence: 0.92
}
```

---

## 8. Deployment Architecture

### Service Topology

**Production Environment**:
```
┌─────────────────────────────────────────────────────┐
│                 Load Balancer (ALB)                  │
│          HTTP/HTTPS Traffic Distribution             │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │                           │
┌───────▼──────────┐       ┌───────▼──────────┐
│  Backend API     │       │  Backend API     │
│  (Fastify)       │       │  (Fastify)       │
│  Replicas: 3+    │       │  Replicas: 3+    │
└──────────────────┘       └──────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼────┐ ┌─────▼────────┐
│  PostgreSQL  │ │ Redis  │ │  Temporal    │
│  (RDS)       │ │(cluster)│ │  (cluster)   │
└──────────────┘ └────────┘ └──────────────┘

┌─────────────────────────────────────────────────────┐
│            Voice Agent Worker Pool                   │
│         (Separate from Backend API)                  │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Agent    │  │ Agent    │  │ Agent    │  ...     │
│  │ Worker 1 │  │ Worker 2 │  │ Worker 3 │          │
│  │ (Python) │  │ (Python) │  │ (Python) │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│  Min: 2 workers  |  Max: 20 workers  |  Autoscale   │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ WebSocket
                  │
┌─────────────────▼───────────────────────────────────┐
│              LiveKit Cloud / Self-Hosted             │
│  ┌────────────────────────────────────────────┐     │
│  │  SIP Bridge  │  Media Router  │  Recorder  │     │
│  └────────────────────────────────────────────┘     │
└─────────────────┬───────────────────────────────────┘
                  │ SIP/RTP
                  │
┌─────────────────▼───────────────────────────────────┐
│                   Telnyx Network                     │
│  Phone Number: +1-555-123-4567                       │
│  Webhook: https://api.flowmaestro.com/webhooks/...   │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ PSTN
                  │
              [ User's Phone ]
```

### Scaling Strategy

**Backend API**: Horizontal scaling (stateless)
- Auto-scale based on CPU >60%
- Min: 3 replicas, Max: 20 replicas
- Scale up: 30 seconds, Scale down: 5 minutes

**Agent Workers**: Load-based scaling (stateful)
- Each worker handles 1-5 concurrent calls
- Auto-scale based on:
  - CPU >60%
  - Active calls / total capacity >70%
- Min: 2 workers, Max: 20 workers
- Scale up: 60 seconds (container startup time)
- Scale down: 10 minutes (graceful drain)

**LiveKit**: Managed by LiveKit Cloud (auto-scales)
- Self-hosted: Deploy 2-3 servers behind load balancer
- Monitor: Active rooms, participant count, media bitrate

### Resource Requirements

**Per Agent Worker**:
- CPU: 0.5-2 cores (depends on STT/TTS processing)
- Memory: 512MB-2GB
- Network: 100kbps per call (audio) + overhead
- Disk: Minimal (logs only)

**Per Active Call**:
- Backend API: Negligible (webhooks only)
- Agent: 50-200MB RAM, 5-20% CPU
- LiveKit: 50-100MB RAM per room
- Database: ~1KB/second (event logs)
- Redis: ~10KB (ephemeral state)

**Estimated Capacity**:
- 1 agent worker (2 cores, 2GB RAM) = 5-10 concurrent calls
- 100 concurrent calls = 10-20 agent workers
- 1000 concurrent calls = 100-200 agent workers

### Monitoring & Observability

**Key Metrics**:
- `calls.active` - Current active calls
- `calls.completed` - Total completed calls
- `call.duration.avg` - Average call duration
- `agent.utilization` - % of agent capacity used
- `stt.latency.p95` - 95th percentile STT latency
- `tts.latency.p95` - 95th percentile TTS latency
- `audio.packet_loss` - Audio packet loss rate
- `audio.jitter` - Audio jitter (ms)

**Alerts**:
- Agent pool utilization >80% → Scale up
- Call failure rate >5% → On-call notification
- Audio quality degraded (packet loss >5%) → Investigation
- Webhook latency >1s → Backend performance issue

**Distributed Tracing**:
```
Trace: Incoming Call → Workflow Execution
├─ Span: Telnyx Webhook (50ms)
├─ Span: Create Call Execution (30ms)
├─ Span: Start LiveKit Agent (500ms)
│  ├─ Span: Initialize Voice Pipeline (200ms)
│  └─ Span: Fetch Workflow Context (100ms)
├─ Span: Execute voice_greet Node (2000ms)
│  ├─ Span: TTS Request (50ms)
│  └─ Span: Audio Playback (1950ms)
└─ Span: Execute voice_listen Node (5000ms)
   ├─ Span: VAD Detection (500ms)
   ├─ Span: STT Transcription (4000ms)
   └─ Span: Store Transcript (100ms)
```

---

## Summary

The LiveKit + Telnyx architecture provides a robust, scalable foundation for voice-enabled workflows:

✅ **Low Latency**: 1000ms to first audio output (3x faster than alternatives)
✅ **Real-Time AI**: Streaming STT/TTS with barge-in support
✅ **Reliable**: Multiple layers of redundancy and error handling
✅ **Scalable**: Independent scaling of each component
✅ **Integrated**: Seamless integration with FlowMaestro's workflow system
✅ **Observable**: Comprehensive monitoring and tracing
✅ **Compliant**: Built-in support for recording consent, PCI, TCPA

The system is production-ready and designed to handle edge cases gracefully while providing an excellent user experience for voice-based workflows.
