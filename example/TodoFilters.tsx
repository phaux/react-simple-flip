import { useContext } from "react"
import { TodoContext } from "./TodoApp.js"

export function TodoFilters(props: { showDone: boolean; onToggleShowDone: () => void }) {
  const { showDone, onToggleShowDone } = props
  const dispatch = useContext(TodoContext)

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2">
        <input
          className="w-6 h-6 accent-indigo-600"
          type="checkbox"
          checked={showDone}
          onChange={onToggleShowDone}
        />
        Show Done
      </label>
      <div className="flex-1" />
      <button
        className="px-2 py-1 text-white bg-indigo-600 rounded hover:bg-indigo-700"
        onClick={() => dispatch({ type: "SORT", by: "id" })}
      >
        Sort by ID
      </button>
      <button
        className="px-2 py-1 text-white bg-indigo-600 rounded hover:bg-indigo-700"
        onClick={() => dispatch({ type: "SORT", by: "title" })}
      >
        Sort by Title
      </button>
      <button
        className="px-2 py-1 text-white bg-indigo-600 rounded hover:bg-indigo-700"
        onClick={() => dispatch({ type: "SORT", by: "size" })}
      >
        Sort by Size
      </button>
    </div>
  )
}
