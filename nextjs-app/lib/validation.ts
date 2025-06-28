import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// XSS対策：HTMLサニタイゼーション
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

// SQLインジェクション対策：特殊文字のエスケープ
export function escapeSQL(input: string): string {
  return input
    .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
      switch (char) {
        case '\0': return '\\0';
        case '\x08': return '\\b';
        case '\x09': return '\\t';
        case '\x1a': return '\\z';
        case '\n': return '\\n';
        case '\r': return '\\r';
        case '"':
        case "'":
        case '\\':
        case '%':
          return '\\' + char;
        default:
          return char;
      }
    });
}

// メールアドレスの検証
export const emailSchema = z.string().email('有効なメールアドレスを入力してください');

// パスワードの検証（最小8文字、小文字を含む）
export const passwordSchema = z.string()
  .min(8, 'パスワードは8文字以上である必要があります')
  .regex(/[a-z]/, 'パスワードには小文字を含む必要があります');

// ユーザー登録の検証スキーマ
export const registerSchema = z.object({
  name: z.string()
    .min(1, '名前は必須です')
    .max(100, '名前は100文字以内で入力してください'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['student', 'teacher', 'admin']),
});

// ログインの検証スキーマ
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'パスワードは必須です'),
});

// QA作成の検証スキーマ
export const qaSchema = z.object({
  question: z.string()
    .min(1, '質問は必須です')
    .max(1000, '質問は1000文字以内で入力してください'),
  questionType: z.enum(['multiple_choice', 'short_answer', 'descriptive']),
  options: z.array(z.string()).optional(),
  answer: z.string()
    .min(1, '回答は必須です')
    .max(1000, '回答は1000文字以内で入力してください'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  explanation: z.string().max(2000, '解説は2000文字以内で入力してください').optional(),
});

// ファイルアップロードの検証
export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'ファイルサイズは10MB以下にしてください' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'サポートされていないファイル形式です' };
  }

  // ファイル名の検証（危険な文字を除外）
  const dangerousChars = /[<>:"\/\\|?*\x00-\x1f]/g;
  if (dangerousChars.test(file.name)) {
    return { valid: false, error: 'ファイル名に使用できない文字が含まれています' };
  }

  return { valid: true };
} 