import { createContext, useReducer, useState, type ActionDispatch } from "react"
import { TodoAddForm } from "./TodoAddForm.js"
import { TodoList } from "./TodoList.js"
import { TodoFilters } from "./TodoFilters.js"

export interface TodoData {
  title: string
  color: string
  size: number
  done: boolean
}

export interface Todo extends TodoData {
  id: string
}

export type TodoAction =
  | { type: "ADD"; data: TodoData }
  | { type: "TOGGLE"; id: string }
  | { type: "MOVE"; id: string; by: number }
  | { type: "RESIZE"; id: string; amount: number }
  | { type: "SORT"; by: "id" | "title" | "size" }

function todoReducer(todos: Todo[], action: TodoAction) {
  switch (action.type) {
    case "ADD":
      return [
        ...todos,
        {
          id: Math.random().toString(36).slice(2),
          ...action.data,
        },
      ]
    case "TOGGLE":
      return todos.map((todo) => (todo.id === action.id ? { ...todo, done: !todo.done } : todo))
    case "MOVE": {
      const index = todos.findIndex((todo) => todo.id === action.id)
      if (index === -1) return todos
      const other = todos[index + action.by]
      if (other == null) return todos
      todos = [...todos]
      todos[index + action.by] = todos[index]!
      todos[index] = other
      return todos
    }
    case "RESIZE":
      return todos
        .map((todo) =>
          todo.id === action.id
            ? todo.size + action.amount < 1
              ? null
              : { ...todo, size: todo.size + action.amount }
            : todo,
        )
        .filter((todo) => todo != null)
    case "SORT":
      return [...todos].sort((a, b) => (a[action.by] > b[action.by] ? 1 : -1))
    default:
      return todos
  }
}

const defaultTodos: Todo[] = [
  { id: "1234", title: "Buy milk", color: "lch(50 50 240deg / 50%)", size: 1, done: false },
  { id: "4321", title: "Feed cat", color: "lch(50 50 120deg / 50%)", size: 1, done: false },
  { id: "1337", title: "Learn React", color: "lch(50 50 0deg / 50%)", size: 1, done: true },
  {
    id: "2137",
    title: "Install react-simple-flip",
    color: "lch(50 50 60deg / 50%)",
    size: 2,
    done: false,
  },
]

export const TodoContext = createContext<ActionDispatch<[TodoAction]>>(null as any)

export default function TodoApp() {
  const [todos, dispatch] = useReducer(todoReducer, defaultTodos)
  const [showDone, setShowDone] = useState(true)

  return (
    <TodoContext.Provider value={dispatch}>
      <main className="flex flex-col gap-8 p-8 mx-auto max-w-screen-md">
        <h1 className="text-4xl font-bold">Animated TODO App</h1>
        <TodoFilters showDone={showDone} onToggleShowDone={() => setShowDone((v) => !v)} />
        <TodoList showDone={showDone} todos={todos} />
        <TodoAddForm />
      </main>
    </TodoContext.Provider>
  )
}
