import { useState } from 'react'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <h1>QLSV - Quản lý Sinh viên</h1>
        <p>Hệ thống quản lý sinh viên toàn diện</p>
      </div>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App
