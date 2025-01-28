import {
  Children,
  cloneElement,
  createRef,
  type JSX,
  type Key,
  type ReactElement,
  type Ref,
  type RefObject,
  useEffect,
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
   * The passed signal is aborted when the element is removed again before the animation finishes.
   * It's usually safe to ignore the signal.
   *
   * `fromStyle` and `timing` are passed directly from {@link FlipListOptions}.
   *
   * Default: {@link animateEnter}.
   */
  onEnter?: (
    elem: Element,
    signal: AbortSignal,
    fromStyle: Keyframe,
    timing: EffectTiming,
  ) => Promise<void>

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
  onExit?: (
    elem: Element,
    signal: AbortSignal,
    toStyle: Keyframe,
    timing: EffectTiming,
  ) => Promise<void>

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
 * Takes a list of items and maintains a list of entries with their associated refs,
 * last computed element's positions, and including already removed items.
 *
 * You can use resulting list to associate rendered elements with refs
 * and keep rendering removed elements until their animation finishes.
 *
 * Provided callbacks are called when an item is added or removed from the list
 * or when its associated last computed position changed.
 *
 * Every item is identified by a unique key.
 */
export function useFlipList<T>(
  items: T[],
  getKey: (item: T) => Key,
  options: FlipListOptions,
): FlipListEntry<T>[] {
  const {
    timing = defaultSpring,
    hiddenStyle = defaultHiddenStyle,
    onEnter = animateEnter,
    onExit = animateExit,
    onMove = animateMove,
    getElementRect = getElementOffset,
  } = options
  const [entries, setEntries] = useState<FlipListEntry<T>[]>([])
  const exits = useRef(new Map<Key, AbortController>())
  const enters = useRef(new Map<Key, AbortController>())
  const rects = useRef(new Map<Key, DOMRect>())

  useEffect(() => {
    // Update our internal entries list.
    setEntries((entries) => {
      let newIdx = 0
      // Iterate over incoming items.
      for (const item of items) {
        const key = getKey(item)
        // Find existing entry index for this item.
        const oldIdx = entries.findIndex((entry) => getKey(entry.item) === key)
        // Get old entry's ref or create a new one.
        const ref = oldIdx >= 0 ? entries[oldIdx]!.ref : createRef<HTMLElement>()
        // Advance new index until non-exiting entry is found.
        while (true) {
          const e = entries[newIdx]
          if (!e) break
          const k = getKey(e.item)
          if (items.some((item) => getKey(item) === k)) break
          newIdx++
        }
        // Remove existing entry.
        if (oldIdx >= 0) entries = entries.toSpliced(oldIdx, 1)
        // Add entry at new index.
        entries = entries.toSpliced(newIdx, 0, { item, ref })
        // Increment new index.
        newIdx++
      }
      return entries
    })
  }, [items, getKey])

  useEffect(() => {
    // Start entering entries which were in the incoming children list.
    for (const entry of entries) {
      const key = getKey(entry.item)
      // If incoming children list doesn't contain this key, it's not entering.
      if (!items.some((item) => getKey(item) === key)) continue
      // If entry is already entering, skip it.
      const enterController = enters.current.get(key)
      if (enterController && !enterController.signal.aborted) continue
      // If entry is exiting, cancel it.
      const exitController = exits.current.get(key)
      if (exitController) exitController.abort()
      // Start entering this entry.
      const controller = new AbortController()
      Promise.resolve().then(() => {
        if (entry.ref.current) {
          return onEnter(entry.ref.current, controller.signal, hiddenStyle, timing)
        }
      })
      enters.current.set(key, controller)
    }
  })

  useEffect(() => {
    // Start exiting entries which are not in the incoming children list.
    for (const entry of entries) {
      const key = getKey(entry.item)
      // If incoming children list contains this key, it's not exiting.
      if (items.some((item) => getKey(item) === key)) continue
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
          if (entry.ref.current) {
            return onExit(entry.ref.current, controller.signal, hiddenStyle, timing)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setEntries((entries) => entries.filter((entry) => getKey(entry.item) !== key))
            exits.current.delete(key)
            enters.current.delete(key)
            rects.current.delete(key)
          }
        })
      exits.current.set(key, controller)
    }
  })

  useEffect(() => {
    // Refresh positions on window resize.
    const handleResize = () => {
      for (const entry of entries) {
        if (entry.ref.current) {
          const key = getKey(entry.item)
          rects.current.set(key, getElementRect(entry.ref.current))
        }
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [entries])

  useEffect(() => {
    // Try to animate move on every rerender.
    for (const entry of entries) {
      if (entry.ref.current) {
        const key = getKey(entry.item)
        const newRect = getElementRect(entry.ref.current)
        const oldRect = rects.current.get(key)
        if (oldRect) {
          const style = getDeltaTransform(newRect, oldRect)
          if (style) {
            onMove(entry.ref.current, style, timing)
          }
        }
        rects.current.set(key, newRect)
      }
    }
  })

  return entries
}

/**
 * Entry in the list of items maintained by {@link useFlipList}.
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
  children: ReactElement<{ ref: Ref<HTMLElement> }>[]
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
  const entries = useFlipList(children, getChildKey, options)
  return entries.map((entry) => cloneElement(entry.item, { ref: entry.ref }))
}

const getChildKey = (child: ReactElement) => child.key!

/**
 * Animates given element from a given keyframe.
 *
 * The signal is ignored.
 *
 * Doesn't do anything in prefers-reduced-motion mode.
 *
 * Resolves when animation is finished.
 */
export async function animateEnter(
  elem: Element,
  signal: AbortSignal,
  fromKeyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const animation = elem.animate([fromKeyframe, {}], { fill: "backwards", ...timing })
    await animation.finished
  }
}

/**
 * Animates given element to a given keyframe.
 *
 * When the signal is aborted, the animation is reversed.
 *
 * Doesn't do anything in prefers-reduced-motion mode.
 *
 * Resolves when animation is finished.
 */
export async function animateExit(
  elem: HTMLElement,
  signal: AbortSignal,
  toKeyframe: Keyframe,
  timing: EffectTiming,
): Promise<void> {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const animation = elem.animate([{}, toKeyframe], { fill: "forwards", ...timing })
    signal.addEventListener("abort", () => animation.reverse())
    await animation.finished
  }
}

/**
 * The default keyframe styles to animate from/to when entering/exiting an element.
 */
export const defaultHiddenStyle: Keyframe = { opacity: 0, scale: 0.8 }
