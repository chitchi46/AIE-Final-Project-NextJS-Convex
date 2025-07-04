import { z } from 'zod';

// QAの基本スキーマ
export const qaBaseSchema = z.object({
  question: z.string()
    .min(5, '質問は5文字以上で入力してください')
    .max(500, '質問は500文字以内で入力してください')
    .refine(val => val.trim().length > 0, '質問を入力してください'),
  
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: '難易度を選択してください' })
  }),
  
  explanation: z.string()
    .min(10, '解説は10文字以上で入力してください')
    .max(1000, '解説は1000文字以内で入力してください')
    .optional()
    .or(z.literal('')),
});

// 選択式問題のスキーマ
export const multipleChoiceSchema = qaBaseSchema.extend({
  questionType: z.literal('multiple_choice'),
  
  options: z.array(
    z.string()
      .min(1, '選択肢を入力してください')
      .max(200, '選択肢は200文字以内で入力してください')
  )
    .min(2, '選択肢は最低2つ必要です')
    .max(6, '選択肢は最大6つまでです')
    .refine(
      (options) => new Set(options).size === options.length,
      '選択肢に重複があります'
    ),
  
  answer: z.string()
    .min(1, '正解を選択してください')
    // 選択肢に含まれるかどうかの厳密なチェックはサーバー側で実施
    .refine(
      (val) => !!val,
      '正解は選択肢から選んでください'
    ),
});

// 短答式問題のスキーマ
export const shortAnswerSchema = qaBaseSchema.extend({
  questionType: z.literal('short_answer'),
  
  answer: z.string()
    .min(1, '正解を入力してください')
    .max(200, '正解は200文字以内で入力してください'),
    
  options: z.array(z.string()).optional().default([]),
});

// 記述式問題のスキーマ
export const descriptiveSchema = qaBaseSchema.extend({
  questionType: z.literal('descriptive'),
  
  answer: z.string()
    .min(10, '模範解答は10文字以上で入力してください')
    .max(2000, '模範解答は2000文字以内で入力してください'),
    
  options: z.array(z.string()).optional().default([]),
  
  // 記述式問題用の採点基準
  scoringCriteria: z.object({
    keywords: z.array(z.string())
      .min(1, 'キーワードを最低1つ設定してください')
      .max(10, 'キーワードは最大10個まで')
      .optional(),
    
    minLength: z.number()
      .min(10, '最小文字数は10以上に設定してください')
      .max(1000, '最小文字数は1000以下に設定してください')
      .optional()
      .default(30),
      
    similarityThreshold: z.number()
      .min(0.5, '類似度しきい値は0.5以上に設定してください')
      .max(1.0, '類似度しきい値は1.0以下に設定してください')
      .optional()
      .default(0.75),
  }).optional(),
});

// 統合スキーマ
export const qaFormSchema = z.discriminatedUnion('questionType', [
  multipleChoiceSchema,
  shortAnswerSchema,
  descriptiveSchema,
]);

// フォーム入力の型
export type QAFormData = z.infer<typeof qaFormSchema>;
export type QuestionType = QAFormData['questionType'];

// エラーメッセージヘルパー
export function getFieldError(
  errors: z.ZodFormattedError<QAFormData> | null,
  path: string
): string | undefined {
  if (!errors) return undefined;
  
  const pathParts = path.split('.');
  let current: any = errors;
  
  for (const part of pathParts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
  }
  
  if (Array.isArray(current?._errors)) {
    return current._errors[0];
  }
  
  return undefined;
}

// リアルタイムバリデーション用のヘルパー
export function validateField(
  fieldName: keyof QAFormData,
  value: any,
  formData: Partial<QAFormData>
): string | null {
  try {
    // 問題タイプに応じたスキーマを選択
    let schema: z.ZodSchema<any>;
    switch (formData.questionType) {
      case 'multiple_choice':
        schema = multipleChoiceSchema;
        break;
      case 'short_answer':
        schema = shortAnswerSchema;
        break;
      case 'descriptive':
        schema = descriptiveSchema;
        break;
      default:
        return null;
    }
    
    // 単一フィールドの検証
    const fieldSchema = (schema as any).shape?.[fieldName];
    if (fieldSchema) {
      fieldSchema.parse(value);
    }
    
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'エラーが発生しました';
    }
    return 'エラーが発生しました';
  }
} 