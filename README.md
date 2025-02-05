# React Simple FLIP

[![npm](https://img.shields.io/npm/v/react-simple-flip)](https://www.npmjs.com/package/react-simple-flip)
[![Bundlephobia](https://img.shields.io/bundlephobia/minzip/react-simple-flip)](https://bundlephobia.com/package/react-simple-flip)
[![jsDocs.io](https://img.shields.io/badge/jsDocs.io-reference-blue)](https://www.jsdocs.io/package/react-simple-flip)
[![Stackblitz](https://developer.stackblitz.com/img/open_in_stackblitz_small.svg)](https://stackblitz.com/github/phaux/react-simple-flip?file=app/TodoList.tsx)

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
