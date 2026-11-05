import React from 'react';
import { CheckCircle2, AlertTriangle, Layers, XCircle, ShieldCheck } from 'lucide-react';
import { FitStatus } from '../utils/vram';

interface CompatibilityBadgeProps {
  status: FitStatus;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  showIcon?: boolean;
  tooltipText?: string;
  className?: string;
}

export const CompatibilityBadge: React.FC<CompatibilityBadgeProps> = ({
  status,
  label,
  size = 'sm',
  showIcon = true,
  tooltipText,
  className = '',
}) => {
  // Normalize alias
  const normalized =
    status === 'optimal' ? 'comfortable' : status === 'exceeds' ? 'unsupported' : status;

  let displayLabel = label;
  let colorClasses = '';
  let IconComponent = CheckCircle2;
  let defaultTooltip = '';

  switch (normalized) {
    case 'comfortable':
      displayLabel = displayLabel || 'Comfortable Fit';
      colorClasses =
        'border-teal-500/30 bg-teal-500/10 text-teal-800 dark:border-teal-400/30 dark:bg-teal-500/15 dark:text-teal-300';
      IconComponent = ShieldCheck;
      defaultTooltip = 'Fits inside GPU memory with healthy headroom (>10%). Zero risk of CUDA OOM.';
      break;

    case 'tight':
      displayLabel = displayLabel || 'Tight Fit';
      colorClasses =
        'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300';
      IconComponent = AlertTriangle;
      defaultTooltip = 'Fits in GPU memory but with minimal headroom (<10%). Background apps or long contexts may risk OOM.';
      break;

    case 'offload':
      displayLabel = displayLabel || 'Requires Offloading';
      colorClasses =
        'border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-300';
      IconComponent = Layers;
      defaultTooltip = 'Exceeds GPU VRAM. Requires partial CPU RAM offloading (e.g. llama.cpp -ngl), which reduces token generation speed.';
      break;

    case 'unsupported':
    default:
      displayLabel = displayLabel || 'Not Supported';
      colorClasses =
        'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/15 dark:text-rose-300';
      IconComponent = XCircle;
      defaultTooltip = 'Exceeds available GPU and host memory budget for this configuration.';
      break;
  }

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-1.5 py-0.5 gap-1'
      : size === 'md'
      ? 'text-xs px-2.5 py-1 gap-1.5 font-medium'
      : 'text-[11px] px-2 py-0.5 gap-1 font-medium';

  const iconSizes = size === 'xs' ? 'h-2.5 w-2.5' : size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  return (
    <span
      title={tooltipText || defaultTooltip}
      className={`inline-flex items-center rounded-md border font-mono-num transition-colors ${sizeClasses} ${colorClasses} ${className}`}
    >
      {showIcon && <IconComponent className={`${iconSizes} shrink-0`} />}
      <span>{displayLabel}</span>
    </span>
  );
};
