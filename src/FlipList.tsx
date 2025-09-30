import {
  cloneElement,
  createRef,
  type JSX,
  type Key,
  type ReactElement,
  type Ref,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { defaultSpring } from "./createSpring.js"
import { animateFrom, getDeltaTransform, getElementOffset, type FlipOptions } from "./Flip.js"

/**
 * Options for {@link useFlipList}.
 */
export interface FlipListOptions extends FlipOptions {
  /**
   * Keyframe styles to animate from/to when entering/exiting an element.
   * Passed directly to {@link onEnter} and {@link onExit}.
   *
   * Default: {@link defaultHiddenStyle}.
   */
  hiddenStyle?: Keyframe | undefined

  /**
   * Callback function which animates the element when it enters.
   *
   * This is called every time when a new child with a given key is rendered,
   * because it was added to the children array.
   *
   * The returned promise is used to delay subsequent animations.
   *
   * Default: {@link animateFrom}.
   *
   * Pass `null` to disable enter animations.
   */
  onEnter?:
    | ((elem: Element, fromStyle: Keyframe, timing: EffectTiming) => Promise<void>)
    | null
    | undefined

  /**
   * Callback function which animates the element when it exits.
   *
   * This is called every time when a child with a given key would not be rendered anymore,
   * because it was removed from the children array.
   *
   * The returned promise is used to delay the removal of the element from the DOM until the animation finishes.
   *
   * Default: {@link animateTo}.
   *
   * Pass `null` to disable exit animations.
   */
  onExit?:
    | ((elem: Element, toStyle: Keyframe, timing: EffectTiming) => Promise<void>)
    | null
    | undefined

  /**
   * If true, will animate items on the first render as if they were entering.
   *
   * Default: `false`.
   */
  animateMount?: boolean | undefined
}

/**
 * Takes a list of items and returns a list of entries with their associated refs.
 *
 * Calls enter/exit callbacks when items are added or removed from the list.
 *
 * On every rerender, reads elements' positions and sizes and compare them to values from previous render.
 * If values are different, calls the move callback with the calculated transform.
 *
 * Additionally, recomputes the positions when the offsetParent resizes.
 *
 * The list updates are throttled.
 * Conflicting list changes are delayed until currently running callbacks finish.
 * This means that children from previous renders can be returned instead of currently passed ones.
 *
 * Every item must be identified by a unique key.
 */
export function useFlipList<T>(
  newItems: readonly T[],
  getKey: (item: T) => Key,
  options: FlipListOptions,
): readonly FlipListEntry<T>[] {
  const {
    timing = defaultSpring,
    hiddenStyle = defaultHiddenStyle,
    onEnter = animateFrom,
    onExit = animateTo,
    onMove = animateFrom,
    getElementRect = getElementOffset,
    animateMount = false,
  } = options
  const [items, setItems] = useState(newItems)
  const refs = useRef(new Map<Key, RefObject<HTMLElement | null>>())
  const rects = useRef(new Map<Key, DOMRect>())
  const preUpdateAnim = useRef(Promise.resolve<unknown>(undefined))
  const postUpdateAnim = useRef(Promise.resolve<unknown>(undefined))
  const firstRender = useRef(true)

  // Pre-update animations (exits)
  useEffect(() => {
    let cancelled = false
    // Queue all updates.
    preUpdateAnim.current = preUpdateAnim.current.then(async () => {
      // Wait for post-update animations to finish.
      await postUpdateAnim.current
      // Only process most recent update.
      if (cancelled) return

      // Animate out items that are no longer in the new list.
      const promises = new Set<Promise<unknown> | null | undefined>()
      for (const item of items) {
        const key = getKey(item)
        if (!newItems.some((newItem) => getKey(newItem) === key)) {
          // This item needs to exit.
          const ref = refs.current.get(key)
          if (ref?.current) {
            rects.current.delete(key)
            promises.add(onExit?.(ref.current, hiddenStyle, timing))
          }
        }
      }
      // Wait for all exit animations to finish.
      if (promises.size > 0) {
        await Promise.all(promises).catch(() => {})
      }

      // Update rendered items.
      setItems(newItems)

      // Give a chance for effects to run again before processing next update.
      // This will allow post-update effect to run next.
      await new Promise((resolve) => setTimeout(resolve, 1))
    })

    return () => {
      cancelled = true
    }
  }, [items, newItems])

  // Post-update animations (moves and enters)
  useLayoutEffect(() => {
    // Animate all existing entries.
    const promises = new Set<Promise<void> | null | undefined>()
    for (const item of items) {
      const key = getKey(item)
      const ref = refs.current.get(key)
      if (ref?.current) {
        const newRect = getElementRect(ref.current)
        const oldRect = rects.current.get(key)
        if (oldRect) {
          // Animate move
          const style = getDeltaTransform(newRect, oldRect)
          if (style) {
            promises.add(onMove?.(ref.current, style, timing))
          }
        } else if (!firstRender.current || animateMount) {
          // Animate enter
          promises.add(onEnter?.(ref.current, hiddenStyle, timing))
        }
        // Set last computed position.
        rects.current.set(key, newRect)
      }
    }
    // Add all animations to the promise chain.
    if (promises.size > 0) {
      postUpdateAnim.current = postUpdateAnim.current.then(() =>
        Promise.all(promises).catch(() => {}),
      )
    }
    firstRender.current = false
  }, [items])

  useEffect(() => {
    const parent = refs.current.values().next().value?.current?.offsetParent
    if (!parent) return
    // Watch for parent resizes.
    let timeout: ReturnType<typeof setTimeout> | undefined
    const observer = new ResizeObserver(() => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        // Update last computed positions.
        for (const [key, ref] of refs.current.entries()) {
          if (ref.current && rects.current.has(key)) {
            rects.current.set(key, getElementRect(ref.current))
          }
        }
      }, 100)
    })
    observer.observe(parent)
    return () => observer.disconnect()
  })

  // Return items with their refs
  return useMemo(() => {
    const entries: FlipListEntry<T>[] = []
    const newRefs = new Map<Key, RefObject<HTMLElement | null>>()
    for (const item of items) {
      const key = getKey(item)
      let ref = refs.current.get(key)
      if (!ref) ref = createRef()
      newRefs.set(key, ref)
      entries.push({ item, ref })
    }
    refs.current = newRefs
    return entries
  }, [items])
}

/**
 * Entry in the list of items returned by {@link useFlipList}.
 */
export interface FlipListEntry<T> {
  /**
   * The original item from the incoming items list.
   */
  readonly item: T
  /**
   * Ref you can use to associate this entry with a rendered element.
   *
   * It will be passed to the callbacks used to animate the element.
   */
  readonly ref: RefObject<HTMLElement | null>
}

/**
 * Props for {@link FlipList}.
 */
export interface FlipListProps extends FlipListOptions {
  children:
    | ReactElement<{ ref: Ref<HTMLElement> }>[]
    | ReactElement<{ ref: Ref<HTMLElement> }>
    | null
    | undefined
}

/**
 * Animates a list of elements on enter and exit and whenever their position changes.
 *
 * Doesn't render anything by itself.
 *
 * Uses {@link useFlipList} internally.
 *
 * You must assign a unique key to each child.
 *
 * Each child must accept a ref prop. You can't assign your own ref to the children.
 */
export function FlipList(props: FlipListProps): JSX.Element[] {
  const { children, ...options } = props
  const childArray = useMemo(
    () => (Array.isArray(children) ? children : children == null ? [] : [children]),
    [children],
  )
  const entries = useFlipList(childArray, getChildKey, options)
  return entries.map((entry) => cloneElement(entry.item, { ref: entry.ref }))
}

const getChildKey = (child: ReactElement) => child.key!

/**
 * Animates given element to a given keyframe.
 *
 * Doesn't do anything in prefers-reduced-motion mode.
 *
 * Resolves when animation is finished.
 */
export async function animateTo(
  elem: HTMLElement,
  keyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    await elem.animate([{}, keyframe], { ...timing, fill: "forwards" }).finished
  }
}

/**
 * The default keyframe styles to animate from/to when entering/exiting an element.
 */
export const defaultHiddenStyle: Keyframe = { opacity: 0, scale: 0.9 }
