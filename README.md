# React Simple FLIP

A library for FLIP animations in React.

![Example GIF](./example.gif)

```jsx
import { useState } from "react"
import { FlipList } from "react-simple-flip"

export function App() {
  const [todos, setTodos] = useState([])

  return (
    <ul>
      <FlipList>
        {todos.map((todo, idx) => (
          <li key={idx}>{todo}</li>
        ))}
      </FlipList>
    </ul>
  )
}
```
