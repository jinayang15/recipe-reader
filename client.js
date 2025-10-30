// TODO: add functionality to "navigate" recipe with voice
// TODO: read out groups of ingredients
// TODO: ask how much of a certain ingredient is needed
// NOTE: Should not record at the same time as TTS

const wsUri = "ws://localhost:2700";
const parserUri = "http://localhost:8000";
let websocket;
const synth = window.speechSynthesis;
let listening = false;
let speaking = false;

let recording = false;
const controlButton = document.getElementById("control");
controlButton.addEventListener("click", connectWebsocketClient);
controlButton.addEventListener("click", toggleButton);

const recipeLink = document.getElementById("recipe-link");
const parseRecipeButton = document.getElementById("parse-recipe");
parseRecipeButton.addEventListener("click", sendRecipeLink);

function connectWebsocketClient() {
  websocket = new WebSocket(wsUri);

  // connecting to server
  websocket.addEventListener("open", () => {
    console.log("CONNECTED");
    const phraseList = ["was there [unk]"];
    if (phraseList) {
      websocket.send(
        JSON.stringify({
          config: {
            phrase_list: phraseList,
          },
        })
      );
    }
    starting();
  });

  // error handling
  websocket.addEventListener("error", (e) => {
    console.log(`ERROR`);
  });

  // receiving messages
  websocket.addEventListener("message", (e) => {
    const json = JSON.parse(e.data);
    if ("partial" in json && !listening) {
      listening = true;
      speaking = false;
      console.log("LISTENING...");
    } else if ("text" in json && !speaking) {
      console.log(`RESULT: ${json.text}`);
      listening = false;
      speaking = true;
      const utter = new SpeechSynthesisUtterance(json.text);
      synth.speak(utter);
    }
  });

  // handling disconnect
  websocket.addEventListener("close", () => {
    console.log("DISCONNECTED");
  });

  async function starting() {
    try {
      // asks for mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // sets up environment for audio work
      // setting sampleRate does not work on Firefox
      const audioContext = new AudioContext({ sampleRate: 16000 });
      // brings live audio into the audio environment
      const source = audioContext.createMediaStreamSource(stream);

      // TODO: record the input and check for quality
      // const recording = new MediaRecorder(source);

      // process audio for recognition
      await audioContext.audioWorklet.addModule("processor.js");
      const monoNode = new AudioWorkletNode(audioContext, "processor", {
        numberOfOutputs: 0,
      });
      source.connect(monoNode);

      monoNode.port.onmessage = (event) => {
        const monoF32 = new Float32Array(event.data);

        // map Float32Array [-1, 1] to Int16Array
        const pcm16 = new Int16Array(monoF32.length);
        for (let i = 0; i < monoF32.length; i++) {
          const sample = Math.max(-1, Math.min(1, monoF32[i]));
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(pcm16.buffer);
        }
      };
    } catch (error) {
      console.error(error);
      alert("Failed to access microphone");
    }
  }
}

const closeCallback = () => {
  websocket.close(1000, "Client disconnect...");
};

function toggleButton() {
  const controlButton = document.getElementById("control");
  if (recording) {
    recording = false;
    controlButton.textContent = "Start recording...";
    controlButton.removeEventListener("click", closeCallback);
    controlButton.addEventListener("click", connectWebsocketClient);
    controlButton.removeEventListener("click", toggleButton);
    controlButton.addEventListener("click", toggleButton);
  } else {
    recording = true;
    controlButton.textContent = "Stop recording...";
    controlButton.removeEventListener("click", connectWebsocketClient);
    controlButton.addEventListener("click", closeCallback);
    controlButton.removeEventListener("click", toggleButton);
    controlButton.addEventListener("click", toggleButton);
  }
}

async function sendRecipeLink() {
  const link = { link: recipeLink.value };
  try {
    const response = await fetch(parserUri + "/parse", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(link),
    });
    const json = await response.json();
    console.log(json);
  } catch (error) {
    console.error(error);
  }
}

// TODO: create phrase list based on recipe
function createPhraseList() {}

/**
 * 1. Microphone Access

    Request permission and capture live audio using navigator.mediaDevices.getUserMedia({ audio: true }).

2. Audio Processing Setup

    Create an AudioContext and connect the microphone stream to it with createMediaStreamSource(stream).

Use an AudioWorklet to process audio in real time, block by block, on a separate thread.
3. Audio Transformation

    In the AudioWorkletProcessor:

        Downmix stereo to mono if needed.

        Resample to the server’s required sample rate (e.g., 16,000 Hz).

        Convert Float32 samples to 16-bit signed PCM (Int16Array).

Send processed audio chunks to the main thread using this.port.postMessage().
4. WebSocket Streaming

    In the main script, listen for messages from the AudioWorkletNode.

    Send each audio chunk over the WebSocket using websocket.send(int16Array.buffer).

5. Server Communication

    Optionally, send a config message to the server to set sample rate and other options .

    When finished, stop the microphone stream and send an end-of-audio message (e.g., {"eof": 1}).

6. Handling Recognition Results

    Listen for incoming WebSocket messages from the server.

    Parse each message to distinguish between partial and final results (using fields like isFinal or IsPartial).

    Display partial results for real-time feedback and final results for confirmed transcription.

This workflow ensures your audio is captured, processed, and streamed in the format your server expects, and that you receive and handle recognition results in real time.

 */
