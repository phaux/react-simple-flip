/// <reference types="@vitest/browser/providers/playwright" />
import { expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"
import { FlipList, type FlipListOptions } from "../src/FlipList.js"

test("FlipList works", async () => {
  const animateMove = vi.fn()
  const animateEnter = vi.fn()
  const animateExit = vi.fn()
  const options: FlipListOptions = { animateMove, animateEnter, animateExit }
  const doc = render(
    <FlipList {...options}>
      <div key={1} style={{ height: 10 }}>
        Foo
      </div>
      <div key={2} style={{ height: 10 }}>
        Bar
      </div>
    </FlipList>,
  )
  await expect.element(doc.getByText("Foo")).toBeInTheDocument()
  expect(animateEnter).toHaveBeenCalledTimes(0)
  expect(animateMove).toHaveBeenCalledTimes(0)
  doc.rerender(
    <FlipList {...options}>
      <div key={2} style={{ height: 10 }}>
        Bar2
      </div>
      <div key={1} style={{ height: 10 }}>
        Foo
      </div>
    </FlipList>,
  )
  await expect.element(doc.getByText("Bar2")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(2)
  expect(animateMove.mock.calls[0]?.[0].style).toEqual({ translate: "0px 10px" })
  expect(animateMove.mock.calls[1]?.[0].style).toEqual({ translate: "0px -10px" })
  doc.rerender(
    <FlipList {...options}>
      <div key={2} style={{ height: 10 }}>
        Bar3
      </div>
      <div key={1} style={{ height: 10 }}>
        Foo
      </div>
    </FlipList>,
  )
  await expect.element(doc.getByText("Bar3")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(2)
  expect(animateExit).toHaveBeenCalledTimes(0)
  doc.rerender(
    <FlipList {...options}>
      {[
        <div key={1} style={{ height: 10 }}>
          Foo4
        </div>,
      ]}
    </FlipList>,
  )
  await expect.element(doc.getByText("Foo4")).toBeInTheDocument()
  await expect.element(doc.getByText("Bar3")).not.toBeInTheDocument()
  expect(animateExit).toHaveBeenCalledTimes(1)
  expect(animateMove).toHaveBeenCalledTimes(3)
})

test("new items aren't rendered until exiting animation finishes", async () => {
  const animateEnter = vi.fn()
  const animateExit = vi.fn()
  const options: FlipListOptions = { animateEnter, animateExit }
  const doc = render(
    <FlipList {...options}>
      <div key={1}>Foo</div>
    </FlipList>,
  )
  await expect.element(doc.getByText("Foo")).toBeInTheDocument()
  expect(animateEnter).toHaveBeenCalledTimes(0)

  const animation = new Animation(new KeyframeEffect(null, [{}, {}], { duration: 1000 }))
  animateExit.mockReturnValueOnce(animation)
  doc.rerender(
    <FlipList {...options}>
      <div key={2}>Bar</div>
    </FlipList>,
  )
  animation.play()
  await new Promise((resolve) => setTimeout(resolve, 100))
  await expect.element(doc.getByText("Foo")).toBeInTheDocument()
  expect(animateEnter).toHaveBeenCalledTimes(0)
  expect(animateExit).toHaveBeenCalledTimes(1)
  await expect.element(doc.getByText("Bar")).not.toBeInTheDocument()
  animation.finish()
  await expect.element(doc.getByText("Bar")).toBeInTheDocument()
  await expect.element(doc.getByText("Foo")).not.toBeInTheDocument()
  expect(animateEnter).toHaveBeenCalledTimes(1)
})

test("plays enter animation on mount with animateMount option", async () => {
  const animateEnter = vi.fn()
  const options: FlipListOptions = { animateEnter, animateMount: true }
  const doc = render(
    <FlipList {...options}>
      <div key={1}>Foo</div>
    </FlipList>,
  )
  await expect.element(doc.getByText("Foo")).toBeInTheDocument()
  expect(animateEnter).toHaveBeenCalledTimes(1)
})
