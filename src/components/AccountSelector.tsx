import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Trash2 } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  // add other fields if necessary
}

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function AccountSelector({ accounts, selectedAccountId, onSelect, onDelete }: AccountSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#050505] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold truncate"
      >
        <span className="truncate">{selectedAccount?.name || 'Sélectionner...'}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-50 w-full mt-1 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-xl overflow-hidden"
          >
            {accounts.map((acc) => (
              <motion.div
                key={acc.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between px-2 py-2 hover:bg-white/5 cursor-pointer"
                onClick={() => {
                  onSelect(acc.id);
                  setIsOpen(false);
                }}
              >
                <span className={`text-xs ${selectedAccountId === acc.id ? 'text-indigo-400 font-bold' : 'text-neutral-300'}`}>
                  {acc.name}
                </span>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(acc.id);
                    }}
                    className="text-neutral-500 hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
