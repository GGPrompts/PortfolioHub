import React, { useState } from 'react'
import ExampleComponent from './components/ExampleComponent'
import styles from './App.module.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>PROJECT_NAME</h1>
        <p>A new project in the Claude Development Portfolio</p>
      </header>

      <main className={styles.main}>
        <ExampleComponent 
          count={count} 
          onCountChange={setCount}
        />
        
        <section className={styles.section}>
          <h2>Getting Started</h2>
          <p>This project template includes:</p>
          <ul>
            <li>React 18 with TypeScript</li>
            <li>Vite for fast development</li>
            <li>CSS Modules for styling</li>
            <li>Portfolio integration ready</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Next Steps</h2>
          <ol>
            <li>Update CLAUDE.md with your project vision</li>
            <li>Replace this template content with your app</li>
            <li>Add your project to the portfolio manifest</li>
            <li>Start building something amazing!</li>
          </ol>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Built with the Claude Development Portfolio Template</p>
      </footer>
    </div>
  )
}

export default App