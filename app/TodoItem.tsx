import { forwardRef, useContext, type ComponentProps } from "react"
import { TodoContext, type Todo } from "./TodoApp.js"

export const TodoItem = forwardRef<HTMLDivElement, { todo: Todo } & ComponentProps<"div">>(
  (props, ref) => {
    const { todo, className = "", style = {}, ...rootProps } = props
    const dispatch = useContext(TodoContext)

    return (
      <div
        className={`flex-y gap-sm card ${className}`}
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
        <div className="flex-x gap-sm">
          <div className="flex-x gap-sm">
            <button
              className="square"
              onClick={() => dispatch({ type: "MOVE", id: todo.id, by: -1 })}
            >
              &lt;
            </button>
            <button
              className="square"
              onClick={() => dispatch({ type: "RESIZE", id: todo.id, amount: -1 })}
            >
              X
            </button>
            <button
              className="square"
              onClick={() => dispatch({ type: "RESIZE", id: todo.id, amount: 1 })}
            >
              O
            </button>
            <button
              className="square"
              onClick={() => dispatch({ type: "MOVE", id: todo.id, by: 1 })}
            >
              &gt;
            </button>
          </div>
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => dispatch({ type: "TOGGLE", id: todo.id })}
          />
        </div>
      </div>
    )
  },
)
