import React, { useState } from 'react'
import SearchInput from '../components/SearchInput'

const Home = () => {
  const [currentQuery, setCurrentQuery] = useState('')

  const handleSearch = (query: string) => {
    setCurrentQuery(query)
    console.log('Searching for:', query)
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
        <div className="mt-12">
          {/* AnswerView and SourceSidebar will go here */}
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home

