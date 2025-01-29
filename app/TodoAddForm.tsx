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
    <form className="flex gap-4" onSubmit={handleSubmit}>
      <input
        type="text"
        name="title"
        required
        className="border-none ring-inset ring-1 ring-zinc-400 focus:ring-sky-500 focus:ring-2 outline-none rounded p-2 flex-1"
      />
      <button type="submit" className="bg-sky-300 px-3 py-2 rounded hover:bg-sky-400 text-black">
        Add
      </button>
    </form>
  )
}
