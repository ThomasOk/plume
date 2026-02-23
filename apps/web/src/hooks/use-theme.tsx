import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type Theme = 'light' | 'dark' | 'paper';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
} | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(
    (localStorage.theme as Theme) ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'),
  );

  useEffect(() => {
    localStorage.theme = theme;
    const classList = document.documentElement.classList;
    const style = document.documentElement.style;
    classList.remove('dark', 'paper');

    if (theme === 'dark') {
      classList.add('dark');
      style.colorScheme = 'dark';
    } else if (theme === 'paper') {
      classList.add('paper');
      style.colorScheme = 'light';
    } else {
      style.colorScheme = 'light';
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
