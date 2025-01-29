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
   * CSS Animation timing options. Passed directly to {@link onMove}.
   *
   * Default: {@link defaultSpring}.
   */
  timing?: EffectTiming

  /**
   * Callback function which animates the element when it moves.
   *
   * Default: {@link animateMove}.
   * You can override it to change the animation behavior.
   */
  onMove?: (elem: Element, transform: Keyframe, timing: EffectTiming) => Promise<void>

  /**
   * Function used to compute element's position and size.
   *
   * Called on every rerender.
   * If the values returned by this function change, the element will be animated.
   *
   * Only the difference between old and new value is used for the animation.
   * The absolute returned position doesn't matter.
   *
   * You can override it to change the parent to animate relative to.
   *
   * Default: {@link getElementOffset}.
   */
  getElementRect?: (elem: HTMLElement) => DOMRect
}

/**
 * Animates an element whenever its position in the document changes between rerenders.
 *
 * On every rerender, reads element's position and size and compare it to values from previous render or last window resize.
 * If values are different, animates element's transform from previous position to current.
 *
 * @param ref The element ref to animate.
 * @param options CSS Animation options.
 */
export function useFlip(ref: RefObject<HTMLElement | null>, options: FlipOptions): void {
  const {
    onMove = animateMove,
    timing = defaultSpring,
    getElementRect = getElementOffset,
  } = options
  const rect = useRef<DOMRect>(null)

  useEffect(() => {
    // Refresh last position on window resize.
    const onResize = () => {
      if (ref.current != null) {
        rect.current = getElementRect(ref.current)
      }
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [getElementOffset])

  useEffect(() => {
    // Try to animate on every rerender.
    if (ref.current) {
      const newRect = getElementRect(ref.current)
      if (rect.current) {
        const style = getDeltaTransform(newRect, rect.current)
        if (style) {
          onMove(ref.current, style, timing)
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
 * Animates given element from a given keyframe.
 *
 * Doesn't do anything in prefers-reduced-motion mode.
 */
export async function animateMove(
  elem: Element,
  fromKeyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const animation = elem.animate([fromKeyframe, {}], timing)
    await animation.finished
  }
}

/**
 * Returns element's {@link HTMLElement.offsetLeft}, {@link HTMLElement.offsetWidth}, etc. as a {@link DOMRect}.
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
