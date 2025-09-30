import { useContext, useState, type FormEvent } from "react"
import { FlipWrapper } from "../src/Flip.js"
import { TodoContext } from "./TodoApp.js"

export function TodoAddForm() {
  const dispatch = useContext(TodoContext)
  const [isBig, setIsBig] = useState(false)

  function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault()
    const fd = new FormData(ev.currentTarget)
    dispatch({
      type: "ADD",
      data: {
        title: fd.get("title")?.toString() ?? "",
        color: `lch(50 50 ${Math.random() * 360}deg / 50%)`,
        done: false,
        size: 1,
      },
    })
    ev.currentTarget.reset()
  }

  return (
    <form className="flex-x relative" onSubmit={handleSubmit}>
      <FlipWrapper>
        <button type="button" onClick={() => setIsBig((v) => !v)}>
          Resize
        </button>
      </FlipWrapper>
      <FlipWrapper>
        {isBig ? (
          <textarea name="title" rows={3} required className="flex-1" />
        ) : (
          <input type="text" name="title" required className="flex-1" />
        )}
      </FlipWrapper>
      <FlipWrapper>
        <button type="submit">Add</button>
      </FlipWrapper>
    </form>
  )
}
