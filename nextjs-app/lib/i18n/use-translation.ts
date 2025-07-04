'use client';

import { useCallback } from 'react';
import { defaultLocale, translations, TranslationKeys, Locale } from './locales';

// 現在のロケールを取得する（将来的にはContextやクッキーから取得）
function getCurrentLocale(): Locale {
  // 将来的な実装用のプレースホルダー
  // const locale = getCookie('locale') || navigator.language.split('-')[0];
  return defaultLocale;
}

// ネストされたオブジェクトから値を取得するヘルパー関数
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }
  
  return value || path;
}

export function useTranslation() {
  const locale = getCurrentLocale();
  const dict = translations[locale];
  
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let translation = getNestedValue(dict, key);
    
    // パラメータの置換
    if (params && typeof translation === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    
    return translation;
  }, [dict]);
  
  return { t, locale };
}

// 型安全な翻訳キーのためのヘルパー
export function createTranslationKey<T extends keyof TranslationKeys>(
  section: T,
  key: keyof TranslationKeys[T]
): string {
  return `${section}.${String(key)}`;
} 