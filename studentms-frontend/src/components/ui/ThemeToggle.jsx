import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`rounded-full p-2 transition-colors ${
        theme === 'dark'
          ? 'hover:bg-white/10'
          : 'hover:bg-black/5'
      }`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <SunIcon className="h-5 w-5 text-yellow-300" />
      ) : (
        <MoonIcon className="h-5 w-5 text-slate-700" />
      )}
    </button>
  );
}