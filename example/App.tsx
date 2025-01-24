import { useMemo, useState, type ComponentProps, type JSX } from "react"
import { FlipList } from "../lib/Flip.js"

export default function App(): JSX.Element {
  const [todos, setTodos] = useState(() => [
    { id: "1", title: "Test TODO", color: "lch(50 50 0deg / 50%)", size: 1 },
  ])

  return (
    <main className="flex flex-col gap-8 p-8 mx-auto container">
      <h1 className="text-4xl font-bold">Animated TODO</h1>
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(192px,1fr))]">
        <FlipList>
          {
            // useMemo(
            //   () =>
            todos.map((todo, index) => (
              <Item
                key={todo.id}
                {...todo}
                onSizeUp={() =>
                  setTodos((todos) =>
                    todos.map((todo, i) => (i === index ? { ...todo, size: todo.size + 1 } : todo)),
                  )
                }
                onSizeDown={() =>
                  setTodos((todos) =>
                    todos
                      .map((todo, i) =>
                        i === index
                          ? todo.size <= 1
                            ? null!
                            : { ...todo, size: todo.size - 1 }
                          : todo,
                      )
                      .filter((todo) => todo != null),
                  )
                }
                onMoveAfter={() =>
                  setTodos((todos) => {
                    if (index == null) return todos
                    const other = todos[index + 1]
                    if (other == null) return todos
                    todos = [...todos]
                    todos[index + 1] = todos[index]!
                    todos[index] = other
                    return todos
                  })
                }
                onMoveBefore={() =>
                  setTodos((todos) => {
                    if (index == null) return todos
                    const other = todos[index - 1]
                    if (other == null) return todos
                    todos = [...todos]
                    todos[index - 1] = todos[index]!
                    todos[index] = other
                    return todos
                  })
                }
              />
            ))
            //  , [todos],
            // )
          }
        </FlipList>
      </div>
      <form
        className="flex gap-4"
        onSubmit={(ev) => {
          ev.preventDefault()
          const fd = new FormData(ev.currentTarget)
          setTodos((todos) => [
            ...todos,
            {
              id: Date.now().toString(),
              title: fd.get("title")?.toString() ?? "",
              color: `lch(50 50 ${Math.random() * 360}deg / 50%)`,
              size: 1,
            },
          ])
          ev.currentTarget.reset()
        }}
      >
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
    </main>
  )
}

function Item(
  props: {
    title: string
    color: string
    size: number
    onSizeDown: () => void
    onMoveBefore: () => void
    onMoveAfter: () => void
    onSizeUp: () => void
    className?: string
  } & ComponentProps<"div">,
) {
  const {
    title,
    color,
    size,
    onSizeDown,
    onSizeUp,
    onMoveAfter,
    onMoveBefore,
    className = "",
    ...divProps
  } = props
  return (
    <div
      className={`flex flex-col gap-2 rounded p-2 ${className ?? ""}`}
      style={{
        backgroundColor: color,
        gridColumn: `span ${size}`,
      }}
      // options={springAnimation}
      {...divProps}
    >
      <p className="flex-1">{title}</p>
      <div className="flex gap-2 justify-end *:border *:border-current *:px-2 *:rounded">
        <button onClick={onMoveBefore}>&lt;</button>
        <button onClick={onSizeDown}>X</button>
        <button onClick={onSizeUp}>O</button>
        <button onClick={onMoveAfter}>&gt;</button>
      </div>
    </div>
  )
}
