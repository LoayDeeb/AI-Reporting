import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3Icon, MessageSquareIcon, UsersIcon, ChevronDownIcon, Scale } from 'lucide-react';

const Navigation = () => {
  const pathname = usePathname();
  const [humanAgentsDropdownOpen, setHumanAgentsDropdownOpen] = useState(false);

  const navItems = [
    {
      href: '/',
      label: 'Dashboard',
      icon: <BarChart3Icon size={20} />,
    },
    {
      href: '/conversations',
      label: 'Conversations',
      icon: <MessageSquareIcon size={20} />,
    },
    {
      href: '/comparison',
      label: 'Human vs AI',
      icon: <Scale size={20} />,
    },
  ];

  const humanAgentItems = [
    {
      href: '/human-agents',
      label: 'Dashboard',
    },
    {
      href: '/human-agents/conversations',
      label: 'Conversations',
    },
  ];

  const isHumanAgentsActive = pathname.startsWith('/human-agents');

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 space-x-8">
          <div className="flex items-center space-x-2">
            <BarChart3Icon className="text-blue-400" size={24} />
            <span className="text-xl font-bold text-white">Analytics</span>
          </div>
          
          <div className="flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  pathname === item.href
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
            
            {/* Human Agents Dropdown */}
            <div className="relative">
              <button
                onClick={() => setHumanAgentsDropdownOpen(!humanAgentsDropdownOpen)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isHumanAgentsActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                <UsersIcon size={20} />
                <span>Human Agents</span>
                <ChevronDownIcon 
                  size={16} 
                  className={`transition-transform duration-200 ${
                    humanAgentsDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {humanAgentsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                  {humanAgentItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setHumanAgentsDropdownOpen(false)}
                      className={`block px-4 py-3 text-sm transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg ${
                        pathname === item.href
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay to close dropdown when clicking outside */}
      {humanAgentsDropdownOpen && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={() => setHumanAgentsDropdownOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navigation; 