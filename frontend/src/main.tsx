import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { message } from 'antd'
import { store } from './app/store'
import { setAuthFailureHandler } from './api/axiosClient'
import { sessionExpired } from './features/auth/authSlice'
import App from './App'

// Khi refresh thất bại: đưa người dùng về trang đăng nhập (vẫn nhớ trang đang xem)
setAuthFailureHandler(() => {
  store.dispatch(sessionExpired())
  message.warning('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
})

async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </StrictMode>,
  )
})