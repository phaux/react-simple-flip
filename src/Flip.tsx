import {
  type JSX,
  type ReactElement,
  type Ref,
  type RefObject,
  cloneElement,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import { defaultSpring } from "./createSpring.js"

/**
 * Props for {@link Flip}.
 */
export interface FlipProps extends FlipOptions {
  children: ReactElement<{ ref?: Ref<HTMLElement> }>
}

/**
 * Wrapper which animates its child whenever its position in the document changes between rerenders.
 *
 * Uses {@link useFlip} internally.
 *
 * Doesn't render anything by itself.
 * The wrapped element must accept a ref prop.
 */
export function Flip(props: FlipProps): JSX.Element {
  const { children, ...options } = props
  const ref = useRef<HTMLElement>(null)
  useImperativeHandle(children.props.ref, () => ref.current!)
  useFlip(ref, options)
  // eslint-disable-next-line react-hooks/refs
  return cloneElement(children, { ref })
}

/**
 * Options for {@link useFlip}.
 */
export interface FlipOptions {
  /**
   * CSS Animation timing options. Passed directly to animation callbacks.
   *
   * Default: {@link defaultSpring}.
   */
  timing?: EffectTiming | undefined

  /**
   * Callback function which animates an element when it moves.
   *
   * This is called whenever an element's computed position or size changed since previous render.
   *
   * Default: {@link animateFrom}.
   *
   * Pass `null` to disable move animation.
   */
  animateMove?: ((params: AnimateParams) => Animation | null) | null | undefined

  /**
   * Function used to compute element's position and size.
   *
   * Only the difference between returned values is used for the animation.
   * The absolute returned position doesn't matter.
   *
   * Default: {@link getElementOffset}.
   */
  getElementRect?: ((elem: HTMLElement) => DOMRect) | undefined
}

/**
 * Calls provided callback whenever element's position changes between rerenders.
 *
 * On every rerender, reads element's position and size and compare it to the previous value.
 * If values are different, calls the provided callback with the calculated transform.
 *
 * Additionally, recomputes the last position when the element's offsetParent resizes.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, options: FlipOptions): void {
  const {
    animateMove = animateFrom,
    timing = defaultSpring,
    getElementRect = getElementOffset,
  } = options
  const rect = useRef<DOMRect>(null)

  useEffect(() => {
    const elem = ref.current
    if (elem == null) return
    const parent = elem.offsetParent
    if (parent == null) return
    // Watch for parent resizes.
    let timeout: ReturnType<typeof setTimeout> | undefined
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        // Update last computed position.
        rect.current = getElementRect(elem)
      }, 100)
    })
    observer.observe(parent)
    return () => observer.disconnect()
  })

  useEffect(() => {
    // Try to animate on every rerender.
    const element = ref.current
    if (element) {
      const newRect = getElementRect(element)
      if (rect.current) {
        const style = getDeltaTransform(newRect, rect.current)
        if (style) {
          animateMove?.({ element, index: 0, staggerDelay: 0, style, timing })
        }
      }
      rect.current = newRect
    }
  })
}

/**
 * Parameters passed to animation callbacks.
 */
export interface AnimateParams {
  /**
   * The element to animate.
   */
  element: Element
  /**
   * Index in the list of currently animated elements.
   */
  index: number
  /**
   * Stagger delay specified in the options.
   */
  staggerDelay: number
  /**
   * Keyframe to animate from/to.
   *
   * For move animations this is the computed difference in position and size
   * from current position to last position as a CSS transform.
   *
   * For enter/exit animations this is the hidden style specified in the options.
   */
  style: Keyframe
  /**
   * Timing specified in the options.
   */
  timing: EffectTiming
}

/**
 * Animates given element from a given keyframe.
 *
 * Adds delay based on element index and specified stagger delay using {@link stagger}.
 *
 * Doesn't do anything in prefers-reduced-motion mode.
 */
export function animateFrom(params: AnimateParams): Animation | null {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null
  return params.element.animate([params.style, {}], {
    ...params.timing,
    delay: stagger(params.index, params.staggerDelay),
    fill: "backwards",
  })
}

/**
 * Returns delay for staggered animation based on element index and stagger delay.
 * The delay approaches 333ms but never exceeds it.
 */
export const stagger = (idx: number, delay: number): number =>
  MAX_DELAY - MAX_DELAY ** 2 / (idx * delay + MAX_DELAY)

const MAX_DELAY = 333

/**
 * Returns element's {@link HTMLElement.offsetLeft}, {@link HTMLElement.offsetWidth}, etc. as a {@link DOMRect}.
 *
 * Returned positions are relative to {@link HTMLElement.offsetParent}.
 * This means you can control the parent to animate relative to with `position: relative`.
 */
export function getElementOffset(elem: HTMLElement): DOMRect {
  return new DOMRect(elem.offsetLeft, elem.offsetTop, elem.offsetWidth, elem.offsetHeight)
}

/**
 * Calculates transform and scale between two {@link DOMRect}s and returns them as CSS.
 *
 * If the difference is less than a pixel, returns null.
 */
export function getDeltaTransform(a: DOMRect, b: DOMRect): Keyframe | null {
  const tx = b.left - a.left + (b.width - a.width) / 2
  const ty = b.top - a.top + (b.height - a.height) / 2
  const sx = b.width / a.width
  const sy = b.height / a.height
  const translate = Math.abs(tx) + Math.abs(ty) >= 1 ? `${tx}px ${ty}px` : undefined
  const scale = Math.abs(sx - 1) + Math.abs(sy - 1) >= 0.01 ? `${sx} ${sy}` : undefined
  let style: Keyframe | null = null
  if (translate) style = { translate }
  if (scale) style = { ...style, scale }
  return style
}
