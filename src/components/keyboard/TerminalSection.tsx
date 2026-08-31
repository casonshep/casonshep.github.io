"use client";

// The scroll-down section below the landing hero: its faulty-terminal ASCII
// background is drawn by the unified backdrop canvas (VideoBackdrop), which
// composites the video and the terminal into one continuous character grid.
// Swap the placeholder copy for real content.
export default function TerminalSection() {
  return (
    <section className="relative z-20 flex min-h-dvh w-full items-center justify-center overflow-hidden">
      <div
        className="relative"
        style={{
          zIndex: 1,
          maxWidth: "40rem",
          margin: "clamp(1rem, 4vw, 2rem)",
          padding: "clamp(1.5rem, 4vw, 2.5rem)",
          background: "rgba(0,0,0,0.62)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "12px",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "#f0f0f2",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
            fontWeight: 700,
            letterSpacing: "0.01em",
          }}
        >
          about
        </h2>
        <p
          style={{
            marginTop: "1rem",
            marginBottom: 0,
            fontSize: "clamp(0.85rem, 1.4vw, 1rem)",
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          placeholder — put something real here. who you are, what you build,
          what you&apos;re into. this card sits on the faulty-terminal ascii
          background; add more cards or sections below as the site grows.
        </p>
      </div>
    </section>
  );
}
