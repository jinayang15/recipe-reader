import { useState } from "react";
import RecipeReader from "./RecipeReader";
// TODO: create phrase list based on recipe
// TODO: add functionality to "navigate" recipe with voice
// TODO: migrate to TS
// TODO: read out groups of ingredients
// TODO: ask how much of a certain ingredient is needed
// TODO: allow it to be interruptable instead of disabling listening while speaking



function App() {
  let websocket;
  let recipeReader;
  const synth = window.speechSynthesis;
  const wsUri = "ws://localhost:2700";
  const parserUri = "http://localhost:8000";

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
      recipeReader = new RecipeReader(synth, json);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <div>
        <input type="text" onChange={handleRecipeLink}></input>
        <button onClick={parseRecipe}>Parse recipe</button>
      </div>
      <button
        onClick={() => {
          setIsRecording(!isRecording);
        }}
      >
        {isRecording ? "Recording..." : "Start recording"}
      </button>
    </>
  );
}

export default App;
