import {
  type ComponentProps,
  type ElementType,
  type JSX,
  type Key,
  type ReactElement,
  type Ref,
  type RefObject,
  cloneElement,
  createRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

export interface FlipOptions {
  /**
   * Function used to compute element's position and size.
   *
   * Called on every rerender.
   * If the values returned by this function change, the element will be animated.
   *
   * Only the difference between old and new value is used for the animation.
   * The absolute returned position doesn't matter.
   *
   * Default: {@link getElementOffset}.
   * You can override it to change the parent to animate relative to.
   */

  timing?: EffectTiming

  onMove?: (elem: Element, transform: Keyframe) => Promise<void>

  getElementRect?: (elem: HTMLElement) => DOMRect
}

/**
 * Animates an element whenever its position in the document changes between rerenders.
 *
 * On every rerender, read element's position and size and compare it to values from previous render.
 * If values are different, animate element's transform from previous position to current.
 *
 * @param ref The element ref to animate.
 * @param options CSS Animation options.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, options: FlipOptions): void {
  const { onMove, timing, getElementRect } = options
  const rect = useRef<DOMRect>(null)

  useEffect(() => {
    if (ref.current != null) {
      rect.current = flip(ref.current, rect.current, onMove, timing, getElementRect)
    }
  })
}

/**
 * Tries to flip-animate an element if its position or size changed.
 *
 * Calls provided callback with the calculated reverse delta transform.
 *
 * @returns Element's current position and size, which you can pass to the next call.
 */
export function flip(
  elem: HTMLElement,
  oldRect: DOMRect | null | undefined,
  onMove: (
    elem: Element,
    fromKeyframe: Keyframe,
    timing: EffectTiming,
  ) => Promise<void> = animateMove,
  timing: EffectTiming = defaultSpring,
  getElementRect: (elem: HTMLElement) => DOMRect = getElementOffset,
): DOMRect {
  const newRect = getElementRect(elem)

  if (oldRect == null) return newRect

  const tx = oldRect.left - newRect.left + (oldRect.width - newRect.width) / 2
  const ty = oldRect.top - newRect.top + (oldRect.height - newRect.height) / 2
  const sx = oldRect.width / newRect.width
  const sy = oldRect.height / newRect.height

  if (
    Math.abs(tx) >= 1 ||
    Math.abs(ty) >= 1 ||
    Math.abs(sx - 1) >= 0.01 ||
    Math.abs(sy - 1) >= 0.01
  ) {
    onMove(elem, { translate: `${tx}px ${ty}px`, scale: `${sx} ${sy}` }, timing)
  }

  return newRect
}

/**
 * Props for {@link FlipList}.
 */
interface FlipListProps {
  children: ReactElement<{ ref: Ref<HTMLElement> }>[]

  timing?: EffectTiming

  hiddenStyle?: Keyframe

  onEnter?: (
    elem: HTMLElement,
    signal: AbortSignal,
    fromKeyframe: Keyframe,
    timing: EffectTiming,
  ) => Promise<void>

  onExit?: (
    elem: HTMLElement,
    signal: AbortSignal,
    toKeyframe: Keyframe,
    timing: EffectTiming,
  ) => Promise<void>

  onMove?: (elem: Element, fromKeyframe: Keyframe, timing: EffectTiming) => Promise<void>

  getElementRect?: (elem: HTMLElement) => DOMRect
}

export function FlipList(props: FlipListProps): JSX.Element {
  interface Entry {
    child: ReactElement<{ ref: Ref<HTMLElement> }>
    ref: RefObject<HTMLElement | null>
    index: number
  }

  const {
    children,
    timing = defaultSpring,
    hiddenStyle = defaultHiddenStyle,
    onEnter = animateEnter,
    onExit = animateExit,
    onMove = animateMove,
    getElementRect = getElementOffset,
  } = props
  const [entries, setEntries] = useState(new Map<Key, Entry>())
  const exits = useRef(new Map<Key, AbortController>())
  const enters = useRef(new Map<Key, AbortController>())
  const rects = useRef(new Map<Key, DOMRect>())

  useEffect(() => {
    // Update our internal children entries list.
    setEntries((entries) => {
      // Iterate over incoming children.
      for (const [index, child] of children.entries()) {
        // Get ref of existing entry or create a new one.
        const ref = entries.get(child.key!)?.ref ?? createRef<HTMLElement>()
        // Update entry. Re-add to always sort it before exiting entries.
        entries = new Map(entries)
        entries.delete(child.key!)
        entries.set(child.key!, { child, ref, index })
      }
      return entries
    })
  }, [children])

  useEffect(() => {
    // Start entering entries which were in the incoming children list.
    for (const [key, entry] of entries) {
      // If incoming children list doesn't contain this key, it's not entering.
      if (!children.some((child) => child.key === key)) continue
      // If entry is already entering, skip it.
      const enterController = enters.current.get(key)
      if (enterController && !enterController.signal.aborted) continue
      // If entry is exiting, cancel it.
      const exitController = exits.current.get(key)
      if (exitController) exitController.abort()
      // Start entering this entry.
      const controller = new AbortController()
      Promise.resolve()
        .then(() => {
          console.log("entering", key)
          if (entry.ref.current) {
            return onEnter(entry.ref.current, controller.signal, hiddenStyle, timing)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            console.log("entered", key)
          }
        })
      enters.current.set(key, controller)
    }
  })

  useEffect(() => {
    // Start exiting entries which are not in the incoming children list.
    for (const [key, entry] of entries) {
      // If incoming children list contains this key, it's not exiting.
      if (children.some((child) => child.key === key)) continue
      // If entry is already exiting, skip it.
      const exitController = exits.current.get(key)
      if (exitController && !exitController.signal.aborted) continue
      // If entry is entering, cancel it.
      const enterController = enters.current.get(key)
      if (enterController) enterController.abort()
      // Start exiting this entry.
      const controller = new AbortController()
      Promise.resolve()
        .then(() => {
          console.log("exiting", key)
          if (entry.ref.current) {
            return onExit(entry.ref.current, controller.signal, hiddenStyle, timing)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            console.log("exited", key)
            setEntries((entries) => {
              entries = new Map(entries)
              entries.delete(key)
              return entries
            })
            exits.current.delete(key)
            enters.current.delete(key)
          }
        })
      exits.current.set(key!, controller)
    }
  })

  useEffect(() => {
    // Animate all entries whenever their position changes.
    for (const [key, entry] of entries) {
      if (entry.ref.current) {
        rects.current.set(
          key,
          flip(entry.ref.current, rects.current.get(key), onMove, timing, getElementRect),
        )
      }
    }
  })

  return (
    <>
      {Array.from(entries.values())
        .sort((a, b) => a.index - b.index)
        .map((entry) => cloneElement(entry.child, { ref: entry.ref }))}
    </>
  )
}

export const defaultSpring: EffectTiming = createSpringAnimation()

export const defaultHiddenStyle: Keyframe = { opacity: 0, scale: 0.8 }

export function animateEnter(
  elem: Element,
  signal: AbortSignal,
  fromKeyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  console.log("enter", elem)
  const animation = elem.animate([fromKeyframe, {}], { fill: "backwards", ...timing })
  return animation.finished.then(() => {})
}

export function animateExit(
  elem: Element,
  signal: AbortSignal,
  toKeyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  console.log("exit", elem)
  const animation = elem.animate([{}, toKeyframe], { fill: "forwards", ...timing })
  signal.addEventListener("abort", () => animation.reverse())
  return animation.finished.then(() => {})
}

export function animateMove(
  elem: Element,
  fromKeyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  const animation = elem.animate([fromKeyframe, {}], timing)
  return animation.finished.then(() => {})
}

/**
 * Iterates through {@link HTMLElement.offsetParent}s and sums their {@link HTMLElement.offsetLeft} and {@link HTMLElement.offsetTop}.
 * Returns element's total offset as a {@link DOMRect} object.
 */
export function getElementGlobalOffset(elem: HTMLElement): DOMRect {
  let currentElem: Element | null = elem
  let left = 0
  let top = 0
  while (currentElem instanceof HTMLElement) {
    left += currentElem.offsetLeft
    top += currentElem.offsetTop
    currentElem = currentElem.offsetParent
  }
  return new DOMRect(left, top, elem.offsetWidth, elem.offsetHeight)
}

/**
 * Returns element's {@link HTMLElement.offsetLeft}, {@link HTMLElement.offsetWidth}, etc. as a {@link DOMRect}.
 */
export function getElementOffset(elem: HTMLElement): DOMRect {
  return new DOMRect(elem.offsetLeft, elem.offsetTop, elem.offsetWidth, elem.offsetHeight)
}

/**
 * Element which animates whenever its position in the document changes between rerenders.
 *
 * Uses {@link useFlip} internally.
 *
 * Renders a `div` by default. Use `component` prop to override.
 */
export function Flip<T extends ElementType = "div">(
  props: ComponentProps<T> & {
    component?: T
    options: FlipOptions
  },
): JSX.Element {
  const { component: Component = "div", ref, options, ...rootProps } = props
  const innerRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => innerRef.current!)
  useFlip(innerRef, options)
  return <Component ref={innerRef} {...rootProps} />
}

/**
 * Wrapper which animates its child whenever its position in the document changes between rerenders.
 *
 * Uses {@link useFlip} internally.
 *
 * Doesn't render anything by itself.
 * The wrapped element must accept a ref prop.
 */
export function FlipWrapper(props: {
  children: ReactElement<{ ref: Ref<HTMLElement> }>
  options: FlipOptions
}): JSX.Element {
  const { children, options } = props
  const ref = useRef<HTMLElement>(null)
  useFlip(ref, options)
  return cloneElement(children, { ref })
}

/**
 * Options for {@link createSpringAnimation}.
 */
interface SpringOptions {
  /** Physical mass in kg. */
  mass?: number
  /** Physical damping in Ns/m. */
  damping?: number
  /** Physical spring stiffness in N/m. */
  stiffness?: number
  /** Initial velocity in m/s. */
  velocity?: number
  /** Target position in m. */
  target?: number
  /** Number of samples to calculate easing function. */
  resolution?: number
}

/**
 * Creates a spring easing function based on physical parameters.
 *
 * @returns Animation options that you can pass directly to {@link Element.animate}.
 */
export function createSpringAnimation(options: SpringOptions = {}): EffectTiming {
  const {
    mass = 0.2,
    damping = 10,
    stiffness = 200,
    velocity = 0,
    target = 1,
    resolution = 10,
  } = options
  const w0 = Math.sqrt(stiffness / mass)
  const zeta = damping / (2 * Math.sqrt(stiffness * mass))
  const wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta ** 2) : 0
  const b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0
  const solver = (t: number) =>
    zeta < 1
      ? 1 - Math.exp(-t * zeta * w0) * (1 * Math.cos(wd * t) + b * Math.sin(wd * t)) * target
      : 1 - (1 + b * t) * Math.exp(-t * w0) * target
  const duration = zeta < 1 ? 6 / zeta / w0 : 6 / w0
  const samples = Array.from({ length: resolution }).map((_, i) =>
    solver((i / resolution) * duration),
  )
  samples.push(1)
  const easing = `linear(${samples.map((y) => y.toFixed(2)).join(", ")})`
  return { easing, duration: duration * 1000 }
}
