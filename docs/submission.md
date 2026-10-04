# Unwrapped: submission text

Paste-ready text for the Tripothon S1 form. Fields follow the usual hackathon
layout; trim to whatever lengths the form allows.

- **Project name:** Unwrapped
- **Tagline:** A kid's favourite song, turned into a world they can walk into
  and take apart, to learn how music is made.
- **Direction track:** Game (alternative: Application)
- **Tool track:** Tripo
- **Play:** https://lluisestape-upc.github.io/unwrapped/
- **Asset board:** https://lluisestape-upc.github.io/unwrapped/board.html
- **Code:** https://github.com/lluisestape-upc/unwrapped
- **Video:** `[YOUTUBE LINK]`

---

## Inspiration

When I was a kid I played my favourite songs on repeat and had no idea what was
inside them: which sound was the bass, why the voice sounded far away, what
made the chorus hit harder. Years later I study audio engineering, and I still
remember how closed a song felt from the outside.

Unwrapped is the gift I would have wanted: give a kid the song they love, and
it becomes a place they can open up.

## What it does

You give Unwrapped a song. It becomes a 3D world where every instrument is an
object standing in a field, and the sound is spatial: walk towards the drums
and they get louder; turn your head and the mix turns with you. Where you stand
is the mix.

- **Discover:** the world starts silent. Each instrument you find joins the
  song, one layer at a time, until the whole track is playing. Then a table
  falls from the sky.
- **The table:** a mixing desk you play with objects, inspired by the
  Reactable. Set an effect (reverb, delay, filter, distortion) next to an
  instrument and it is on that instrument; set another next to it and it
  chains. Step inside an effect to see what it does: the reverb's decay, the
  delay's echoes on the beat grid, the filter's curve. Hold a key to hear only
  what the effect adds.
- **Missions:** jobs a producer would do, each worth a star: put the singer in
  a cathedral, leave only the beat, make the bass growl. Each mission is
  checked against the actual sound, so the only way to earn the star is to
  make it.
- **Lyrics:** every noun the singer sings becomes an object that flies out of
  the singer the moment it is sung, and grows each time it comes back.
- Instruments can be carried, silenced and soloed; a red button puts
  everything back. Five landscapes (meadow, sunset shore, spring blossom,
  snow, summer night) that react to the song's loudness.
- A tutorial teaches every control by waiting for the player to do it.

## How Tripo is used

Tripo generates every 3D object in the game, and what it generates depends on
the song:

1. The song is split into instruments (Demucs).
2. Each instrument's sound is measured: how bright, how dense and how noisy
   it is.
3. Those measurements become the prompt for that instrument's model:
   brightness picks the material, density the size, noisiness the condition.
   A bright, clean guitar and a dark, distorted one come out as different
   objects.
4. Tripo turns each prompt into a textured 3D model (text to model, API).
5. The singer's words are transcribed (faster-whisper); every noun becomes a
   prompt and a Tripo model too. Shared objects are cached, so a heart is paid
   for once across every song.

A different song gives a different world. The asset board shows every model
with the prompt that made it.

## How I built it

- **Frontend:** three.js and the Web Audio API, no game engine, so it runs in
  any browser from a link. Each instrument is an HRTF-panned source; effects
  are real Web Audio graphs (convolution reverb with a generated impulse
  response, tempo-synced feedback delay, biquad filter, waveshaper
  distortion), rewired live as objects move on the table.
- **Pipeline:** Python. Demucs for stems, librosa for descriptors and beats,
  faster-whisper and spaCy for the sung nouns, the Tripo API for models,
  Pillow to slim textures for the web.
- **Hosting:** a static build on GitHub Pages; no server needed to play.

## Challenges

- Making every effect understandable to a kid without words: each one got its
  own live graph, and a "hear only the effect" key.
- Proximity routing on the table: chains rebuild every frame from where the
  objects are, without clicks or dropouts in the audio.
- Turning sound into prompts that give recognisable, distinct instruments.

## What I'm proud of

That it is a complete game you can play right now in a browser, and that the
learning is real: every star is checked against the sound itself.

## What's next

A headset (VR) version where you reach out and grab the instruments, more
effects, and a mission path that follows a real production course.

## Built with

three.js, Web Audio API, Tripo API, Demucs, librosa, faster-whisper, spaCy,
Python, Vite, GitHub Pages

## Music

The demo video uses "I Still Break" by Parellite, licensed from Epidemic Sound.
