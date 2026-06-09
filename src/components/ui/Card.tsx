import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
  noPad?: boolean;
}

export function Card({ children, className = '', animate = false, noPad = false }: CardProps) {
  const base = `result-card overflow-hidden ${noPad ? '' : ''} ${className}`;
  if (animate) {
    return (
      <motion.div
        className={base}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    );
  }
  return <div className={base}>{children}</div>;
}

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'indigo';
  icon?: React.ReactNode;
}

const accentMap = {
  blue:   'border-l-blue-500   bg-blue-50   dark:bg-blue-950/40',
  green:  'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  amber:  'border-l-amber-500  bg-amber-50  dark:bg-amber-950/40',
  red:    'border-l-red-500    bg-red-50    dark:bg-red-950/40',
  indigo: 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
};
const valueMap = {
  blue:   'text-blue-700   dark:text-blue-300',
  green:  'text-emerald-700 dark:text-emerald-300',
  amber:  'text-amber-700  dark:text-amber-300',
  red:    'text-red-700    dark:text-red-300',
  indigo: 'text-indigo-700 dark:text-indigo-300',
};

export function StatCard({ label, value, unit, sub, accent = 'blue', icon }: StatCardProps) {
  return (
    <motion.div
      className={`border-l-4 rounded-lg p-4 ${accentMap[accent]} border border-gray-200 dark:border-gray-700/50`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 leading-tight">
          {label}
        </p>
        {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      </div>
      <p className={`mt-1.5 engineering-value text-2xl font-bold ${valueMap[accent]}`}>
        {value}
        {unit && <span className="text-sm font-medium ml-1 opacity-70">{unit}</span>}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>
      )}
    </motion.div>
  );
}
