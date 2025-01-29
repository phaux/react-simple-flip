/// <reference types="vite/client" />
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import TodoApp from "./TodoApp.js"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TodoApp />
  </StrictMode>,
)
