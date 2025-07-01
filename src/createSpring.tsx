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
  mass?: number
  /**
   * Physical damping coefficient in kg/s.
   * Damping is a measure of resistance to motion.
   *
   * Damping mostly controls maximum velocity the spring can accelerate to.
   * More damping means the spring will move slower or jiggle less if it overshoots.
   *
   * @default 15kg/s
   */
  damping?: number
  /**
   * Physical spring stiffness in N/m.
   * Stiffness is the spring constant, which represents the force needed to compress or extend a spring by a unit length.
   *
   * Stiffness mostly controls spring's acceleration.
   * More stiffness means the spring will accelerate faster and overshoot more.
   *
   * @default 200N/m
   */
  stiffness?: number
  /**
   * Initial velocity in m/s.
   *
   * @default 0m/s
   */
  velocity?: number
  /**
   * Number of samples per second to calculate.
   *
   * @default 20
   */
  resolution?: number
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
  const { mass = 0.5, damping = 15, stiffness = 200, velocity = 0, resolution = 20 } = options
  const w0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  const wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta ** 2) : 0
  const b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0
  const duration = zeta < 1 ? 6 / zeta / w0 : 6 / w0
  const samples = Array.from({ length: resolution * duration }).map((_, i) => {
    const t = i / resolution
    const y =
      zeta < 1
        ? Math.exp(-t * zeta * w0) * (1 * Math.cos(wd * t) + b * Math.sin(wd * t))
        : (1 + b * t) * Math.exp(-t * w0)
    return 1 - y
  })
  samples.push(1)
  const easing = `linear(${samples.map((y) => y.toFixed(2)).join(", ")})`
  return { easing, duration: duration * 1000 }
}

/**
 * Default spring easing function.
 *
 * Result of calling {@link createSpring} with default options.
 */
export const defaultSpring: EffectTiming = createSpring()
