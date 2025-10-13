/// <reference types="@vitest/browser/providers/playwright" />
import { expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"
import { Flip, type FlipOptions } from "../src/Flip.js"

test("Flip calls animateMove", async () => {
  const animateMove = vi.fn<NonNullable<FlipOptions["animateMove"]>>(() => null)
  const doc = render(
    <Flip animateMove={animateMove}>
      <div style={{ marginTop: 10 }}>Test</div>
    </Flip>,
  )
  await expect.element(doc.getByText("Test")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(0)
  doc.rerender(
    <Flip animateMove={animateMove}>
      <div style={{ marginTop: 20 }}>Test2</div>
    </Flip>,
  )
  await expect.element(doc.getByText("Test2")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(1)
  expect(animateMove.mock.calls[0]?.[0].style).toEqual({ translate: "0px -10px" })
  doc.rerender(
    <Flip animateMove={animateMove}>
      <div style={{ marginTop: 20 }}>Test3</div>
    </Flip>,
  )
  await expect.element(doc.getByText("Test3")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(1)
})
