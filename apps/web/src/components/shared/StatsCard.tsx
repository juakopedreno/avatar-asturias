import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  delay?: number;
}

export default function StatsCard({ label, value, change, trend = 'neutral', icon: Icon, delay = 0 }: StatsCardProps) {
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
      className="bg-card rounded-xl p-5 card-elevated"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-semibold font-mono-data">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      {change && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>{change}</span>
          <span className="text-muted-foreground font-normal ml-1">vs. mes anterior</span>
        </div>
      )}
    </motion.div>
  );
}
