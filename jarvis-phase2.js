
/* PROJECT JARVIS — PHASE 2
   AI Chat + Voice + Spoken Responses
   Uses Puter.js (no API key in frontend)
*/

(() => {
  "use strict";

  if (window.JARVIS_PHASE2_LOADED) return;
  window.JARVIS_PHASE2_LOADED = true;

  const style = document.createElement("style");
  style.textContent = `
    #jarvis-ai-panel {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: min(420px, calc(100vw - 32px));
      height: min(580px, calc(100dvh - 32px));
      background: #071629;
      color: #e4faff;
      border: 1px solid #18caff;
      border-radius: 18px;
      box-shadow: 0 0 30px #00cfff44;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }
    #jarvis-ai-panel * {
      box-sizing: border-box;
    }
    .jv-head {
      background: #092740;
      padding: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .jv-title {
      font-weight: bold;
      color: #48e6ff;
      letter-spacing: 2px;
    }
    .jv-log {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .jv-msg {
      padding: 11px;
      border-radius: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .jv-user {
      background: #14547b;
      align-self: flex-end;
      max-width: 90%;
    }
    .jv-ai {
      background: #102b40;
      align-self: flex-start;
      max-width: 95%;
    }
    .jv-controls {
      padding: 12px;
      border-top: 1px solid #16516b;
      display: grid;
      gap: 8px;
    }
    .jv-row {
      display: flex;
      gap: 8px;
    }
    .jv-input {
      flex: 1;
      min-width: 0;
      padding: 11px;
      border: 1px solid #247b9e;
      border-radius: 9px;
      background: #031322;
      color: white;
      font-size: 16px;
    }
    .jv-btn {
      padding: 10px;
      border: 1px solid #22caff;
      border-radius: 9px;
      background: #0d3855;
      color: white;
      cursor: pointer;
      font-size: 14px;
    }
    .jv-btn:disabled {
      opacity: .45;
      cursor: wait;
    }
    .jv-status {
      font-size: 12px;
      color: #91c6d8;
    }
    #jv-launch {
      position: fixed;
      bottom: 18px;
      right: 18px;
      z-index: 99998;
      padding: 14px 18px;
      border-radius: 50px;
      background: #073b58;
      color: #55eaff;
      border: 1px solid #22caff;
      box-shadow: 0 0 20px #00cfff55;
      font-weight: bold;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const launch = document.createElement("button");
  launch.id = "jv-launch";
  launch.textContent = "✦ JARVIS AI";
  document.body.appendChild(launch);

  const panel = document.createElement("section");
  panel.id = "jarvis-ai-panel";
  panel.setAttribute("aria-label", "JARVIS AI chat");

  panel.innerHTML = `
    <div class="jv-head">
      <span class="jv-title">J.A.R.V.I.S. AI</span>
      <button class="jv-btn" id="jv-close">✕</button>
    </div>

    <div class="jv-log" id="jv-log"
         role="log" aria-live="polite"></div>

    <div class="jv-controls">
      <div class="jv-status" id="jv-status">
        AI SYSTEM READY
      </div>

      <div class="jv-row">
        <input
          id="jv-input"
          class="jv-input"
          placeholder="Ask JARVIS anything..."
          aria-label="Message JARVIS"
        />
        <button class="jv-btn" id="jv-send">
          SEND
        </button>
      </div>

      <div class="jv-row">
        <button class="jv-btn" id="jv-mic">
          🎙 SPEAK
        </button>
        <button class="jv-btn" id="jv-voice">
          🔊 VOICE ON
        </button>
        <button class="jv-btn" id="jv-stop">
          STOP
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  const $ = id => document.getElementById(id);

  const log = $("jv-log");
  const input = $("jv-input");
  const sendButton = $("jv-send");
  const micButton = $("jv-mic");
  const voiceButton = $("jv-voice");
  const status = $("jv-status");

  let voiceEnabled = true;
  let busy = false;
  let recognition = null;

  const messages = [{
    role: "system",
    content:
      "You are JARVIS, a helpful, concise, futuristic " +
      "AI assistant. Be clear, friendly and accurate. " +
      "Do not pretend to control devices or systems " +
      "unless an actual integration exists."
  }];

  function addMessage(text, who) {
    const item = document.createElement("div");
    item.className =
      "jv-msg " + (who === "user" ? "jv-user" : "jv-ai");
    item.textContent = text;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
  }

  function speak(text) {
    if (!voiceEnabled ||
        !("speechSynthesis" in window)) return;

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 0.9;

    speechSynthesis.speak(utterance);
  }

  function responseText(result) {
    if (typeof result === "string") return result;

    if (result?.message?.content) {
      const content = result.message.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map(x => x.text || "")
          .filter(Boolean)
          .join("\n");
      }
    }

    if (result?.text) return result.text;

    return "I received a response, but could not read it.";
  }

  async function sendMessage() {
    const question = input.value.trim();
    if (!question || busy) return;

    busy = true;
    sendButton.disabled = true;
    input.value = "";

    addMessage(question, "user");
    status.textContent = "JARVIS IS THINKING...";

    const pending = [
      ...messages,
      { role: "user", content: question }
    ];

    try {
      if (!window.puter?.ai?.chat) {
        throw new Error(
          "AI library unavailable. Check internet connection."
        );
      }

      const result = await puter.ai.chat(pending);
      const answer = responseText(result);

      messages.push(
        { role: "user", content: question },
        { role: "assistant", content: answer }
      );

      addMessage(answer, "ai");
      status.textContent = "AI SYSTEM ONLINE";
      speak(answer);

    } catch (error) {
      console.error("JARVIS AI error:", error);
      addMessage(
        "AI connection failed. Check your internet, " +
        "Puter sign-in, or free usage allowance. " +
        "Details: " + error.message,
        "ai"
      );
      status.textContent = "AI CONNECTION ERROR";

    } finally {
      busy = false;
      sendButton.disabled = false;
    }
  }

  sendButton.addEventListener("click", sendMessage);

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") sendMessage();
  });

  voiceButton.addEventListener("click", () => {
    voiceEnabled = !voiceEnabled;
    voiceButton.textContent =
      voiceEnabled ? "🔊 VOICE ON" : "🔇 VOICE OFF";

    if (!voiceEnabled &&
        "speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
  });

  $("jv-stop").addEventListener("click", () => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
    if (recognition) recognition.stop();
  });

  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (Recognition) {
    recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = event => {
      input.value =
        event.results[0][0].transcript;
      status.textContent = "VOICE CAPTURED";
      sendMessage();
    };

    recognition.onerror = event => {
      status.textContent =
        "MIC ERROR: " + event.error;
    };

    recognition.onend = () => {
      micButton.disabled = false;
    };

    micButton.addEventListener("click", () => {
      try {
        micButton.disabled = true;
        status.textContent = "LISTENING...";
        recognition.start();
      } catch (error) {
        micButton.disabled = false;
        status.textContent = "MIC UNAVAILABLE";
      }
    });

  } else {
    micButton.textContent = "🎙 DICTATE";
    micButton.addEventListener("click", () => {
      input.focus();
      status.textContent =
        "Use the microphone on your iPad keyboard.";
    });
  }

  function openPanel() {
    panel.style.display = "flex";
    launch.style.display = "none";
    input.focus();
  }

  function closePanel() {
    panel.style.display = "none";
    launch.style.display = "block";
  }

  launch.addEventListener("click", openPanel);
  $("jv-close").addEventListener("click", closePanel);

  addMessage(
    "Good day. JARVIS Phase 2 initialized. " +
    "How may I assist you?",
    "ai"
  );

  closePanel();
})();
