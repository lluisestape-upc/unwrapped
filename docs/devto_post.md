---
title: "Unwrapped: turning a kid's favourite song into a world they can take apart"
published: false
description: A browser game for Tripothon S1 that splits a song into instruments, turns each one into a Tripo 3D model, and teaches music production by letting you walk around inside the mix.
tags: gamedev, javascript, webaudio, ai
cover_image: 
---

When I was a kid I played my favourite songs on repeat and had no idea what was inside them. Which sound was the bass? Why did the voice sound far away? What made the chorus hit harder? A song felt like a sealed box.

I study audio engineering now, and for Tripothon S1, Tripo's world-building hackathon (theme: *a world as a gift*), I built the game I wish someone had given me: **Unwrapped**. You give it a song, and it becomes a 3D world where every instrument stands in a field and you can walk between them, pick them up, silence them and put effects on them.

**Play it in the browser:** https://lluisestape-upc.github.io/unwrapped/
**Code:** https://github.com/lluisestape-upc/unwrapped

## What it feels like

You start in silence. The song has been split into its instruments, and each one is standing somewhere on a beach, asleep. Walk up to the drums and press F: the beat comes in. Find the bass, then the voice, and the song assembles itself layer by layer. When the last instrument wakes up, a table falls out of the sky.

The sound is spatial, so **where you stand is the mix**. Walk towards the guitar and it gets louder; turn your head and the whole mix turns with you. Carry an instrument across the field and its sound travels with it.

The table is a mixing desk you play with objects, borrowed from the [Reactable](https://reactable.com/) grammar: put an effect puck next to an instrument and it is on that instrument; put another one next to the first and they chain. Step inside an effect and you see what it does: the reverb's decay, the delay's echoes on the beat grid, the filter's curve, the distortion's transfer function. Hold F and you hear *only* what the effect adds.

On top of that there is a tutorial that waits for you to actually do each thing, missions with stars ("put the singer in a cathedral", "leave only the beat", "make the bass growl"), five landscapes, and a Lyrics mode where every noun the singer sings becomes an object flying out of the singer.

## The pipeline: from a song to a world

```
song.mp3
  -> Demucs (htdemucs_6s)        split into drums, bass, vocals, guitar, piano, other
  -> librosa                      tempo, beats, key, and per-stem descriptors
  -> prompt builder               descriptors -> words -> a prompt per instrument
  -> Tripo API (text to model)    one textured 3D model per instrument
  -> faster-whisper + spaCy       sung nouns with timestamps -> more Tripo models
  -> world.json                   positions, prompts, models, beats, landscape
```

### Sound becomes the prompt

The part I like most is that the 3D model depends on how the instrument actually sounds. Each stem is measured (brightness, density, noisiness), and each measurement picks a word from a band in a small vocabulary:

```python
subject   = _stable_choice(role["subject"], seed)              # "acoustic guitar standing upright"
material  = _band_word(vocab, "brightness", features["brightness"], seed)
size      = _band_word(vocab, "density",    features["density"],    seed)
condition = _band_word(vocab, "noisiness",  features["noisiness"],  seed)

prompt = f"{article} {size} {subject}, built from {material}, {condition}, {style}"
```

So a bright, clean guitar and a dark, distorted one come out as different objects. A different song gives a different world.

The words in the lyrics go through a lexicon first, because abstract words need a symbol a kid would draw: *luck* becomes a four-leaf clover, *time* becomes a clock. Shared objects are cached, so a heart is paid for once across every song.

### Spending credits safely

Tripo generation is asynchronous, so the client submits a task and polls it. Two things saved me credits: a retrying HTTP adapter with a poll loop that tolerates dropped connections (a network blip once charged me for a model I never downloaded), and writing `world.json` after every successful model, so a run that dies halfway keeps what it paid for. Word models generate in parallel with a thread pool: one at a time, a song's worth of objects took most of an hour.

## The browser side: three.js and Web Audio

No game engine: three.js for the world, the Web Audio API for everything you hear, so it runs from a link.

Every stem is its own graph:

```
BufferSource -> Gain -> [effects chain] -> Panner (HRTF) -> Analyser -> master
```

The `PannerNode` uses the HRTF model and follows the camera as the listener, which is what makes "walk towards the drums" work. The analyser feeds each instrument's loudness back into the visuals: they pulse, glow, and the fireflies get brighter when the song is loud.

The effects are real nodes: a `ConvolverNode` with a generated impulse response for the reverb, a tempo-synced feedback `DelayNode` with a lowpass in the loop, a `BiquadFilterNode` whose `getFrequencyResponse` draws its own graph, and a `WaveShaperNode` with a tanh curve for distortion, with its wet level compensated so it doesn't just get louder.

The tricky part was the table. Chains are rebuilt from the positions of the pucks every frame (greedy nearest link under a distance threshold), and rewiring Web Audio naively produces cuts: disconnecting chain A while chain B still references a node you are about to move. The fix was boring and reliable: when anything changes, tear every chain down first, then wire every chain up.

### Missions that check the sound, not the keys

Each mission is a predicate over the real state of the mix, checked every frame. For example, the cathedral:

```js
{ id: 'cathedral', needs: ['vocals'],
  text: 'Put the singer in a cathedral: Reverb on the voice, decay over 4 seconds',
  check: () => value(effectOn('vocals', 'reverb'), 'decay') >= 4 }
```

The only way to get the star is to make the sound. Missions that need an instrument the song doesn't have are simply not offered.

## What I'd do next

A headset (VR) version where you reach out and grab the instruments, more effects, and missions that follow a real production course. And hosting the pipeline so anyone can upload their own song from the website; for now that runs on my laptop.

If you try it, put headphones on: the spatial audio is half the game.

*Built for Tripothon S1. Music in the demo: "I Still Break" by Parellite.*
