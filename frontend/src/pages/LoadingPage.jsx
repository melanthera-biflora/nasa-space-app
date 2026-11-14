import Footer from '../components/Footer'
import './LoadingPage.css'

export default function LoadingPage() {
  return (
    <div className="loading-page">
      <main className="loading-content">
        <h1>Checking your location</h1>
        <p>Preparing your climate and health report.</p>
      </main>

      <Footer />
    </div>
  )
}