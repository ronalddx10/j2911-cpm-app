/**
 * Design Tokens for CPM Order Monitoring System (Project Itadakimasu)
 * Consolidated from DesignReference mockups and application specifications.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Brand Primary Palette
    brand: {
      primary: '#2563eb', // blue-600
      primaryHover: '#1d4ed8', // blue-700
      primaryLight: '#dbeafe', // blue-100
      primaryGlow: 'rgba(37, 99, 235, 0.2)',
      accent: '#38bdf8', // sky-400
      accentDark: '#0284c7', // sky-600
    },
    // Neutrals & Surface Colors (Slate Palette)
    neutral: {
      bgLight: '#f8fafc', // slate-50
      bgDark: '#020617', // slate-950
      surfaceLight: '#ffffff', // white
      surfaceDark: '#0f172a', // slate-900
      surfaceSubtleDark: '#1e293b', // slate-800
      borderLight: '#e2e8f0', // slate-200
      borderDark: '#1e293b', // slate-800
      borderSubtleLight: '#f1f5f9', // slate-100
      borderSubtleDark: '#334155', // slate-700
      textHeadingLight: '#0f172a', // slate-900
      textHeadingDark: '#ffffff', // white
      textBodyLight: '#334155', // slate-700
      textBodyDark: '#cbd5e1', // slate-300
      textMutedLight: '#64748b', // slate-500
      textMutedDark: '#94a3b8', // slate-400
    },
    // Order Lifecycle & Semantic Status Colors
    status: {
      DRAFT: {
        bgLight: '#f1f5f9', // slate-100
        textLight: '#334155', // slate-700
        borderLight: '#e2e8f0', // slate-250 / slate-200
        bgDark: '#1e293b', // slate-800
        textDark: '#94a3b8', // slate-400
        borderDark: '#334155',
        hex: '#64748b',
        rgb: [100, 116, 139] as [number, number, number],
      },
      FOR_UPDATE: {
        bgLight: '#eff6ff', // blue-50 / blue-100
        textLight: '#1e40af', // blue-800
        borderLight: '#bfdbfe', // blue-200
        bgDark: 'rgba(30, 58, 138, 0.3)', // blue-900/30
        textDark: '#60a5fa', // blue-400
        borderDark: '#1e3a8a',
        hex: '#2563eb',
        rgb: [37, 99, 235] as [number, number, number],
      },
      PENDING_APPROVAL: {
        bgLight: '#fef3c7', // amber-100
        textLight: '#92400e', // amber-800
        borderLight: '#fde68a', // amber-200
        bgDark: 'rgba(120, 53, 15, 0.3)', // amber-950/30
        textDark: '#fbbf24', // amber-400
        borderDark: '#78350f',
        hex: '#d97706',
        rgb: [217, 119, 6] as [number, number, number],
      },
      APPROVED: {
        bgLight: '#d1fae5', // emerald-100
        textLight: '#065f46', // emerald-800
        borderLight: '#a7f3d0', // emerald-200
        bgDark: 'rgba(6, 78, 59, 0.3)', // emerald-950/30
        textDark: '#34d399', // emerald-400
        borderDark: '#064e3b',
        hex: '#059669',
        rgb: [5, 150, 105] as [number, number, number],
      },
      DELIVERED: {
        bgLight: '#e0e7ff', // indigo-100
        textLight: '#3730a3', // indigo-800
        borderLight: '#c7d2fe', // indigo-200
        bgDark: 'rgba(49, 46, 129, 0.3)', // indigo-950/30
        textDark: '#818cf8', // indigo-400
        borderDark: '#312e81',
        hex: '#4f46e5',
        rgb: [79, 70, 229] as [number, number, number],
      },
      COMPLETED: {
        bgLight: '#ccfbf1', // teal-100
        textLight: '#115e59', // teal-800
        borderLight: '#99f6e4', // teal-200
        bgDark: 'rgba(19, 78, 74, 0.3)', // teal-950/30
        textDark: '#2dd4bf', // teal-400
        borderDark: '#134e4a',
        hex: '#0d9488',
        rgb: [13, 148, 136] as [number, number, number],
      },
      PAID: {
        bgLight: '#dcfce7', // green-100
        textLight: '#166534', // green-800
        borderLight: '#bbf7d0', // green-200
        bgDark: 'rgba(20, 83, 45, 0.4)', // green-950/40
        textDark: '#4ade80', // green-400
        borderDark: '#14532d',
        hex: '#16a34a',
        rgb: [22, 163, 74] as [number, number, number],
      },
      CANCELLED: {
        bgLight: '#ffe4e6', // rose-100
        textLight: '#9f1239', // rose-800
        borderLight: '#fecdd3', // rose-200
        bgDark: 'rgba(136, 19, 55, 0.3)', // rose-950/30
        textDark: '#fb7185', // rose-400
        borderDark: '#881337',
        hex: '#e11d48',
        rgb: [225, 29, 72] as [number, number, number],
      },
    },
  },

  // Typography Tokens
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem', // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },

  // PDF Color Tokens (RGB values mapped to 0-1 range for PDF vector painting)
  pdf: {
    brandPrimary: '0.145 0.388 0.922 rg', // #2563eb (blue-600)
    brandPrimaryStroke: '0.145 0.388 0.922 RG',
    slate900: '0.06 0.09 0.16 rg', // #0f172a
    slate800: '0.12 0.16 0.23 rg', // #1e293b
    slate700: '0.2 0.25 0.33 rg', // #334155
    slate500: '0.39 0.45 0.55 rg', // #64748b
    slate400: '0.58 0.64 0.72 rg', // #94a3b8
    slate200Border: '0.886 0.910 0.941 RG', // #e2e8f0
    slate200Bg: '0.886 0.910 0.941 rg',
    slate100Bg: '0.945 0.961 0.976 rg', // #f1f5f9
    slate50Bg: '0.973 0.980 0.988 rg', // #f8fafc
    white: '1.0 1.0 1.0 rg', // #ffffff
    whiteStroke: '1.0 1.0 1.0 RG',
    amberBg: '0.996 0.953 0.780 rg', // amber-100
    amberText: '0.573 0.251 0.055 rg', // amber-800
    emeraldBg: '0.820 0.980 0.898 rg', // emerald-100
    emeraldText: '0.024 0.373 0.275 rg', // emerald-800
    blueBg: '0.937 0.965 1.000 rg', // blue-50
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
export type OrderStatusKey = keyof typeof DESIGN_TOKENS.colors.status;

/**
 * Returns Tailwind CSS class string for order status badges.
 */
export function getStatusBadgeClass(status: string): string {
  const normalized = status.toUpperCase() as OrderStatusKey;
  switch (normalized) {
    case 'APPROVED':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'PENDING_APPROVAL':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    case 'DRAFT':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    case 'FOR_UPDATE':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'DELIVERED':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
    case 'COMPLETED':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/30 dark:text-teal-400 border-teal-200 dark:border-teal-800';
    case 'PAID':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
}

