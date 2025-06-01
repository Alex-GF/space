import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMoreVertical, FiPlus, FiSlash } from 'react-icons/fi';
import useAuth from '@/hooks/useAuth';

interface ServiceOptionsMenuProps {
  onAddVersion: () => void;
  onDisableService: () => void;
}

export default function ServiceOptionsMenu({
  onAddVersion,
  onDisableService,
}: ServiceOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const { user } = useAuth();

  // Cierra el menú si se hace click fuera
  function handleBlur(e: React.FocusEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }

  return (
    <div className="relative" tabIndex={0} onBlur={handleBlur}>
      <button
        ref={btnRef}
        className="cursor-pointer p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
        aria-label="Service options"
        onClick={() => setOpen(v => !v)}
      >
        <FiMoreVertical size={22} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', duration: 0.18 }}
            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
          >
            <button
              className="cursor-pointer w-full flex items-center gap-2 px-4 py-3 text-sm text-indigo-700 hover:bg-gray-200 transition font-medium"
              onClick={() => {
                setOpen(false);
                onAddVersion();
              }}
            >
              <FiPlus className="text-indigo-500" /> Add Version
            </button>
            {user?.role.toLowerCase() === 'admin' && (
              <button
                className="cursor-pointer w-full flex items-center gap-2 px-4 py-3 text-sm text-red-700 hover:bg-gray-200 transition font-medium border-t border-gray-100"
                onClick={() => {
                  setOpen(false);
                  onDisableService();
                }}
              >
                <FiSlash className="text-red-500" /> Disable Service
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
