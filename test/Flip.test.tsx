/// <reference types="@vitest/browser/providers/playwright" />
import { expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"
import { Flip, FlipWrapper } from "../src/Flip.js"

test("Flip calls onMove", async () => {
  const onMove = vi.fn()
  const doc = render(
    <Flip style={{ marginTop: 10 }} options={{ onMove }}>
      Test
    </Flip>,
  )
  await expect.element(doc.getByText("Test")).toBeInTheDocument()
  expect(onMove).toHaveBeenCalledTimes(0)
  doc.rerender(
    <Flip style={{ marginTop: 20 }} options={{ onMove }}>
      Test
    </Flip>,
  )
  expect(onMove).toHaveBeenCalledTimes(1)
  expect(onMove.mock.calls[0]?.[1]).toEqual({ translate: "0px -10px" })
  doc.rerender(
    <Flip style={{ marginTop: 20 }} options={{ onMove }}>
      Test
    </Flip>,
  )
  expect(onMove).toHaveBeenCalledTimes(1)
})

test("FlipWrapper calls onMove", async () => {
  const onMove = vi.fn()
  const doc = render(
    <FlipWrapper onMove={onMove}>
      <div style={{ marginTop: 10 }}>Test</div>
    </FlipWrapper>,
  )
  await expect.element(doc.getByText("Test")).toBeInTheDocument()
  expect(onMove).toHaveBeenCalledTimes(0)
  doc.rerender(
    <FlipWrapper onMove={onMove}>
      <div style={{ marginTop: 20 }}>Test</div>
    </FlipWrapper>,
  )
  expect(onMove).toHaveBeenCalledTimes(1)
  expect(onMove.mock.calls[0]?.[1]).toEqual({ translate: "0px -10px" })
  doc.rerender(
    <FlipWrapper onMove={onMove}>
      <div style={{ marginTop: 20 }}>Test</div>
    </FlipWrapper>,
  )
  expect(onMove).toHaveBeenCalledTimes(1)
})
