// 色覚多様性に配慮したカラーパレット
// 参考: ColorBrewer 2.0, IBM Design Language

export const accessibleColors = {
  // プライマリカラー（青系 - 色覚多様性に優しい）
  primary: {
    DEFAULT: '#2563eb', // Blue-600
    light: '#60a5fa',   // Blue-400
    dark: '#1e40af',    // Blue-800
  },
  
  // 成功・正解（青緑系 - 赤緑色覚異常でも識別可能）
  success: {
    DEFAULT: '#0891b2', // Cyan-600
    light: '#67e8f9',   // Cyan-300
    dark: '#0e7490',    // Cyan-700
  },
  
  // 警告（オレンジ系）
  warning: {
    DEFAULT: '#ea580c', // Orange-600
    light: '#fb923c',   // Orange-400
    dark: '#c2410c',    // Orange-700
  },
  
  // エラー・不正解（紫系 - 赤の代替）
  error: {
    DEFAULT: '#9333ea', // Purple-600
    light: '#c084fc',   // Purple-400
    dark: '#7c3aed',    // Purple-700
  },
  
  // 中立（グレー系）
  neutral: {
    DEFAULT: '#6b7280', // Gray-500
    light: '#d1d5db',   // Gray-300
    dark: '#374151',    // Gray-700
  },
};

// Recharts用のカラーパレット（色覚多様性対応）
export const chartColors = {
  // 単色グラフ用
  single: accessibleColors.primary.DEFAULT,
  
  // 複数系列用（最大8色まで対応）
  palette: [
    '#2563eb', // Blue
    '#0891b2', // Cyan
    '#ea580c', // Orange
    '#9333ea', // Purple
    '#10b981', // Emerald（補助色）
    '#6366f1', // Indigo（補助色）
    '#f59e0b', // Amber（補助色）
    '#8b5cf6', // Violet（補助色）
  ],
  
  // 難易度別の色
  difficulty: {
    easy: '#0891b2',   // Cyan（成功色と統一）
    medium: '#ea580c', // Orange（警告色と統一）
    hard: '#9333ea',   // Purple（エラー色と統一）
  },
  
  // 正解・不正解の色
  answer: {
    correct: '#0891b2',   // Cyan
    incorrect: '#9333ea', // Purple
    neutral: '#6b7280',   // Gray
  },
};

// パターン定義（グラフで色だけでなくパターンも使用）
export const chartPatterns = {
  easy: 'none',
  medium: 'diagonal',
  hard: 'dots',
};

// 日本語ラベル定義
export const difficultyLabels = {
  easy: '易しい',
  medium: '標準',
  hard: '難しい',
} as const;

export const statusLabels = {
  correct: '正解',
  incorrect: '不正解',
  pending: '未回答',
  skipped: 'スキップ',
} as const; 