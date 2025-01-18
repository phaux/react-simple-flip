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

export interface FlipOptions extends EffectTiming {
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
  getOffset?: (elem: HTMLElement) => DOMRect
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
  const rect = useRef<DOMRect>(null)
  const { getOffset = getElementOffset, ...animation } = options

  useEffect(() => {
    if (ref.current != null) {
      rect.current = flip(ref.current, animation, rect.current, getOffset)
    }
  })
}

/**
 * FLIP-animates an element.
 */
function flip(
  elem: HTMLElement,
  animation: EffectTiming,
  oldRect: DOMRect | null,
  getRect: (elem: HTMLElement) => DOMRect,
): DOMRect {
  const newRect = getRect(elem)

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
    elem.animate(
      [
        {
          translate: `${tx}px ${ty}px`,
          scale: `${sx} ${sy}`,
        },
        {},
      ],
      animation,
    )
  }

  return newRect
}

export function FlipList(props: {
  children: ReactElement<{ ref: Ref<HTMLElement> }>[]
  onEnter: (elem: HTMLElement, signal: AbortSignal) => void
  onExit: (elem: HTMLElement, signal: AbortSignal) => void | Promise<void>
}): JSX.Element {
  interface Entry {
    elem: ReactElement<{ ref: Ref<HTMLElement> }>
    ref: RefObject<HTMLElement | null>
    index: number
    promise?: Promise<void>
  }
  const { children, onEnter, onExit } = props
  const [entries, setEntries] = useState<Entry[]>([])
  const aborts = useRef(new Map<Key, AbortController>())
  useEffect(() => {
    setEntries((prevEntries) => {
      let entries = prevEntries
      for (let i = 0; i < children.length; i++) {
        const child = children[i]!
        const controller = aborts.current.get(child.key!)
        if (controller) controller.abort()
        const entryIndex = entries.findIndex((entry) => entry.elem.key === child.key)
        if (entryIndex < 0) {
          console.log("added", child.type, child.key)
          const ref = createRef<HTMLElement>()
          entries = entries.toSpliced(i, 0, { elem: cloneElement(child, { ref }), ref, index: i })
        } else {
          entries = Array.from(entries)
          let entry = entries.splice(entryIndex, 1)[0]!
          const ref = entry.ref
          entry = { ...entry, elem: cloneElement(child, { ref }), index: i }
          entries.splice(i, 0, entry)
        }
      }
      for (const entry of prevEntries) {
        const key = entry.elem.key
        if (children.find((child) => child.key === key) == null) {
          const controller = aborts.current.get(key!)
          if (!controller || controller.signal.aborted) {
            const controller = new AbortController()
            Promise.resolve()
              .then(() => {
                if (entry.ref.current) return onExit(entry.ref.current, controller.signal)
              })
              .finally(() => {
                if (!controller.signal.aborted)
                  setEntries((entries) => entries.filter((entry) => entry.elem.key !== key))
              })
          }
        }
      }
      return entries
    })
  }, [children])
  return <>{entries.map((entry) => entry.elem)}</>
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
 * Animation options you can use for a smooth spring animation.
 */
export const springAnimation: EffectTiming = {
  duration: 666,
  easing:
    "linear(0, 0.029 2.4%, 0.12 5.3%, 0.629 15.8%, 0.829, 0.964 25.7%, 1.044 30.9%, 1.07 34.8%, 1.077 39.3%, 1.066 44.2%, 1.017 58%, 1 66.2%, 0.994 76.7%, 1)",
}
