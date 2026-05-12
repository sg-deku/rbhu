import React, { useState } from 'react'
import SearchInput from '../components/SearchInput'
import AnswerView from '../components/AnswerView'
import { api } from '../services/api'

const Home = () => {
  const [currentQuery, setCurrentQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (query: string) => {
    setCurrentQuery(query)
    setIsLoading(true)
    setAnswer('')
    
    try {
      const data = await api.search.query(query)
      setAnswer(data.answer)
    } catch (err) {
      console.error('Search failed', err)
      setAnswer('Sorry, something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
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
      </div>

      {currentQuery && (
        <div className="mt-12 flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <AnswerView answer={answer} isLoading={isLoading} />
          </div>
          {/* SourceSidebar will go here */}
          <div className="w-full md:w-80">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">Sources will appear here</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Home;

