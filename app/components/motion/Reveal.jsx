"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Landing-page reveal helpers built on Motion.
 *
 * Every animation collapses to a plain fade when the visitor has
 * `prefers-reduced-motion` set, so nothing is forced on users who asked for
 * less movement.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0 },
};

const fadeLeft = {
  hidden: { opacity: 0, x: -28 },
  shown: { opacity: 1, x: 0 },
};

const fadeRight = {
  hidden: { opacity: 0, x: 28 },
  shown: { opacity: 1, x: 0 },
};

const variants = { up: fadeUp, left: fadeLeft, right: fadeRight };

const EASE = [0.22, 1, 0.36, 1];

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  className,
  as = "div",
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] ?? motion.div;

  return (
    <MotionTag
      className={className}
      initial={reduceMotion ? "shown" : "hidden"}
      whileInView="shown"
      viewport={{ once: true, amount: 0.25 }}
      variants={reduceMotion ? fadeUp : variants[direction]}
      transition={
        reduceMotion
          ? { duration: 0.2 }
          : { duration, delay, ease: EASE }
      }
    >
      {children}
    </MotionTag>
  );
}

/** Parent for a staggered group; pair each child with <StaggerItem>. */
export function Stagger({
  children,
  className,
  delay = 0,
  interval = 0.12,
  as = "div",
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] ?? motion.div;

  return (
    <MotionTag
      className={className}
      initial={reduceMotion ? "shown" : "hidden"}
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: reduceMotion ? 0 : interval, delayChildren: delay } },
      }}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({
  children,
  direction = "up",
  className,
  as = "div",
}) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] ?? motion.div;

  return (
    <MotionTag
      className={className}
      variants={reduceMotion ? fadeUp : variants[direction]}
      transition={reduceMotion ? { duration: 0.2 } : { duration: 0.55, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}