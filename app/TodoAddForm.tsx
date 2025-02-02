import { useContext, type FormEvent } from "react"
import { TodoContext } from "./TodoApp.js"

export function TodoAddForm() {
  const dispatch = useContext(TodoContext)

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
    <form className="flex-x" onSubmit={handleSubmit}>
      <input type="text" name="title" required className="flex-1" />
      <button type="submit">Add</button>
    </form>
  )
}
