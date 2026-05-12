import React, { useState, useEffect } from 'react'
import SearchInput from '../components/SearchInput'
import AnswerView from '../components/AnswerView'
import SourceSidebar, { Source } from '../components/SourceSidebar'
import QueryHistory from '../components/QueryHistory'
import { api } from '../services/api'

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
    
    try {
      const data = await api.search.query(query)
      setAnswer(data.answer)
      setSources(data.sources || [])
    } catch (err) {
      console.error('Search failed', err)
      setAnswer('Sorry, something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('search_history')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className={`transition-all duration-500 ${currentQuery ? 'mt-8' : 'mt-32'}`}>
        {!currentQuery && (
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
              What do you want to know?
            </h1>
            <p className="text-xl text-gray-500">
              Search through your documents and get instant answers.
            </p>
          </div>
        )}
        
        <SearchInput onSearch={handleSearch} />
        
        {!currentQuery && (
          <QueryHistory 
            history={history} 
            onSelectQuery={handleSearch} 
            onClearHistory={clearHistory} 
          />
        )}
      </div>

      {currentQuery && (
        <div className="mt-12 flex flex-col lg:flex-row gap-12">
          <div className="flex-1 min-w-0">
            <AnswerView answer={answer} isLoading={isLoading} />
          </div>
          <div className="w-full lg:w-80 flex-shrink-0">
            <SourceSidebar sources={sources} isLoading={isLoading} />
          </div>
        </div>
      )}
    </div>
  )
}

export default Home;

