import React, { useState, useCallback } from 'react';
import { SearchIcon } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

const SearchBar = React.memo(({ onSearch }: SearchBarProps) => {
  const [value, setValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onSearch(newValue);
  }, [onSearch]);

  return (
    <div className="relative">
      <SearchIcon
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        size={20}
      />
      <input
        type="text"
        value={value}
        placeholder="Search conversations..."
        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        onChange={handleChange}
      />
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar; 