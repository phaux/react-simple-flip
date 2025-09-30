import {
  type ComponentProps,
  type ElementType,
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
 * Props for {@link Flip}.
 */
export type FlipProps<T extends ElementType = "div"> = ComponentProps<T> & { options?: FlipOptions }

/**
 * Element which animates whenever its position in the document changes between rerenders.
 *
 * Uses {@link useFlip} internally.
 *
 * Renders a `div` by default. Use `component` prop to override. The component must accept a ref prop.
 */
export function Flip<T extends ElementType = "div">(props: FlipProps<T>): JSX.Element {
  const { component: Component = "div", ref, options, ...rootProps } = props
  const innerRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => innerRef.current!)
  useFlip(innerRef, options)
  return <Component ref={innerRef} {...rootProps} />
}

/**
 * Props for {@link FlipWrapper}.
 */
export interface FlipWrapperProps extends FlipOptions {
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
export function FlipWrapper(props: FlipWrapperProps): JSX.Element {
  const { children, ...options } = props
  const ref = useRef<HTMLElement>(null)
  useImperativeHandle(children.props.ref, () => ref.current!)
  useFlip(ref, options)
  return cloneElement(children, { ref })
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
 * Doesn't do anything in prefers-reduced-motion mode.
 */
export function animateFrom(params: AnimateParams): Animation | null {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null
  return params.element.animate([params.style, {}], {
    ...params.timing,
    delay: params.index * params.staggerDelay,
    fill: "backwards",
  })
}

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
