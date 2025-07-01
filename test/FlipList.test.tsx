/// <reference types="@vitest/browser/providers/playwright" />
import { expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"
import { FlipList } from "../src/FlipList.js"

test("FlipList works", async () => {
  const onMove = vi.fn()
  const onEnter = vi.fn()
  const onExit = vi.fn()
  const options = { onMove, onEnter, onExit }
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
  expect(onEnter).toHaveBeenCalledTimes(2)
  expect(onMove).toHaveBeenCalledTimes(0)
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
  expect(onMove).toHaveBeenCalledTimes(2)
  expect(onMove.mock.calls[0]?.[1]).toEqual({ translate: "0px 10px" })
  expect(onMove.mock.calls[1]?.[1]).toEqual({ translate: "0px -10px" })
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
  expect(onMove).toHaveBeenCalledTimes(2)
  expect(onExit).toHaveBeenCalledTimes(0)
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
  expect(onExit).toHaveBeenCalledTimes(1)
  expect(onMove).toHaveBeenCalledTimes(2)
  await expect.element(doc.getByText("Bar3")).not.toBeInTheDocument()
  expect(onMove).toHaveBeenCalledTimes(3)
})
