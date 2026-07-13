import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * REUSABLE 9:16 REEL TEMPLATE
 * Claude Code edits the 3 blocks marked EDIT per brand:
 *   1) BRAND — colors + wordmark
 *   2) SCRIPT — the caption beats
 *   3) (optional) drop a real logo.png in public/ and swap the text wordmark for <Img>
 * Render:  npx remotion render src/index.ts ReelTemplate out/reel.mp4
 * Preview: npm run dev   (Remotion Studio)
 */

// ── 1) BRAND — EDIT these per brand ───────────────────────────────────────────
const BRAND = {
  dark: "#1B1C1E", // background
  accent: "#55B8B0", // highlight / CTA
  white: "#FFFFFF",
  dim: "rgba(255,255,255,0.55)",
  wordmark: "YOURBRAND", // becomes the logo badge (or swap for a real logo.png)
  cta: "yourbrand.com",
  ctaSub: "Your call to action",
};

// ── 2) SCRIPT — EDIT these beats (each is one scene) ──────────────────────────
// Keep lines short; one strong idea per beat. teal:true = highlighted word.
const BEATS: { eyebrow?: string; lines: { t: string; teal?: boolean }[] }[] = [
  { lines: [{ t: "Your" }, { t: "hook" }, { t: "goes" }, { t: "here.", teal: true }] },
  { eyebrow: "The point", lines: [{ t: "One" }, { t: "clear" }, { t: "idea." }, { t: "Proof.", teal: true }] },
  { eyebrow: "Why it matters", lines: [{ t: "Say" }, { t: "the" }, { t: "thing" }, { t: "that", teal: true }, { t: "lands." }] },
  { lines: [{ t: "Make" }, { t: "it" }, { t: "real,", teal: true }, { t: "not" }, { t: "hype." }] },
];

const DISPLAY = "'Arial Black', Arial, sans-serif";
const BODY = "'Arial', sans-serif";
const FPS = 30;

const Word: React.FC<{ children: string; from: number; teal?: boolean; size: number }> = ({
  children,
  from,
  teal,
  size,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - from, fps, config: { damping: 15, stiffness: 150, mass: 0.9 } });
  const y = interpolate(p, [0, 1], [70, 0]);
  const opacity = interpolate(p, [0, 0.25, 1], [0, 1, 1], { extrapolateRight: "clamp" });
  return (
    <span
      style={{
        display: "inline-block",
        transform: `translateY(${y}px)`,
        opacity,
        color: teal ? BRAND.accent : BRAND.white,
        fontSize: size,
        fontFamily: DISPLAY,
        fontWeight: 900,
        letterSpacing: -2,
        lineHeight: 1.04,
        marginRight: 22,
      }}
    >
      {children}
    </span>
  );
};

const Eyebrow: React.FC<{ children: string }> = ({ children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        opacity,
        fontFamily: BODY,
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: 5,
        textTransform: "uppercase",
        color: BRAND.accent,
        marginBottom: 28,
      }}
    >
      {children}
    </div>
  );
};

const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: BRAND.dark,
      backgroundImage: `radial-gradient(${BRAND.accent}1A 3px, transparent 3px)`,
      backgroundSize: "48px 48px",
    }}
  >
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 16, backgroundColor: BRAND.accent }} />
    {/* Logo badge (text wordmark). To use a real logo: put logo.png in public/ and
        replace this block with <Img src={staticFile("logo.png")} style={{height:58}} /> */}
    <div style={{ position: "absolute", bottom: 96, left: 110, background: BRAND.white, borderRadius: 16, padding: "16px 24px" }}>
      <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 38, color: BRAND.dark, letterSpacing: -1 }}>
        {BRAND.wordmark}
      </span>
    </div>
  </AbsoluteFill>
);

export const ReelTemplate: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const scenes = BEATS.length + 1; // beats + CTA
  const per = Math.floor(durationInFrames / scenes);

  return (
    <AbsoluteFill>
      <Backdrop />

      {/* Optional music — remove this block to render silent */}
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) =>
          interpolate(f, [0, 15, durationInFrames - 30, durationInFrames], [0, 0.5, 0.5, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {BEATS.map((beat, i) => (
        <Sequence key={i} from={i * per} durationInFrames={per}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 110px" }}>
            {beat.eyebrow ? <Eyebrow>{beat.eyebrow}</Eyebrow> : null}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline" }}>
              {beat.lines.map((w, j) => (
                <Word key={j} from={6 + j * 6} teal={w.teal} size={92}>
                  {w.t}
                </Word>
              ))}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* CTA scene */}
      <Sequence from={BEATS.length * per} durationInFrames={durationInFrames - BEATS.length * per}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 110px" }}>
          <Eyebrow>Your seat</Eyebrow>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            <Word from={6} size={92}>
              {BRAND.ctaSub}
            </Word>
          </div>
          <CTAPill />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const CTAPill: React.FC = () => {
  const frame = useCurrentFrame();
  const p = spring({ frame: frame - 30, fps: FPS, config: { damping: 16, stiffness: 140 } });
  const scale = interpolate(p, [0, 1], [0.8, 1]);
  const opacity = interpolate(p, [0, 0.3, 1], [0, 1, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        marginTop: 44,
        transform: `scale(${scale})`,
        transformOrigin: "left center",
        opacity,
        background: BRAND.accent,
        color: "#0F1112",
        fontFamily: DISPLAY,
        fontWeight: 900,
        fontSize: 46,
        padding: "26px 44px",
        borderRadius: 18,
        letterSpacing: -1,
      }}
    >
      {BRAND.cta}
    </div>
  );
};
