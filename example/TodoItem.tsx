import { forwardRef, useContext, type ComponentProps } from "react"
import { TodoContext, type Todo } from "./TodoApp.js"

export const TodoItem = forwardRef<HTMLDivElement, { todo: Todo } & ComponentProps<"div">>(
  (props, ref) => {
    const { todo, className = "", style = {}, ...rootProps } = props
    const dispatch = useContext(TodoContext)

    return (
      <div
        className={`flex flex-col gap-2 rounded p-2 ${className}`}
        style={{
          backgroundColor: todo.color,
          gridColumn: `span ${todo.size}`,
          opacity: todo.done ? 0.5 : 1,
          ...style,
        }}
        {...rootProps}
        ref={ref}
      >
        <p className="flex-1">{todo.title}</p>
        <div className="flex gap-2 justify-between">
          <div className="flex gap-2 *:border *:border-current *:leading-0 *:size-6 *:rounded *:hover:bg-current/20">
            <button onClick={() => dispatch({ type: "MOVE", id: todo.id, by: -1 })}>&lt;</button>
            <button onClick={() => dispatch({ type: "RESIZE", id: todo.id, amount: -1 })}>X</button>
            <button onClick={() => dispatch({ type: "RESIZE", id: todo.id, amount: 1 })}>O</button>
            <button onClick={() => dispatch({ type: "MOVE", id: todo.id, by: 1 })}>&gt;</button>
          </div>
          <input
            className="size-6 accent-current"
            type="checkbox"
            checked={todo.done}
            onChange={() => dispatch({ type: "TOGGLE", id: todo.id })}
          />
        </div>
      </div>
    )
  },
)
