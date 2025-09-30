import { FlipList } from "../src/FlipList.js"
import { type Todo } from "./TodoApp.js"
import { TodoItem } from "./TodoItem.js"

export function TodoList(props: { todos: Todo[]; showDone: boolean }) {
  const { todos, showDone } = props

  return (
    <div className="grid relative">
      <FlipList>
        {todos
          .filter((todo) => showDone || !todo.done)
          .map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
      </FlipList>
    </div>
  )
}
