# RiseFour

Four-bar rise desk for bedroom producers and AI-music finishers.

Loops stall. Next section needs a way in.
RiseFour writes four live-instrument bars that build intensity bar by bar — add a chair, open the hats, walk the bass, stab the brass — so the landing has earned energy.

Live samples only — FluidR3 acoustic grand, upright bass, nylon guitar, trumpet, violin, acoustic kit from the PreEight sample CDN pinned to commit `d58301e4a494555f411a2afbc448b724136eee76`.

No oscillators. Audio never leaves the tab.

## Distinct from the line

| Tool | Job |
| --- | --- |
| TagFour | Last-line tag after money chorus |
| LiftTwo | Two-bar pre-hook lift |
| PreEight | Eight-bar pre-chorus climb |
| TensionFour | Pedal hold while harmony moves |
| StackFour | Instruments stack one per bar |
| **RiseFour** | Four bars of progressive intensity rise into the next section |

Yesterday's ship was TwistEight. RiseFour is the short, focused rise that makes the next section land.

## Form

1–4 pocket · 5–8 rise · bar 9 is the landing

## Milestone: Production WAV export

- OfflineAudioContext render
- Exact length: Math.round(bars * 4 * 60 / bpm * 48000)
- First downbeat at sample 0
- Tail folded for seamless loop
- Peak normalized ≤ -1 dBFS
- 48 kHz 24-bit stereo
- Filename: risefour-recipe-<bpm>bpm-<key>.wav

MIDI export and full license gate remain next milestones. Not yet called shipped.

## Pricing recommendation

One-time **$19** on Gumroad (mirror Lemon Squeezy).

This is a finite desk, not a cloud meter. Do not subscribe it.

Best place to sell: Gumroad next to the other live-chair desks, with a pinned X demo. Bedroom finishers buy $9–$29 one-shots.

Current app is free (MIT). A priced build would need a license gate.

## Stack

Static HTML/CSS/JS. Deploy on Vercel team `release-forge`.

## License

MIT. workinwithai-create.
