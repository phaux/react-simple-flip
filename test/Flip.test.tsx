/// <reference types="@vitest/browser/providers/playwright" />
import { expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"
import { Flip, FlipWrapper } from "../src/Flip.js"

test("Flip calls animateMove", async () => {
  const animateMove = vi.fn()
  const doc = render(
    <Flip style={{ marginTop: 10 }} options={{ animateMove }}>
      Test
    </Flip>,
  )
  await expect.element(doc.getByText("Test")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(0)
  doc.rerender(
    <Flip style={{ marginTop: 20 }} options={{ animateMove }}>
      Test
    </Flip>,
  )
  expect(animateMove).toHaveBeenCalledTimes(1)
  expect(animateMove.mock.calls[0]?.[0].style).toEqual({ translate: "0px -10px" })
  doc.rerender(
    <Flip style={{ marginTop: 20 }} options={{ animateMove }}>
      Test
    </Flip>,
  )
  expect(animateMove).toHaveBeenCalledTimes(1)
})

test("FlipWrapper calls animateMove", async () => {
  const animateMove = vi.fn()
  const doc = render(
    <FlipWrapper animateMove={animateMove}>
      <div style={{ marginTop: 10 }}>Test</div>
    </FlipWrapper>,
  )
  await expect.element(doc.getByText("Test")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(0)
  doc.rerender(
    <FlipWrapper animateMove={animateMove}>
      <div style={{ marginTop: 20 }}>Test</div>
    </FlipWrapper>,
  )
  expect(animateMove).toHaveBeenCalledTimes(1)
  expect(animateMove.mock.calls[0]?.[0].style).toEqual({ translate: "0px -10px" })
  doc.rerender(
    <FlipWrapper animateMove={animateMove}>
      <div style={{ marginTop: 20 }}>Test</div>
    </FlipWrapper>,
  )
  expect(animateMove).toHaveBeenCalledTimes(1)
})
