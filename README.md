# Aura Skincare — AI Voice Customer Support Agent

A browser-based AI customer support agent that helps customers with skincare product enquiries, shipping policies, order tracking, returns, cancellations, and other common support questions.

The application uses a React frontend, Flask backend, and Groq API to generate AI responses. Browser-based speech recognition and speech synthesis enable voice interaction, while a post-call summary helps capture the outcome of each conversation.

## Live Demo

- **Application:** https://aura-skincare-voice-agent-frontend.onrender.com/
- **Backend API:** https://aura-skincare-voice-agent-cmhu.onrender.com/
- **GitHub Repository:** https://github.com/vanshita-vilas-parab/aura-skincare-voice-agent

## Features

- AI-powered customer conversations using the Groq API.
- Browser-based speech recognition and speech synthesis.
- Mock order lookup and shipping information.
- Return and cancellation policy guidance.
- Call states: Idle, Listening, Thinking, and Speaking.
- Conversation history and post-call summary.
- Responsive interface for desktop and mobile layouts.

## Technology Stack

**Frontend:** React.js, JavaScript, HTML5, CSS3, Axios, React Markdown, Browser Speech Recognition API, Web Speech Synthesis API

**Backend:** Python, Flask, Flask-CORS, Groq API, Gunicorn

**Deployment:** Render, GitHub

## Architecture

The application follows a client-server architecture.

### 1. Frontend — React

The React application provides the customer support interface. It manages conversation history, call status, user input, speech recognition, and speech playback.

It sends HTTP requests to the Flask backend using Axios.

### 2. Backend — Flask

The Flask backend exposes REST API endpoints for retrieving mock orders, processing customer messages, and generating post-call summaries.

It handles communication with the AI service and returns responses to the frontend.

### 3. AI Processing — Groq API

The backend sends customer messages and relevant conversation context to the Groq API to generate responses.

The agent uses the provided Aura Skincare policies and mock order information to answer supported customer enquiries.

### 4. Voice Interaction — Browser APIs

The browser's Speech Recognition API converts spoken customer input into text.

The Speech Synthesis API reads the agent's responses aloud.

These browser APIs allow voice interaction without requiring a separate speech-processing server.

### Request Flow

1. The customer types a message or speaks into the microphone.
2. The React frontend sends the message and conversation history to Flask.
3. Flask processes the request and obtains an AI-generated response.
4. The backend returns the response to React.
5. The frontend displays the response and uses speech synthesis to speak it aloud when applicable.
6. When the call ends, the frontend requests a post-call summary.

## Brand Policies

The agent follows the following predefined Aura Skincare policies.

| Policy | Details |
|---|---|
| Free Shipping | Orders of ₹499 or more qualify for free shipping. |
| Shipping Fee | Orders below ₹499 incur a ₹50 shipping fee. |
| Delivery Time | Standard delivery takes 3–5 business days. |
| Returns | Within 7 days of delivery if unopened, unused, and in original packaging. |
| Damaged Products | Report within 48 hours of delivery and provide photos to request a replacement. |
| Cancellation | Orders can be cancelled while Processing. Shipped or Out for Delivery orders cannot be cancelled; customers may refuse delivery at the doorstep. |
| Cash on Delivery | Available for orders up to ₹2,500; payment by cash or UPI at the doorstep. |

## Mock Order Data

The application uses predefined sample orders for testing order-related enquiries.

| Order ID | Customer | Product | Amount | Status |
|---|---|---|---|---|
| ORD-101 | Priya Sharma | Vitamin C Serum (30ml) | ₹699 | Out for Delivery |
| ORD-102 | Rahul Verma | Hydrating Sunscreen SPF 50 | ₹499 | Delivered |
| ORD-103 | Ananya Patel | Green Tea Face Wash + Toner | ₹850 | Processing |

### Additional Order Details

**ORD-101**
- Courier: BlueDart
- Tracking ID: `BD-982103`
- Expected delivery: By 6 PM today

**ORD-102**
- Courier: Delhivery
- Tracking ID: `DL-441029`
- Delivery: 14 days ago

**ORD-103**
- Order placed: 3 hours ago
- Current status: Processing
- Cancellation: Eligible

These records are mock data intended for demonstration and testing.

## Getting Started

Follow these instructions to run the application locally.

### Prerequisites

- Python 3
- Node.js and npm
- Git
- A Groq API key

### 1. Clone the Repository

```bash
git clone https://github.com/vanshita-vilas-parab/aura-skincare-voice-agent.git
cd aura-skincare-voice-agent
```

### 2. Configure the Backend

Navigate to the backend directory:

```bash
cd backend
```

Create and activate a Python virtual environment.

**macOS/Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory.

Add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Replace the placeholder with your own API key. Never commit the actual key to GitHub.

Start the Flask application:

```bash
python app.py
```

The backend should be available at:

http://127.0.0.1:5000/

### 3. Configure the Frontend

Open another terminal from the project root:

```bash
cd frontend
```

Install the dependencies:

```bash
npm install
```

Create a `.env` file inside the `frontend` directory:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

http://localhost:5173/

Keep both the backend and frontend running while testing locally.

## Environment Variables

### Backend

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | API key used to authenticate requests to Groq. |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the Flask API, including the `/api` path. |

For local development, use:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api
```

For the deployed application, the frontend uses:

```env
VITE_API_BASE_URL=https://aura-skincare-voice-agent-cmhu.onrender.com/api
```

Vite exposes variables prefixed with `VITE_` to frontend code. Never put secret API keys in frontend environment variables.

## API Endpoints

The Flask backend exposes the following endpoints.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Checks backend availability. |
| GET | `/api/orders` | Retrieves the mock order collection. |
| GET | `/api/orders/<order_id>` | Retrieves details for a specific order. |
| POST | `/api/chat` | Processes a customer message and returns an AI response. |
| POST | `/api/summarize` | Generates a summary from the conversation transcript. |

### Example: Retrieve Orders

```http
GET /api/orders
```

### Example: Retrieve a Specific Order

```http
GET /api/orders/ORD-101
```

### Example: Send a Chat Message

```json
{
  "message": "What are your shipping charges?",
  "history": []
}
```

The chat endpoint returns the agent's response and any associated order ID.

### Example: Generate a Call Summary

```json
{
  "transcript": [
    {
      "role": "user",
      "content": "What are your shipping charges?"
    }
  ]
}
```

The summary endpoint returns a generated summary of the conversation.

## Voice Interaction

The application uses browser-provided speech capabilities.

### Speech Recognition

Speech recognition captures the customer's spoken question and converts it into text for processing.

### Speech Synthesis

Speech synthesis converts the agent's text response into spoken audio.

The application prefers an available Indian English voice when the browser provides one.

### Browser Compatibility

Speech recognition and synthesis support varies by browser, operating system, and device.

For the best testing experience:

1. Open the application in Google Chrome.
2. Allow microphone access when prompted.
3. Ensure the device's media volume is turned up.
4. Check that the device has an available speech voice.
5. Test voice input and spoken responses separately.

Text interaction can be used to test the AI and backend independently of speech functionality.

## Error Handling and Limitations

- The application depends on the availability of the Groq API.
- AI responses can fail because of network issues, API errors, or rate limits.
- Browser speech recognition and synthesis may behave differently across devices.
- Order information is based on predefined mock records rather than a live order-management system.
- The application is a demonstration and is not connected to a production customer database.
- The current architecture has not been load-tested for 1,000 daily conversations.

## Future Improvements

- Improve voice interaction reliability across browsers and mobile devices.
- Add clearer feedback for microphone, speech, and AI-service errors.
- Add automated tests for API endpoints, order lookup, and policy compliance.
- Improve monitoring, logging, and performance measurement.
- Add background processing for tasks that do not require an immediate response.
- Store conversations securely with defined retention policies.
- Add human handoff for complex customer issues.
- Scale backend infrastructure for higher traffic.

## 9. Tell Us How You Think

### 1. Why did you choose your particular architecture and technology stack?

I used React for the frontend because it handles a live support screen well, with status changes and conversation history. Flask with Python was an easy pick for the backend. It’s light, and it made building the APIs and connecting the AI simple. For the AI, I used the Groq API. For voice, I used the browser’s built-in speech recognition and speech synthesis. I kept the frontend, backend, and AI parts separate, so it’s easy to fix or add things later.

### 2. What was the most difficult part of the assignment, and how did you solve it?

Getting the AI conversation to work smoothly with the browser’s speech tools and the call states (Idle, Listening, Thinking, Speaking). It was easy for them to get out of sync. I kept the conversation state in React, used the browser speech APIs for voice, and connected everything to Flask for AI replies and the post-call summary. I then tested order lookups and policy questions to make sure the agent stuck to the brand rules.

### 3. If you had one more week to work on this, what would you improve first and why?

The voice experience. Speech recognition and playback don’t behave the same on every browser, especially on mobile, so I’d make that more reliable first. I’d also add clear messages when the mic, speech engine, or AI service isn’t working, so customers know what’s going on and what to do next.

### 4. Imagine this agent is handling 1,000 customer conversations a day. What do you think would need to change or improve?

First, I’d move the backend to a setup that can scale, and push slow tasks (like summaries) to the background. I’d add logging, monitoring, automated tests, and handling for rate limits, so problems show up quickly. I’d also keep an eye on response time and cost, store conversations securely with clear retention rules, and add checks so the agent keeps following brand policy. Last, I’d add a handoff to a human for cases the AI can’t handle with confidence.

## Short Approach Note

I built a browser-based AI customer support agent using React, Flask, and the Groq API, integrating speech recognition and speech synthesis for voice interaction. The agent answers questions using predefined brand policies, retrieves information from mock customer orders, and generates a summary when the conversation ends. I focused on keeping the architecture simple, separating frontend and backend responsibilities, and making the interface easy to use.

## Demo Video

**Demo video:** [Demo video link](https://drive.google.com/file/d/1F68fwp33bWZz5XOghigZXszx6tmqV6Pb/view?usp=drivesdk)

The 3–5 minute demonstration should cover:

1. Starting a conversation with Aria.
2. Asking a policy-related question.
3. Looking up an order.
4. Demonstrating voice input and spoken responses.
5. Ending the call and showing the transcript and summary.
6. Briefly explaining the application architecture.

## Contact

**Developer:** Vanshita Parab

**LinkedIn:** [Link](https://www.linkedin.com/in/vanshita-vilas-parab)
