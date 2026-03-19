import { expect, test, vi } from "vitest"
import { render } from "vitest-browser-react"
import { Flip, type FlipOptions } from "../src/Flip.js"

test("Flip calls animateMove", async () => {
  const animateMove = vi.fn<NonNullable<FlipOptions["animateMove"]>>(() => null)
  const screen = await render(
    <Flip animateMove={animateMove}>
      <div style={{ marginTop: 10 }}>Test</div>
    </Flip>,
  )
  await expect.element(screen.getByText("Test")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(0)
  await screen.rerender(
    <Flip animateMove={animateMove}>
      <div style={{ marginTop: 20 }}>Test2</div>
    </Flip>,
  )
  await expect.element(screen.getByText("Test2")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(1)
  expect(animateMove.mock.calls[0]?.[0].style).toEqual({ translate: "0px -10px" })
  await screen.rerender(
    <Flip animateMove={animateMove}>
      <div style={{ marginTop: 20 }}>Test3</div>
    </Flip>,
  )
  await expect.element(screen.getByText("Test3")).toBeInTheDocument()
  expect(animateMove).toHaveBeenCalledTimes(1)
})
