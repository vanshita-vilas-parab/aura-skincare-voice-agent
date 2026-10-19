import { useEffect, useRef, useState } from "react";

import { getOrders, sendMessage, summarizeCall } from "./services/api";

import ReactMarkdown from "react-markdown";

import "./App.css";


function App() {

  const [orders, setOrders] = useState({});

  const [messages, setMessages] = useState([]);

  const [callSummary, setCallSummary] = useState(null);

  const [input, setInput] = useState("");

  const [status, setStatus] = useState("Idle");

  const [callActive, setCallActive] = useState(false);

  const [loading, setLoading] = useState(false);

  const [isListening, setIsListening] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);


  const messagesEndRef = useRef(null);

  const recognitionRef = useRef(null);

  const conversationPanelRef = useRef(null);


  useEffect(() => {

  getOrders()

  .then(setOrders)

  .catch((error) => {

  console.error("Could not load orders:", error);

  });

  }, []);


  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;

    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);


  const startCall = () => {
    setCallSummary(null);

    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm Aria from Aura Skincare. How can I help you today?",
      },
    ]);

    setCallActive(true);
    setStatus("Speaking");

    // Bring the conversation panel into view when the call starts.
    requestAnimationFrame(() => {
      conversationPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    speakText(
      "Hello! I'm Aria from Aura Skincare. How can I help you today?"
    );
  };


  const endCall = async () => {
    // Capture the completed conversation before ending the call.
    const completedConversation = [...messages];

    // Stop the voice conversation immediately.
    setCallActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setLoading(false);
    setStatus("Idle");

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    window.speechSynthesis.cancel();

    // Collect order IDs mentioned during the conversation.
    const orderIds = [
      ...new Set(
        completedConversation.flatMap(
          (message) =>
            message.content.match(/\bORD-\d{3}\b/gi) || []
        )
      ),
    ];

    // Show a temporary summary while the AI processes the transcript.
    setCallSummary({
      summary: "Generating call summary...",
      order_ids_discussed: orderIds,
      status: "Completed",
    });

    try {
      const result = await summarizeCall(completedConversation);

      setCallSummary({
        summary: result.summary,
        order_ids_discussed: orderIds,
        status: "Completed",
      });
    } catch (error) {
      console.error("Could not generate call summary:", error);

      setCallSummary({
        summary:
          "The conversation transcript is available, but the summary could not be generated. Please try again.",
        order_ids_discussed: orderIds,
        status: "Completed",
      });
    }
  };


  const speakText = (text) => {
    if (!("speechSynthesis" in window)) {
      console.warn("Speech synthesis is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Prefer Indian English voices.
    const indianVoice = voices.find(
      (voice) => voice.lang.toLowerCase() === "en-in"
    );

    if (indianVoice) {
      utterance.voice = indianVoice;
    }

    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus("Speaking");
    };

    utterance.onend = () => {
      setIsSpeaking(false);

      if (callActive) {
        setStatus("Listening");

        setTimeout(() => {
          if (callActive) {
            startListening();
          }
        }, 500);
      } else {
        setStatus("Idle");
      }
    };

    utterance.onerror = (event) => {
      console.error("Speech error:", event.error);
      setIsSpeaking(false);

      if (callActive) {
        setStatus("Listening");
        setTimeout(() => {
          if (callActive) {
            startListening();
          }
        }, 500);
      }else {
        setStatus("Idle");
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const normalizeSpokenOrderId = (text) => {
    let normalized = text.toLowerCase().trim();

    // Recognise spoken letters: "o r d" → "ord"
    normalized = normalized.replace(/\bo\s+r\s+d\b/g, "ord");

    // Convert spoken number words into digits.
    const numberWords = {
      zero: "0",
      oh: "0",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
    };

    // Standardise common order-ID phrases.
    normalized = normalized
      .replace(/\border number\b/g, "order")
      .replace(/\border id\b/g, "order")
      .replace(/\border\b/g, "ORD")
      .replace(/\bord\b/g, "ORD")
      .replace(/\b(dash|hyphen)\b/g, " ");

    // Convert spoken digits only in the text following an order marker.
    normalized = normalized.replace(
      /\bORD\b(.+)/,
      (match, remainder) => {
        const converted = remainder.replace(
          /\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g,
          (word) => numberWords[word]
        );

        return `ORD ${converted}`;
      }
    );

    // Join separated digits: "ORD 1 0 1" → "ORD-101".
    normalized = normalized.replace(
      /\bORD\s+(\d)\s+(\d)\s+(\d)\b/g,
      "ORD-$1$2$3"
    );

    // Standardise IDs written as "ORD 101" or "ORD-101".
    normalized = normalized.replace(
      /\bORD\s*[- ]?\s*(10[1-3])\b/g,
      "ORD-$1"
    );

    return normalized.toUpperCase();
  };

  const startListening = () => {

  const SpeechRecognition =

  window.SpeechRecognition || window.webkitSpeechRecognition;


  if (!SpeechRecognition) {

  alert(

  "Speech recognition is not supported in this browser. Please use Google Chrome."

  );

  return;

  }


  if (!callActive || loading || isSpeaking || isListening) {

  return;

  }


// Avoid creating multiple recognition sessions.*

  if (recognitionRef.current) {

  return;

  }


  const recognition = new SpeechRecognition();

  recognitionRef.current = recognition;


  recognition.lang = "en-IN";

  recognition.continuous = false;

  recognition.interimResults = false;

  recognition.maxAlternatives = 1;


  recognition.onstart = () => {

  setIsListening(true);

  setStatus("Listening");

  };


  recognition.onresult = (event) => {

  const rawTranscript = event.results[0][0].transcript.trim();
  const transcript = normalizeSpokenOrderId(rawTranscript);


  if (transcript) {

  setInput(transcript);


// Automatically send the recognized question.*

  handleVoiceMessage(transcript);

  }

  };


  recognition.onerror = (event) => {

  console.error("Speech recognition error:", event.error);

  };


  recognition.onend = () => {

    recognitionRef.current = null;

    setIsListening(false);
    if (!callActive) {

      setStatus("Idle");

    }
  };


  try {

  recognition.start();

  } catch (error) {

  console.error("Could not start speech recognition:", error);

  recognitionRef.current = null;

  setIsListening(false);

  }

  };


  const handleVoiceMessage = async (message) => {

  if (!message || !callActive || loading) return;


  const history = messages

  .filter(

  (item) => item.role === "user" || item.role === "assistant"

  )

  .map((item) => ({

  role: item.role,

  content: item.content,

  }));


  setMessages((previous) => [

  ...previous,

  { role: "user", content: message },

  ]);


  setInput("");

  setLoading(true);

  setStatus("Thinking");


  try {

  const result = await sendMessage(message, history);


  setMessages((previous) => [

  ...previous,

  {

  role: "assistant",

  content: result.reply,

  },

  ]);


  speakText(result.reply);

  } catch (error) {

  console.error("Voice message failed:", error);


  const fallbackReply =

  "I'm sorry, I'm having trouble responding right now. Please try again.";


  setMessages((previous) => [

  ...previous,

  {

  role: "assistant",

  content: fallbackReply,

  },

  ]);


  speakText(fallbackReply);

  } finally {

  setLoading(false);

  }

  };


  const handleSend = async (event) => {

  event.preventDefault();


  const message = input.trim();


  if (!message || !callActive || loading) return;


  const history = messages

  .filter((item) => item.role === "user" || item.role === "assistant")

  .map((item) => ({

  role: item.role,

  content: item.content,

  }));


  setMessages((previous) => [

  ...previous,

  { role: "user", content: message },

  ]);


  setInput("");

  setLoading(true);

  setStatus("Thinking");


  try {

  const result = await sendMessage(message, history);


  setMessages((previous) => [

  ...previous,

  {

  role: "assistant",

  content: result.reply,

  },

  ]);


  setStatus("Listening");

  } catch (error) {

  console.error("Message failed:", error);


  setMessages((previous) => [

  ...previous,

  {

  role: "assistant",

  content:

  "I'm sorry, I'm having trouble responding right now. Please try again.",

  },

  ]);


  speakText(result.reply);

  } finally {

  setLoading(false);

  }

  };


  const formatOrder = (orderId, order) => (

  <div className="order-card" key={orderId}>

  <div className="order-heading">

  <strong>{orderId}</strong>

  <span className="order-status">{order.status}</span>

  </div>


  <p>{order.product}</p>

  <p>₹{order.value}</p>


  {order.courier && <p>Courier: {order.courier}</p>}

  {order.tracking_id && <p>Tracking: {order.tracking_id}</p>}

  <p className="order-notes">{order.notes}</p>

  </div>

  );


  return (

  <main className="app">

  <header className="topbar">

  <div className="brand">

  <div className="brand-icon">A</div>

  <div>

  <h1>Aura Skincare</h1>

  <p>AI Customer Support</p>

  </div>

  </div>


  <span className="agent-label">Meet Aria · AI Support Agent</span>

  </header>


  <section className="welcome">

  <p className="eyebrow">YOUR PERSONAL SKINCARE ASSISTANT</p>

  <h2>How can we help you today?</h2>

  <p>

  Talk to Aria about orders, delivery, returns, and

  Aura Skincare policies.

  </p>

  </section>


  <section className="dashboard">

  <div className="conversation panel" ref={conversationPanelRef}>

  <div className="panel-header">

  <div>

  <h3>Conversation with Aria</h3>

  <p>Friendly support, whenever you need it.</p>

  </div>


  <span className={`status-badge ${status.toLowerCase()}`}>

  <span className="status-dot" />

  {status}

  </span>

  </div>


  <div className="messages">

  {messages.length === 0 ? (

  <div className="empty-state">

  <div className="aria-avatar">A</div>

  <h3>Ready when you are</h3>

  <p>Start a call to begin your conversation with Aria.</p>

  </div>

  ) : (

  messages.map((message, index) => (

  <div

key={index}

className={`message ${message.role}`}

  >

  <span className="message-label">

  {message.role === "user" ? "You" : "Aria"}

  </span>


  <div className="message-bubble">

  {message.role === "assistant" ? (

  <ReactMarkdown

components={{

  table: ({ children }) => (

  <div className="markdown-table">

  <table>{children}</table>

  </div>

  ),

  }}

  >

  {message.content}

  </ReactMarkdown>

  ) : (

  message.content

  )}

  </div>

  </div>

  ))

  )}


  <div ref={messagesEndRef} />

  </div>


  <div className="call-controls">

  <button

className="start-button"

onClick={startCall}

disabled={callActive}

  >

  Start Call

  </button>


  <button

className="start-button"

onClick={startListening}

disabled={!callActive || isListening || loading || isSpeaking}

  >

  {isListening ? "Listening..." : "🎤 Speak"}

  </button>


  <button

className="end-button"

onClick={endCall}

disabled={!callActive}

  >

  End Call

  </button>

  </div>


  <form className="message-form" onSubmit={handleSend}>

  <input

value={input}

onChange={(event) => {
  const value = event.target.value;
  setInput(value);

  if (callActive && !loading && !isListening && !isSpeaking) {
    setStatus(value.trim() ? "Typing" : "Idle");
  }
}}

placeholder={

  callActive

  ? "Type a message to test Aria..."

  : "Start a call to chat with Aria"

  }

disabled={!callActive || loading}

  />


  <button

type="submit"

disabled={!callActive || loading || !input.trim()}

  >

  {loading ? "Thinking..." : "Send"}

  </button>

  </form>

  </div>


  <aside className="orders-panel panel">

  <div className="panel-header">

  <div>

  <h3>Test Orders</h3>

  <p>Sample orders for evaluation</p>

  </div>

  </div>


  <div className="orders-list">

  {Object.keys(orders).length > 0 ? (

  Object.entries(orders).map(([orderId, order]) =>

  formatOrder(orderId, order)

  )

  ) : (

  <p className="loading-orders">

  Loading sample orders...

  </p>

  )}

  </div>


  <div className="policy-note">

  <strong>Quick tip</strong>

  <p>

  Try asking Aria about ORD-101, ORD-102, or ORD-103.

  You can also ask about our return and cancellation policies.

  </p>

  </div>

  </aside>

  </section>


  {callSummary && (

  <section className="call-summary-section">

  <div className="panel">

  <div className="panel-header">

  <div>

  <h3>Call Transcript</h3>

  <p>Chronological record of your conversation with Aria</p>

  </div>

  </div>


  <div className="transcript-list">

  {messages.map((message, index) => (

  <div

className="transcript-message"

key={index}

  >

  <strong>

  {message.role === "user" ? "Customer" : "Aria"}

  </strong>

  <p>{message.content}</p>

  </div>

  ))}

  </div>

  </div>


  <div className="panel">

  <div className="panel-header">

  <div>

  <h3>Call Summary</h3>

  <p>Brief overview of the conversation</p>

  </div>

  </div>


  <div className="call-summary-text">

  {callSummary.summary}

  </div>

  </div>

  </section>

  )}


  <footer>

  Aura Skincare · AI-powered customer experience

  </footer>

  </main>

  );

}


export default App;