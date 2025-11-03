import { useState, useRef } from "react";
import RecipeReader from "./classes/RecipeReader";
import processorUrl from "./classes/Processor.ts?worker&url";

// TODO: create phrase list based on recipe
// TODO: add functionality to "navigate" recipe with voice
// TODO: migrate to TS
// TODO: read out groups of ingredients
// TODO: ask how much of a certain ingredient is needed
// TODO: allow it to be interruptable instead of disabling listening while speaking

function App() {
  const wsUri = "ws://localhost:2700";
  const parserUri = "http://localhost:8000";

  const websocketRef = useRef<WebSocket | null>(null);
  const recipeReaderRef = useRef<RecipeReader | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recipeLink, setRecipeLink] = useState("");

  function handleRecipeLink(event: React.ChangeEvent<HTMLInputElement>) {
    setRecipeLink(event.target.value);
  }

  async function parseRecipe() {
    const reqBody = { link: recipeLink };
    try {
      const response = await fetch(parserUri + "/parse", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });
      const json = await response.json();
      console.log(json);
      recipeReaderRef.current = new RecipeReader(window.speechSynthesis, json);
    } catch (error) {
      console.error(error);
    }
  }

  function connectWebsocketClient() {
    websocketRef.current = new WebSocket(wsUri);

    // connecting to server
    websocketRef.current.addEventListener("open", () => {
      console.log("CONNECTED");
      // TODO: make sure there is a recipe before accepting voice commands
      if (recipeReaderRef.current) {
        const phraseList = recipeReaderRef.current.createPhraseList();
        if (phraseList && websocketRef.current) {
          websocketRef.current.send(
            JSON.stringify({
              config: {
                phrase_list: phraseList,
              },
            })
          );
        }
        startListening();
      }
    });

    // error handling
    websocketRef.current.addEventListener("error", (e) => {
      console.log(`ERROR`);
    });

    // receiving messages
    websocketRef.current.addEventListener("message", (e) => {
      const json = JSON.parse(e.data);
      if ("partial" in json) {
        console.log("LISTENING...");
      } else if ("text" in json) {
        console.log(`HEARD: ${json.text}`);
        // TODO: make sure this question mark actually needs to be here
        // or if it was just a shortcut
        recipeReaderRef.current?.useCommand(json.text);
      }
    });

    // handling disconnect
    websocketRef.current.addEventListener("close", () => {
      console.log("DISCONNECTED");
    });
  }

  async function startListening() {
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
      await audioContext.audioWorklet.addModule(processorUrl);
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
        if (
          websocketRef.current?.readyState === WebSocket.OPEN &&
          !window.speechSynthesis.speaking
        ) {
          websocketRef.current.send(pcm16.buffer);
        }
      };
    } catch (error) {
      console.error(error);
      alert("Failed to access microphone");
    }
  }

  function handleRecordToggle() {
    if (isRecording) {
      setIsRecording(false);
      // TODO: make sure this question mark actually needs to be here
      // or if it was just a shortcut
      websocketRef.current?.close(1000, "Client disconnect...");
    } else {
      setIsRecording(true);
      connectWebsocketClient();
    }
  }

  return (
    <>
      {
        // TODO: separate out the recipe link and
        // the record button into diff components
      }
      <div>
        <input type="text" onChange={handleRecipeLink}></input>
        <button onClick={parseRecipe}>Parse recipe</button>
      </div>
      <button onClick={handleRecordToggle}>
        {isRecording ? "Recording..." : "Start recording"}
      </button>
    </>
  );
}

export default App;
