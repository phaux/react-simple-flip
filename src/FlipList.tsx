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
import { animateMove, getDeltaTransform, getElementOffset } from "./Flip.js"

/**
 * Options for {@link useFlipList}.
 */
export interface FlipListOptions {
  /**
   * CSS Animation timing options.
   * Passed directly to {@link onMove}, {@link onEnter} and {@link onExit}.
   *
   * Default: {@link defaultSpring}.
   */
  timing?: EffectTiming

  /**
   * Keyframe styles to animate from/to when entering/exiting an element.
   * Passed directly to {@link onEnter} and {@link onExit}.
   *
   * Default: {@link defaultHiddenStyle}.
   */
  hiddenStyle?: Keyframe

  /**
   * Callback function which animates the element when it enters.
   *
   * This is called every time when a new child with a given key is rendered,
   * because it was added to the children array.
   *
   * `fromStyle` and `timing` are passed directly from {@link FlipListOptions}.
   *
   * Default: {@link animateEnter}.
   */
  onEnter?: (elem: Element, fromStyle: Keyframe, timing: EffectTiming) => Promise<void>

  /**
   * Callback function which animates the element when it exits.
   *
   * This is called every time when a child with a given key would not be rendered anymore,
   * because it was removed from the children array.
   *
   * The passed signal is aborted when the element is added again before the animation finishes.
   * You can use this signal to reverse the animation when aborted.
   *
   * `toStyle` and `timing` are passed directly from {@link FlipListOptions}.
   *
   * The returned promise is used to delay the removal of the element from the DOM until the animation finishes.
   *
   * Default: {@link animateExit}.
   */
  onExit?: (elem: Element, toStyle: Keyframe, timing: EffectTiming) => Promise<void>

  /**
   * Callback function which animates the element when it moves.
   *
   * This is called whenever element's position changed between rerenders.
   * Not just when it's index in the children array changed.
   *
   * Default: {@link animateMove}.
   */
  onMove?: (elem: Element, fromKeyframe: Keyframe, timing: EffectTiming) => Promise<void>

  /**
   * Function used to compute element's position and size.
   *
   * Called on every rerender for every child.
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
 * Takes a list of items and maintains a list of entries with their associated refs.
 * You can use resulting list to associate rendered elements with refs.
 *
 * Provided callbacks are called when an item is added or removed from the list
 * or when its associated last computed position changed.
 *
 * The list updates are throttled.
 * Conflicting list changes are delayed until currently running callbacks finish.
 * This means that old children can be rendered at first instead of currently passed ones.
 *
 * By default, element positions are calculated relative to {@link HTMLElement.offsetParent}.
 * You can control the parent to animate relative to with `position: relative`.
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
    onEnter = animateEnter,
    onExit = animateExit,
    onMove = animateMove,
    getElementRect = getElementOffset,
  } = options
  const [items, setItems] = useState(newItems)
  const refs = useRef(new Map<Key, RefObject<HTMLElement | null>>())
  const rects = useRef(new Map<Key, DOMRect>())
  const preUpdateAnim = useRef(Promise.resolve<unknown>(undefined))
  const postUpdateAnim = useRef(Promise.resolve<unknown>(undefined))

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
      const promises = new Set<Promise<void>>()
      for (const item of items) {
        const key = getKey(item)
        if (!newItems.some((newItem) => getKey(newItem) === key)) {
          // This item needs to exit.
          const ref = refs.current.get(key)
          if (ref?.current) {
            rects.current.delete(key)
            promises.add(onExit(ref.current, hiddenStyle, timing))
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
    const promises = new Set<Promise<void>>()
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
            promises.add(onMove(ref.current, style, timing))
          }
        } else {
          // Animate enter
          promises.add(onEnter(ref.current, hiddenStyle, timing))
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
  item: T
  /**
   * Ref you can use to associate this entry with a rendered element.
   *
   * It will be passed to the callbacks used to animate the element.
   */
  ref: RefObject<HTMLElement | null>
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
 * Animates given element from a given keyframe.
 *
 * Doesn't do anything in prefers-reduced-motion mode.
 *
 * Resolves when animation is finished.
 */
export async function animateEnter(
  elem: Element,
  fromKeyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    await elem.animate([fromKeyframe, {}], timing).finished
  }
}

/**
 * Animates given element to a given keyframe.
 *
 * Doesn't do anything in prefers-reduced-motion mode.
 *
 * Resolves when animation is finished.
 */
export async function animateExit(
  elem: HTMLElement,
  toKeyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    await elem.animate([{}, toKeyframe], { ...timing, fill: "forwards" }).finished
  }
}

/**
 * The default keyframe styles to animate from/to when entering/exiting an element.
 */
export const defaultHiddenStyle: Keyframe = { opacity: 0, scale: 0.9 }
