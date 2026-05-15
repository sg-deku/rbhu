import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold">Welcome to rbhu 🚀</h1>
    <p className="text-gray-600 mt-2 mb-6">Your project is ready! Start building something amazing.</p>
    
    <Link 
      to="/settings/integrations" 
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
    >
      Manage Integrations
    </Link>
  </div>
)


export default Home
