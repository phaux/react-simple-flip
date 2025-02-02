import { useContext } from "react"
import { TodoContext } from "./TodoApp.js"

export function TodoFilters(props: { showDone: boolean; onToggleShowDone: () => void }) {
  const { showDone, onToggleShowDone } = props
  const dispatch = useContext(TodoContext)

  return (
    <div className="flex-x gap-sm">
      <label className="flex-x gap-sm">
        <input type="checkbox" checked={showDone} onChange={onToggleShowDone} />
        Show Done
      </label>
      <div className="flex-1" />
      <button onClick={() => dispatch({ type: "SORT", by: "id" })}>Sort by ID</button>
      <button onClick={() => dispatch({ type: "SORT", by: "title" })}>Sort by Title</button>
      <button onClick={() => dispatch({ type: "SORT", by: "size" })}>Sort by Size</button>
    </div>
  )
}
