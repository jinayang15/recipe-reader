import type Recipe from "./Recipe.js";

export default class RecipeReader {
  synth: SpeechSynthesis;
  instructionIdx: number;
  instructionsLength: number;
  instructionsList: Array<string>;
  commandsMap: Map<string, (...args: string[]) => void>;

  constructor(synth: SpeechSynthesis, recipe: Recipe) {
    this.synth = synth;
    this.instructionIdx = 0;
    this.instructionsList = recipe.instructions_list;
    this.instructionsLength = this.instructionsList.length;
    this.commandsMap = new Map();
    console.log(this.instructionIdx, "constructor");
    this.setCommands();
  }

  private setCommands() {
    this.commandsMap.set(
      "current instruction",
      this.currentInstruction.bind(this)
    );
    this.commandsMap.set("next instruction", this.nextInstruction.bind(this));
    this.commandsMap.set(
      "previous instruction",
      this.previousInstruction.bind(this)
    );
  }

  public useCommand(command: string) {
    if (this.commandsMap.has(command)) {
      this.commandsMap.get(command)?.();
    }
  }

  private currentInstruction() {
    console.log(this.instructionIdx);
    if (
      this.instructionIdx < 0 ||
      this.instructionIdx >= this.instructionsLength
    ) {
      const utter = new SpeechSynthesisUtterance("No current instruction");
      this.synth.speak(utter);
    }

    const instruction = new SpeechSynthesisUtterance(
      this.instructionsList[this.instructionIdx]
    );
    this.synth.speak(instruction);
  }
  private nextInstruction() {
    if (
      this.instructionIdx < 0 ||
      this.instructionIdx >= this.instructionsLength - 1
    ) {
      const utter = new SpeechSynthesisUtterance("No next instruction");
      this.synth.speak(utter);
      return;
    }

    this.instructionIdx++;
    const instruction = new SpeechSynthesisUtterance(
      this.instructionsList[this.instructionIdx]
    );
    this.synth.speak(instruction);
  }
  private previousInstruction() {
    if (
      this.instructionIdx === 0 ||
      this.instructionIdx >= this.instructionsLength
    ) {
      const utter = new SpeechSynthesisUtterance("No previous instruction");
      this.synth.speak(utter);
      return;
    }

    this.instructionIdx--;
    const instruction = new SpeechSynthesisUtterance(
      this.instructionsList[this.instructionIdx]
    );
    this.synth.speak(instruction);
  }

  public createPhraseList() {
    return Array.from(this.commandsMap.keys()).concat(["[unk]"]);
  }
}
