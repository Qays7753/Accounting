import React from 'react'

/**
 * Error Boundary - catches unhandled errors and shows friendly message
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-expense-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-expense-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2">حدث خطأ غير متوقع</h1>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              نعتذر عن هذا الخطأ. بياناتك آمنة. يمكنك إعادة تحميل التطبيق للمتابعة.
            </p>
            <button onClick={this.handleReset} className="btn-primary w-full">
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
