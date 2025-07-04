/**
 * 翻訳辞書の基盤実装
 * 将来的な多言語対応に向けた準備
 */

export type Locale = 'ja' | 'en';

export const defaultLocale: Locale = 'ja';

// 翻訳キーの型定義
export interface TranslationKeys {
  // 共通
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    edit: string;
    create: string;
    back: string;
    next: string;
    previous: string;
    close: string;
    search: string;
    filter: string;
    sort: string;
    noData: string;
    logout: string;
    login: string;
    register: string;
  };
  
  // ダッシュボード
  dashboard: {
    title: string;
    teacherDashboard: string;
    studentDashboard: string;
    totalLectures: string;
    totalQuestions: string;
    totalAnswers: string;
    recentActivity: string;
    lectureList: string;
    viewDetails: string;
    takeQuiz: string;
    answersCount: string;
    published: string;
    draft: string;
  };
  
  // 講義
  lecture: {
    createNew: string;
    title: string;
    description: string;
    content: string;
    uploadFile: string;
    generateQA: string;
    questionsCount: string;
    difficulty: string;
    easy: string;
    medium: string;
    hard: string;
    editLecture: string;
    deleteLecture: string;
    confirmDelete: string;
  };
  
  // QA管理
  qa: {
    management: string;
    question: string;
    answer: string;
    explanation: string;
    type: string;
    multipleChoice: string;
    shortAnswer: string;
    descriptive: string;
    options: string;
    correctAnswer: string;
    statistics: string;
    correctRate: string;
    totalAttempts: string;
    publish: string;
    unpublish: string;
    createNew: string;
    editQuestion: string;
    deleteQuestion: string;
    confirmDeleteQuestion: string;
  };
  
  // クイズ
  quiz: {
    start: string;
    submit: string;
    yourAnswer: string;
    correct: string;
    incorrect: string;
    explanation: string;
    progress: string;
    questionNumber: string;
    results: string;
    score: string;
    timeSpent: string;
    reviewAnswers: string;
    retakeQuiz: string;
    personalizedQuiz: string;
  };
  
  // 学生分析
  analytics: {
    title: string;
    overview: string;
    performance: string;
    averageScore: string;
    completionRate: string;
    strongAreas: string;
    weakAreas: string;
    recommendations: string;
    individualProgress: string;
    groupAnalysis: string;
    exportData: string;
  };
  
  // エラーメッセージ
  errors: {
    required: string;
    invalidFormat: string;
    tooShort: string;
    tooLong: string;
    duplicateEntry: string;
    networkError: string;
    unauthorized: string;
    notFound: string;
    serverError: string;
    fileUploadFailed: string;
    fileTooLarge: string;
    unsupportedFileType: string;
  };
  
  // 成功メッセージ
  success: {
    saved: string;
    deleted: string;
    created: string;
    updated: string;
    published: string;
    unpublished: string;
    fileUploaded: string;
    qaGenerated: string;
    quizCompleted: string;
  };
  
  // アクセシビリティ
  a11y: {
    skipToContent: string;
    mainNavigation: string;
    breadcrumb: string;
    closeDialog: string;
    openMenu: string;
    toggleTheme: string;
    languageSelector: string;
    sortBy: string;
    filterBy: string;
    expandCollapse: string;
    requiredField: string;
  };
}

// 日本語翻訳
export const ja: TranslationKeys = {
  common: {
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    cancel: 'キャンセル',
    confirm: '確認',
    save: '保存',
    delete: '削除',
    edit: '編集',
    create: '作成',
    back: '戻る',
    next: '次へ',
    previous: '前へ',
    close: '閉じる',
    search: '検索',
    filter: 'フィルター',
    sort: '並び替え',
    noData: 'データがありません',
    logout: 'ログアウト',
    login: 'ログイン',
    register: '登録',
  },
  
  dashboard: {
    title: 'ダッシュボード',
    teacherDashboard: '講師ダッシュボード',
    studentDashboard: '学生ダッシュボード',
    totalLectures: '総講義数',
    totalQuestions: '総Q&A数',
    totalAnswers: '総回答数',
    recentActivity: '最近のアクティビティ',
    lectureList: '講義一覧',
    viewDetails: '詳細を見る',
    takeQuiz: 'Q&A回答',
    answersCount: '回答数',
    published: '公開中',
    draft: '下書き',
  },
  
  lecture: {
    createNew: '新規講義作成',
    title: '講義タイトル',
    description: '講義の説明',
    content: '講義内容',
    uploadFile: 'ファイルをアップロード',
    generateQA: 'Q&Aを生成',
    questionsCount: '問題数',
    difficulty: '難易度',
    easy: '易しい',
    medium: '普通',
    hard: '難しい',
    editLecture: '講義を編集',
    deleteLecture: '講義を削除',
    confirmDelete: '本当に削除しますか？',
  },
  
  qa: {
    management: 'QA管理',
    question: '問題',
    answer: '回答',
    explanation: '解説',
    type: '問題タイプ',
    multipleChoice: '選択式',
    shortAnswer: '短答式',
    descriptive: '記述式',
    options: '選択肢',
    correctAnswer: '正解',
    statistics: '統計',
    correctRate: '正答率',
    totalAttempts: '総回答数',
    publish: '公開する',
    unpublish: '非公開にする',
    createNew: '新規QA作成',
    editQuestion: '問題を編集',
    deleteQuestion: '問題を削除',
    confirmDeleteQuestion: 'この問題を削除してもよろしいですか？',
  },
  
  quiz: {
    start: 'クイズを開始',
    submit: '回答する',
    yourAnswer: 'あなたの回答',
    correct: '正解',
    incorrect: '不正解',
    explanation: '解説',
    progress: '進捗',
    questionNumber: '問題',
    results: '結果',
    score: 'スコア',
    timeSpent: '所要時間',
    reviewAnswers: '回答を確認',
    retakeQuiz: 'もう一度挑戦',
    personalizedQuiz: 'パーソナライズクイズ',
  },
  
  analytics: {
    title: '学生分析',
    overview: '概要',
    performance: 'パフォーマンス',
    averageScore: '平均スコア',
    completionRate: '完了率',
    strongAreas: '得意分野',
    weakAreas: '苦手分野',
    recommendations: '推奨事項',
    individualProgress: '個別進捗',
    groupAnalysis: 'グループ分析',
    exportData: 'データをエクスポート',
  },
  
  errors: {
    required: '必須項目です',
    invalidFormat: '形式が正しくありません',
    tooShort: '文字数が不足しています',
    tooLong: '文字数が多すぎます',
    duplicateEntry: '既に登録されています',
    networkError: 'ネットワークエラーが発生しました',
    unauthorized: '権限がありません',
    notFound: '見つかりません',
    serverError: 'サーバーエラーが発生しました',
    fileUploadFailed: 'ファイルのアップロードに失敗しました',
    fileTooLarge: 'ファイルサイズが大きすぎます',
    unsupportedFileType: 'サポートされていないファイル形式です',
  },
  
  success: {
    saved: '保存しました',
    deleted: '削除しました',
    created: '作成しました',
    updated: '更新しました',
    published: '公開しました',
    unpublished: '非公開にしました',
    fileUploaded: 'ファイルをアップロードしました',
    qaGenerated: 'Q&Aを生成しました',
    quizCompleted: 'クイズを完了しました',
  },
  
  a11y: {
    skipToContent: 'コンテンツへスキップ',
    mainNavigation: 'メインナビゲーション',
    breadcrumb: 'パンくずリスト',
    closeDialog: 'ダイアログを閉じる',
    openMenu: 'メニューを開く',
    toggleTheme: 'テーマを切り替える',
    languageSelector: '言語を選択',
    sortBy: '並び替え',
    filterBy: 'フィルター',
    expandCollapse: '展開・折りたたみ',
    requiredField: '必須項目',
  },
};

// 英語翻訳（将来的な実装用のプレースホルダー）
export const en: Partial<TranslationKeys> = {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    noData: 'No data',
    logout: 'Logout',
    login: 'Login',
    register: 'Register',
  },
};

// 翻訳辞書
export const translations: Record<Locale, TranslationKeys | Partial<TranslationKeys>> = {
  ja,
  en,
}; 