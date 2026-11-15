import { useCallback, useState } from 'react'
import HealthConditionPage from './pages/HealthConditionPage'
import LocationPage from './pages/LocationPage'
import LoadingPage from './pages/LoadingPage'
import ReportPage from './pages/ReportPage'

// Thứ tự các bước: 0 Health → 1 Location → 2 Loading → 3 Report
export default function App() {
  const [activePage, setActivePage] = useState(0)
  const [household, setHousehold] = useState([])
  const [location, setLocation] = useState(null)

  const goTo = useCallback((index) => {
    setActivePage(index)
    window.scrollTo({ top: 0 })
  }, [])

  // useCallback để LoadingPage không bị reset bộ đếm mỗi lần App render lại
  const handleLoadingComplete = useCallback(() => goTo(3), [goTo])

  // Quay về trang đầu và xóa dữ liệu đã nhập để bắt đầu lại
  const handleHome = useCallback(() => {
    setHousehold([])
    setLocation(null)
    goTo(0)
  }, [goTo])

  switch (activePage) {
    case 0:
      return (
        <HealthConditionPage
          onNext={(data) => {
            setHousehold(data)
            goTo(1)
          }}
        />
      )
    case 1:
      return (
        <LocationPage
          onCheckResult={(loc) => {
            setLocation(loc)
            goTo(2)
          }}
        />
      )
    case 2:
      return (
        <LoadingPage
          location={location?.name}
          onComplete={handleLoadingComplete}
        />
      )
    default:
      return <ReportPage onHome={handleHome} />
  }
}
