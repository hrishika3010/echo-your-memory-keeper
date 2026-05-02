import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const polaroids = [
  { src: "/p1.jpg", caption: "aug 14 — mensho ramen", tilt: -6 },
  { src: "/p2.jpg", caption: "priya's birthday — sept", tilt: 3 },
  { src: "/p3.jpg", caption: "bookstore w/ maya", tilt: -2 },
];

const steps = [
  {
    n: "01",
    title: "connect your photos",
    body:
      "drop your favorite folder in. echo learns the shape of your memories — the people, the places, the small moments your brain didn't bother to keep.",
    img: "/step1.jpg",
    tilt: -3,
  },
  {
    n: "02",
    title: "text echo like a friend",
    body:
      "\"what was that bookshop in mission.\" \"when did i last see priya.\" \"show me a happy day.\" you don't have to remember the exact words. echo will know what you mean.",
    img: "/step2.jpg",
    tilt: 4,
  },
  {
    n: "03",
    title: "get a memory back",
    body:
      "not a search result. a polaroid. a sentence. the moment, the way you actually remember it.",
    img: "/step3.jpg",
    tilt: -2,
  },
];

const threads = [
  {
    q: "who recommended that book",
    a: "your sister, on the plane home for thanksgiving. you said you'd read it. you haven't.",
  },
  {
    q: "what did i wear to priya's wedding",
    a: "cream linen, the gold earrings from your mom. you danced for 4 hours.",
  },
  {
    q: "show me a happy day this year",
    a: "march 12. the picnic at golden gate. you laughed so hard you cried.",
  },
  {
    q: "last time i called mom",
    a: "11 days ago. she asked when you were coming home. you said soon.",
  },
];

function Polaroid({
  src,
  caption,
  tilt,
  float = false,
  size = "w-56 sm:w-64",
  fadeIn = false,
}: {
  src: string;
  caption: string;
  tilt: number;
  float?: boolean;
  size?: string;
  fadeIn?: boolean;
}) {
  const Wrapper: any = fadeIn ? motion.div : "div";
  const wrapperProps = fadeIn
    ? {
        initial: { opacity: 0, rotate: 0, y: 20 },
        whileInView: { opacity: 1, rotate: tilt, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
      }
    : { style: { transform: `rotate(${tilt}deg)` } };

  return (
    <Wrapper
      {...wrapperProps}
      className={`${size} bg-polaroid p-3 pb-10 polaroid-shadow transition-transform duration-700 hover:rotate-0`}
    >
      <div
        className={float ? "float-tilt" : ""}
        style={{ ["--tilt" as any]: `${tilt}deg` }}
      >
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img
            src={src}
            alt={caption}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
        <p className="font-handwritten mt-3 text-center text-lg text-muted-foreground">
          {caption}
        </p>
      </div>
    </Wrapper>
  );
}

function Thread({ q, a, index }: { q: string; a: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [showQ, setShowQ] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!inView) return;
    const words = a.split(" ");
    let i = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    const t1 = setTimeout(() => setShowQ(true), 150);
    const t2 = setTimeout(() => setTyping(true), 700);
    const t3 = setTimeout(() => {
      interval = setInterval(() => {
        i++;
        setTyped(words.slice(0, i).join(" "));
        if (i >= words.length) {
          setTyping(false);
          if (interval) clearInterval(interval);
        }
      }, 80);
    }, 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (interval) clearInterval(interval);
    };
  }, [inView, a]);

  return (
    <div
      ref={ref}
      className="bg-polaroid p-6 polaroid-shadow"
      style={{ transform: `rotate(${index % 2 === 0 ? -0.6 : 0.5}deg)` }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={showQ ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.35 }}
            className="max-w-[80%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-[15px] text-foreground"
          >
            {q}
          </motion.div>
        </div>
        <div className="flex justify-start">
          {typing && !typed ? (
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-ink/90 px-4 py-3.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-background/70 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-background/70 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-background/70" />
            </div>
          ) : (
            typed && (
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-ink px-4 py-2.5 text-[15px] leading-snug text-background">
                {typed}
                {typed.length < a.length && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-background/70 align-middle" />
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  img,
  tilt,
  reverse,
}: {
  n: string;
  title: string;
  body: string;
  img: string;
  tilt: number;
  reverse: boolean;
}) {
  return (
    <div
      className={`grid items-center gap-12 md:grid-cols-2 md:gap-20 ${
        reverse ? "md:[&>*:first-child]:order-2" : ""
      }`}
    >
      <div className="max-w-md">
        <div className="font-serif text-7xl text-muted-foreground/40 sm:text-8xl">
          {n}
        </div>
        <h3 className="font-serif-i mt-2 text-4xl text-foreground sm:text-5xl">
          {title}
        </h3>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {body}
        </p>
      </div>
      <div className="flex justify-center">
        <Polaroid
          src={img}
          caption={title}
          tilt={tilt}
          fadeIn
          size="w-72 sm:w-80"
        />
      </div>
    </div>
  );
}

const Index = () => {
  return (
    <main className="grain min-h-screen bg-background text-foreground">
      {/* nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="#" className="font-serif-i text-2xl">
          echo
        </a>
        <div className="flex items-center gap-5 text-sm text-muted-foreground sm:gap-8">
          <a href="#how" className="hover:text-foreground">
            how it works
          </a>
          <a href="#examples" className="hidden hover:text-foreground sm:inline">
            examples
          </a>
          <a href="#cta" className="text-[hsl(var(--accent))] hover:opacity-80">
            get started
          </a>
        </div>
      </nav>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center sm:pt-32 sm:pb-32">
        <h1 className="font-serif-i text-7xl leading-[0.95] sm:text-8xl md:text-[10rem]">
          echo
        </h1>
        <p className="font-serif-i mx-auto mt-8 max-w-2xl text-2xl leading-snug text-muted-foreground sm:text-3xl">
          text it anything you've forgotten.
          <br />
          it texts you back the memory.
        </p>

        <div className="mt-20 flex flex-col items-center justify-center gap-8 sm:mt-24 sm:flex-row sm:gap-[-1rem]">
          {polaroids.map((p, i) => (
            <div
              key={p.src}
              className={i === 1 ? "sm:-mx-4 sm:translate-y-4" : ""}
            >
              <Polaroid
                src={p.src}
                caption={p.caption}
                tilt={p.tilt}
                float
              />
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <h2 className="font-serif-i text-5xl text-foreground sm:text-6xl">
          how it works
        </h2>
        <div className="mt-20 flex flex-col gap-28 sm:gap-36">
          {steps.map((s, i) => (
            <Step key={s.n} {...s} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* examples */}
      <section id="examples" className="bg-section-alt py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif-i text-5xl sm:text-6xl">
            what people text echo
          </h2>
          <div className="mt-16 grid gap-8 sm:gap-10 md:grid-cols-2">
            {threads.map((t, i) => (
              <Thread key={i} q={t.q} a={t.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* trust */}
      <section className="mx-auto max-w-3xl px-6 py-28 text-center sm:py-40">
        <p className="font-serif-i text-3xl leading-snug sm:text-4xl">
          your memories live in your drive.
          <br />
          echo just helps you find them.
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm text-muted-foreground">
          we never store your photos. we only remember what you ask us to remember.
        </p>
      </section>

      {/* cta */}
      <section id="cta" className="bg-ink py-28 text-background sm:py-36">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif-i text-5xl sm:text-6xl">save the number.</h2>
          <p className="mx-auto mt-6 max-w-lg text-base text-background/70 sm:text-lg">
            no app to download. echo lives in the messages where your memories
            already happen.
          </p>
          <a
            href="#"
            className="mt-12 inline-block rounded-full bg-[hsl(var(--accent))] px-10 py-4 text-base text-[hsl(var(--accent-foreground))] transition-transform duration-300 hover:scale-[1.02]"
          >
            add echo to imessage
          </a>
        </div>
      </section>

      {/* footer */}
      <footer className="py-10 text-center">
        <p className="text-xs text-muted-foreground">
          echo, 2026 · a quiet place for your memories
        </p>
      </footer>
    </main>
  );
};

export default Index;
