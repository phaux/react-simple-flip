/**
 * Options for {@link createSpring}.
 */
export interface SpringOptions {
  /**
   * Physical spring mass in kg.
   *
   * Mass mostly influences animation duration.
   * More mass means more inertia, which makes the spring accelerate slower.
   *
   * @default 0.5kg
   */
  mass?: number | undefined
  /**
   * Physical damping coefficient in kg/s.
   * Damping is a measure of resistance to motion.
   *
   * Damping mostly controls maximum velocity the spring can accelerate to.
   * More damping means the spring will move slower or jiggle less if it overshoots.
   *
   * @default 24kg/s
   */
  damping?: number | undefined
  /**
   * Physical spring stiffness in N/m.
   * Stiffness is the spring constant, which represents the force needed to compress or extend a spring by a unit length.
   *
   * Stiffness mostly controls spring's acceleration.
   * More stiffness means the spring will accelerate faster and overshoot more.
   *
   * @default 300N/m
   */
  stiffness?: number | undefined
  /**
   * Initial velocity in m/s.
   *
   * @default 0m/s
   */
  velocity?: number | undefined
  /**
   * Number of samples per second to calculate.
   *
   * @default 30
   */
  resolution?: number | undefined
}

/**
 * Creates a spring easing function based on physical parameters.
 *
 * The trajectory of a spring moving from 0 to 1m will be calculated and turned into CSS easing function.
 *
 * @param options Spring options.
 *
 * @returns Easing and duration as an options object which you can pass directly to {@link Element.animate}.
 */
export function createSpring(options: SpringOptions = {}): EffectTiming {
  const { mass = 0.5, damping = 24, stiffness = 300, velocity = 0, resolution = 30 } = options
  if (mass <= 0) throw new RangeError("Spring mass must be greater than 0")
  if (stiffness <= 0) throw new RangeError("Spring stiffness must be greater than 0")
  if (damping <= 0) throw new RangeError("Spring damping must be greater than to 0")
  if (resolution <= 0) throw new RangeError("Spring resolution must be greater than 0")
  const w0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  const wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta ** 2) : 0
  const b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0
  const duration = Math.min(zeta < 1 ? 8 / zeta / w0 : 8 / w0, 10) // max 10s
  const samples = Array.from({ length: resolution * duration }).map((_, i) => {
    const t = i / resolution
    const y =
      zeta < 1
        ? Math.exp(-t * zeta * w0) * (1 * Math.cos(wd * t) + b * Math.sin(wd * t))
        : (1 + b * t) * Math.exp(-t * w0)
    return 1 - y
  })
  samples.push(1)
  const easing = `linear(${samples.map((y) => y.toFixed(3)).join(", ")})`
  return { easing, duration: duration * 1000 }
}

/**
 * Default spring easing function.
 *
 * Result of calling {@link createSpring} with default options.
 */
export const defaultSpring: EffectTiming = {
  easing: "linear(0, 0.2, 0.5, 0.7, 0.85, 0.92, 0.96, 0.98, 0.99, 1)",
  duration: 333,
}
