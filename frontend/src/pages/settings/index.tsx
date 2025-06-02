import { motion } from 'framer-motion';
import SettingToggle from '@/components/SettingToggle';
import useAuth from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';

export default function SettingsPage() {
  const { logout } = useAuth();
  const { darkMode, setDarkMode } = useSettings();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 py-10 px-2"
    >
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-bold mb-8 text-indigo-800 dark:text-gray-100"
      >
        Settings
      </motion.h2>
      <div className="w-full max-w-md flex flex-col gap-4">
        <SettingToggle
          label="Dark mode"
          checked={darkMode}
          onChange={setDarkMode}
        />
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="mt-12 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-bold py-2 px-8 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
        onClick={logout}
      >
        Log out
      </motion.button>
    </motion.div>
  );
}