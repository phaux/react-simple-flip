export function TodoSettings(props: {
  renderList: boolean
  animateMount: boolean
  onToggleRenderList: () => void
  onToggleAnimateMount: () => void
}) {
  const { renderList, onToggleRenderList, animateMount, onToggleAnimateMount } = props
  return (
    <div className="flex-x gap-lg">
      <label className="flex-x gap-sm">
        <input type="checkbox" checked={renderList} onChange={onToggleRenderList} />
        <span className="flex-1">Render list</span>
      </label>
      <label className="flex-x gap-sm">
        <input type="checkbox" checked={animateMount} onChange={onToggleAnimateMount} />
        <span className="flex-1">Animate on mount</span>
      </label>
    </div>
  )
}
