class Processor extends AudioWorkletProcessor {
  constructor() {
    super();
  }
  process(inputs, outputs, parameters) {
    // grab first (and only) input
    const input = inputs[0];
    if (!input || input.length === 0) {
      return true; // keep alive even if no input this block
    }

    // determine whether the audio is mono or stereo based on the number of channels
    const ch0 = input[0]; // left or mono
    const ch1 = input[1] || null; // right if present
    // if no channels, stop
    if (!ch0) return true;

    const frames = ch0.length;
    // Float32Array is how the audio samples are typically represented
    // (canonical representation)
    const mono = new Float32Array(frames);

    // check if right exists to determine if stereo
    if (ch1) {
      for (let i = 0; i < frames; i++) {
        mono[i] = (ch0[i] + ch1[i]) * 0.5; // downmix stereo to mono
      }
    } else {
      mono.set(ch0); // already mono
    }

    // Send to main thread; transfer buffer to avoid copy
    this.port.postMessage(mono.buffer, [mono.buffer]);

    return true;
  }
}

registerProcessor("processor", Processor);
