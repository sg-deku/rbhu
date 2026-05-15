import React, { useState, useEffect } from 'react'
import SearchInput from '../components/SearchInput'
import AnswerView from '../components/AnswerView'
import SourceSidebar, { Source } from '../components/SourceSidebar'
import QueryHistory from '../components/QueryHistory'

const Home = () => {
  const [currentQuery, setCurrentQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    const savedHistory = localStorage.getItem('search_history')
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
    }
  }, [])

  const saveToHistory = (query: string) => {
    const newHistory = [query, ...history.filter(q => q !== query)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem('search_history', JSON.stringify(newHistory))
  }

  const handleSearch = async (query: string) => {
    setCurrentQuery(query)
    setIsLoading(true)
    setAnswer('')
    setSources([])
    saveToHistory(query)
    
    // Using SSE for real-time streaming
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
    const eventSource = new EventSource(`${API_URL}/search/stream?query=${encodeURIComponent(query)}`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.chunk) {
        setIsLoading(false)
        setAnswer((prev) => prev + data.chunk)
      }

      if (data.done) {
        setSources(data.sources || [])
        eventSource.close()
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
      eventSource.close()
      setIsLoading(false)
      if (!answer) {
        setAnswer('Sorry, something went wrong. Please try again.')
      }
    }
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('search_history')
  }

  return (
    <div className="w-full">
      <div className={`transition-all duration-500 ${currentQuery ? 'mt-4' : 'mt-24 max-w-3xl mx-auto'}`}>
        {!currentQuery && (
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
              What do you want to know?
            </h1>
            <p className="text-lg sm:text-xl text-gray-500">
              Search through your connected apps and get instant answers.
            </p>
          </div>
        )}
        
        <SearchInput onSearch={handleSearch} />
        
        {!currentQuery && (
          <div className="mt-10">
            <QueryHistory 
              history={history} 
              onSelectQuery={handleSearch} 
              onClearHistory={clearHistory} 
            />
          </div>
        )}
      </div>

      {currentQuery && (
        <div className="mt-10 flex flex-col xl:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <AnswerView answer={answer} isLoading={isLoading} />
          </div>
          <div className="w-full xl:w-96 flex-shrink-0">
            <SourceSidebar sources={sources} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Home