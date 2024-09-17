import "./glass-box.css"

export default function GlassBox({ children, size }) {
  return (
    <div className="glass-box" style={size}>
      {children}
    </div>
  )
}
