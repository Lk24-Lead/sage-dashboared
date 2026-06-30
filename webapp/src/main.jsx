import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import LandingPage from './LandingPage.jsx'
import App from './App.jsx'
import './index.css'

function Root() {
  const [app, setApp] = useState(null)

  if (!app) return <LandingPage onSelect={setApp} />
  if (app === 'food') return <App onBack={() => setApp(null)} />
  return <LandingPage onSelect={setApp} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
