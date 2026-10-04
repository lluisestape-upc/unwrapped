# Unwrapped: video and demo scripts

Two deliverables, two audiences:

1. **Online submission (due 5 Oct 2026 AoE):** one video, about 3 minutes.
   Intro to camera, a 30 s trailer, then a walkthrough with voiceover.
2. **Barcelona Demo Day (17 Oct 2026):** a spoken pitch, a flow for each
   visitor, a loop video for the booth screen, and a checklist.

Keys used below: `F` listen / wake, `E` take / place, `Q` silence, `Enter`
inside an effect, `W/S` value, `A/D` parameter, `L` next landscape, `M` another
mission, `H` tutorial, `T` trailer mode (hides every overlay, title in the sky
when you look up).

`[SONG]` is "I Still Break" by Parellite, the default world. Use a rights-free song or
one of your own, not Billie Jean or Get Lucky: YouTube Content ID will flag
those, and judges may notice.

---

## 1. Online submission video (~3:00)

Record at 1920x1080, 60 fps, with OBS capturing the browser window and its
audio. Record every trailer shot with `T` on. Record the walkthrough with `T`
off so the tutorial, missions and HUD are visible. Use a mouse, not the
trackpad: looking around is smoother.

### Part 1: intro to camera (0:00-0:08)

Face to camera, plain background, natural light.

> "Hi, I'm Lluís. I study audio engineering in Barcelona. When I was a kid I
> played my favourite songs on repeat and had no idea what was inside them.
> This is the game I wish someone had given me. This is Unwrapped."

Cut to black on the last word. Hold black for half a second.

### Part 2: trailer (0:08-0:40)

No voice. Music: `[SONG]`, the same song the world was built from. Cut on the
beat. Each line is one shot; the duration is a guide.

| # | Time | Shot | How to get it |
|---|------|------|---------------|
| 1 | 0:08 | Silent meadow, slow pan across sleeping instruments | Discover, `T` on, turn slowly |
| 2 | 0:12 | Walk up to the drums, they wake and the beat drops in | `F` on a downbeat |
| 3 | 0:15 | Bass wakes, then the voice: the song stacks up | `F`, `F`, quick cuts |
| 4 | 0:19 | The table falls out of the sky and lands with a shock ring | Wake the last instrument, look up at the centre |
| 5 | 0:22 | Close on the table: a reverb puck is set next to the singer, the wire lights up | `E` on the puck, `E` next to the voice token |
| 6 | 0:25 | Inside the effect: decay goes up, the graph stretches | `Enter`, hold `W` |
| 7 | 0:28 | Carrying the guitar across the field, the sound moving with it | `E` on the guitar, walk |
| 8 | 0:31 | Five landscapes in five beats: meadow, shore, blossom, snow, night | `L` on each beat |
| 9 | 0:35 | Words flying out of the singer (Lyrics mode) | Lyrics mode, only if `[SONG]` has vocals |
| 10 | 0:37 | Camera tilts up slowly; "Unwrapped" fades in across the sky | Look ahead, then tilt up slowly. Hold 3 s |

Fade to black. Music continues softly under Part 3.

### Part 3: walkthrough with voiceover (0:40-3:00)

`T` off. Voiceover recorded separately and laid over the capture is easier
than talking while playing.

**The gift (0:40-0:55).** Show the menu. Click "+ Make a world from your own
song", pick the file, let the progress bar run for a few seconds ("Finding the
instruments", "Tripo is building the drums"), then cut to the finished world.
This needs the local backend running (`firstsong-api`), so record this part on
the laptop, not on the published site.

> "Unwrapped is a gift for a kid. You pick the song they love, and it becomes
> a world they can take apart, to learn how music is made."

**How the world is made (0:55-1:15).** Show the asset board, then the folder of
models and `world.json` briefly.

> "The song is split into its instruments. For each one, a prompt is built
> from how it sounds, and Tripo generates the 3D model. Every word the singer
> sings becomes an object too. A different song gives a different world."

**Discover (1:15-1:45).** Discover from the start, tutorial visible.

> "It starts silent. Each instrument you find joins the song. The sound is
> spatial: walk towards the drums and they get closer; turn your head and the
> mix turns with you. Where you stand is the mix."

Walk between two instruments while talking, so the change is audible.

**The table (1:45-2:20).** The table lands. Pick a puck, place it, chain a
second one, go inside.

> "When the song is whole, a table falls from the sky. It is a mixing desk you
> play with objects, like the Reactable. Put an effect next to an instrument
> and it is on that instrument. Chain a second one after it. Go inside and you
> see what it does: this is reverb, this is how long the room rings."

Hold `F` inside the effect:

> "Hold F and you hear only what the effect adds."

**Missions (2:20-2:40).** Complete one mission on camera (the cathedral one
reads well): star, chime, the lesson line.

> "Missions give the kid a job a producer would do: put the singer in a
> cathedral, leave only the beat, make the bass growl. Each one is checked
> against the actual sound, so the only way to get the star is to make it."

**Moving things and starting over (2:40-2:50).** Carry an instrument, silence
one with `Q`, press the red button.

> "Instruments can be moved and silenced, and the red button puts everything
> back."

**Close (2:50-3:00).** Press `L` through two landscapes, then look up with `T`.

> "Unwrapped. For the kid I was, who wanted to know what was inside a song."

End card: the URL `lluisestape-upc.github.io/unwrapped` and "Made with Tripo".

---

## 2. Barcelona Demo Day (17 Oct 2026)

### Pitch (30 seconds)

English:

> "Unwrapped is a gift for a kid. You give it the song they love, and it
> becomes a world they can walk into and take apart. Every instrument is a
> 3D object made by Tripo, and the sound is spatial, so where you stand is the
> mix. Then they learn what producers do: reverb, echo, filters, missions with
> stars. Put these on and try it."

Spanish:

> "Unwrapped es un regalo para un niño. Le das la canción que le gusta y se
> convierte en un mundo en el que puede entrar y desmontarla. Cada instrumento
> es un objeto 3D generado con Tripo, y el sonido es espacial: donde estás es
> la mezcla. Luego aprende lo que hace un productor: reverb, eco, filtros,
> misiones con estrellas. Ponte los cascos y pruébalo."

Hand over the headphones on the last word.

### Each visitor (3-4 minutes)

1. Before they sit down: reset to Discover from scratch with the tutorial.
2. Let the tutorial talk. Say nothing for the first two instruments. The
   moment the second one joins is usually when they get it.
3. When the table lands, point at it: "that's a mixing desk".
4. Let them do one mission. If they are stuck, suggest the cathedral one.
5. Finish on the red button: "and everything goes back".
6. One line while they take the headphones off: "Imagine this with the song
   your kid listens to on repeat."

### Booth loop video

The 30 s trailer from Part 2, on loop, on a second screen or a tablet. Add a
small caption at the bottom: "Unwrapped: a song you can walk into".
Keep the volume low: the headphones are the real sound.

### Checklist

- Laptop and charger.
- Mouse (looking around with a trackpad is hard for visitors).
- Two pairs of headphones and a splitter.
- The game running locally, not from the Wi-Fi.
- The submission video on the laptop and a USB stick, in case the live demo
  fails.
- `[SONG]` as the default world.

### Questions judges are likely to ask

- **"How is Tripo used?"** Every instrument and every sung word is a Tripo
  model, generated from a prompt built from the audio. A new song means new
  models.
- **"Who pays?"** Parents and relatives buying it as a gift, one world per
  song. Later, music schools and teachers.
- **"What about copyright of the songs?"** The world is built privately for
  the person who gives it; nothing is published. For demos I use my own
  song.
- **"What's next?"** Headset (VR) version, more effects, missions that follow a
  real production course.
