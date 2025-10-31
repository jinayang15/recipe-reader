// Priority (highest to lowest)

// TODO: create phrase list based on recipe
// TODO: add functionality to "navigate" recipe with voice
// TODO: migrate to TS
// TODO: read out groups of ingredients
// TODO: ask how much of a certain ingredient is needed
// TODO: allow it to be interruptable instead of disabling listening while speaking
import RecipeReader from "./RecipeReader.js";

let websocket;
const synth = window.speechSynthesis;
const wsUri = "ws://localhost:2700";
const parserUri = "http://localhost:8000";
let listening = false;
let recipeReader;

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
    const phraseList = recipeReader?.createPhraseList();
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
      console.log("LISTENING...");
    } else if ("text" in json && listening) {
      console.log(`HEARD: ${json.text}`);
      listening = false;
      recipeReader.useCommand(json.text);
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

        if (websocket.readyState === WebSocket.OPEN && !synth.speaking) {
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
    recipeReader = new RecipeReader(synth, json);
  } catch (error) {
    console.error(error);
  }
}

function createPhraseList() {}
