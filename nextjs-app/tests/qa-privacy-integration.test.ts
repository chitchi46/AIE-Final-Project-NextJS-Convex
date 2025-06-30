import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';

// Convexクライアントの設定
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

describe('QAプライバシー統合テスト', () => {
  let testLectureId: Id<"lectures"> | null = null;
  let publishedQAId: Id<"qa_templates"> | null = null;
  let unpublishedQAId: Id<"qa_templates"> | null = null;
  let testStudentId: Id<"students"> | null = null;

  beforeEach(async () => {
    // テスト用の講義を作成
    testLectureId = await convex.mutation(api.lectures.createLecture, {
      title: 'プライバシーテスト講義',
      description: 'QAプライバシーテスト用',
      content: 'テスト内容',
      files: [],
    });

    // テスト用の学生を作成
    testStudentId = await convex.mutation(api.students.getOrCreateStudent, {
      email: 'test-student@example.com',
      name: 'テスト学生',
    });

    // 公開QAを作成
    publishedQAId = await convex.mutation(api.qa.createQA, {
      lectureId: testLectureId,
      question: '公開されている質問',
      questionType: 'multiple_choice',
      options: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
      answer: '選択肢A',
      difficulty: 'easy',
      explanation: '公開QAの解説',
      isPublished: true,
    });

    // 非公開QAを作成
    unpublishedQAId = await convex.mutation(api.qa.createQA, {
      lectureId: testLectureId,
      question: '非公開の質問',
      questionType: 'multiple_choice',
      options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
      answer: '選択肢1',
      difficulty: 'medium',
      explanation: '非公開QAの解説',
      isPublished: false,
    });
  });

  afterEach(async () => {
    // テストデータのクリーンアップ
    if (unpublishedQAId) {
      try {
        await convex.mutation(api.qa.deleteQA, { qaId: unpublishedQAId });
      } catch (error) {
        // エラーを無視
      }
    }
    if (publishedQAId) {
      try {
        await convex.mutation(api.qa.deleteQA, { qaId: publishedQAId });
      } catch (error) {
        // エラーを無視
      }
    }
    if (testLectureId) {
      try {
        await convex.mutation(api.lectures.deleteLecture, { lectureId: testLectureId });
      } catch (error) {
        // エラーを無視
      }
    }
  });

  describe('学生側APIテスト', () => {
    it('学生は公開QAのみを取得できる', async () => {
      if (!testLectureId) throw new Error('テスト講義が作成されていません');

      // includeUnpublishedを指定しない（学生側）
      const studentQAs = await convex.query(api.qa.listQA, { 
        lectureId: testLectureId 
      });

      // 公開QAのみが含まれることを確認
      expect(studentQAs.length).toBe(1);
      expect(studentQAs[0]._id).toBe(publishedQAId);
      expect(studentQAs[0].question).toBe('公開されている質問');
      
      // 非公開QAが含まれないことを確認
      const unpublishedQA = studentQAs.find(qa => qa._id === unpublishedQAId);
      expect(unpublishedQA).toBeUndefined();
    });

    it('学生がincludeUnpublished=falseを明示的に指定しても非公開QAは取得できない', async () => {
      if (!testLectureId) throw new Error('テスト講義が作成されていません');

      // includeUnpublishedをfalseで明示的に指定
      const studentQAs = await convex.query(api.qa.listQA, { 
        lectureId: testLectureId,
        includeUnpublished: false,
      });

      // 公開QAのみが含まれることを確認
      expect(studentQAs.length).toBe(1);
      expect(studentQAs[0]._id).toBe(publishedQAId);
    });

    it('学生は非公開QAに回答できる（直接IDを知っている場合）', async () => {
      if (!unpublishedQAId || !testStudentId) {
        throw new Error('テストデータが不完全です');
      }

      // 非公開QAへの回答を試みる
      const response = await convex.mutation(api.qa.submitResponse, {
        qaId: unpublishedQAId,
        studentId: testStudentId,
        answer: '選択肢1',
      });

      // 回答が正常に処理されることを確認
      expect(response.success).toBe(true);
      expect(response.isCorrect).toBe(true);
    });
  });

  describe('教師側APIテスト', () => {
    it('教師は全てのQAを取得できる', async () => {
      if (!testLectureId) throw new Error('テスト講義が作成されていません');

      // includeUnpublished=trueを指定（教師側）
      const teacherQAs = await convex.query(api.qa.listQA, { 
        lectureId: testLectureId,
        includeUnpublished: true,
      });

      // 両方のQAが含まれることを確認
      expect(teacherQAs.length).toBe(2);
      
      const publishedQA = teacherQAs.find(qa => qa._id === publishedQAId);
      const unpublishedQA = teacherQAs.find(qa => qa._id === unpublishedQAId);
      
      expect(publishedQA).toBeDefined();
      expect(unpublishedQA).toBeDefined();
      expect(unpublishedQA?.isPublished).toBe(false);
    });

    it('公開状態の切り替えが正しく動作する', async () => {
      if (!unpublishedQAId || !testLectureId) {
        throw new Error('テストデータが不完全です');
      }

      // 非公開QAを公開に変更
      const toggleResult = await convex.mutation(api.qa.togglePublish, {
        qaId: unpublishedQAId,
      });

      expect(toggleResult.success).toBe(true);
      expect(toggleResult.isPublished).toBe(true);

      // 学生側でも取得できるようになったことを確認
      const studentQAs = await convex.query(api.qa.listQA, { 
        lectureId: testLectureId 
      });

      expect(studentQAs.length).toBe(2); // 両方のQAが表示される
      const previouslyUnpublishedQA = studentQAs.find(qa => qa._id === unpublishedQAId);
      expect(previouslyUnpublishedQA).toBeDefined();
    });
  });

  describe('統計APIテスト', () => {
    it('QA統計に個人情報が含まれない', async () => {
      if (!publishedQAId || !testStudentId) {
        throw new Error('テストデータが不完全です');
      }

      // 複数の回答を作成
      await convex.mutation(api.qa.submitResponse, {
        qaId: publishedQAId,
        studentId: testStudentId,
        answer: '選択肢A',
      });

      // 統計を取得
      const stats = await convex.query(api.qa.getQAStatistics, {
        qaId: publishedQAId,
      });

      // 統計データの構造を確認
      expect(stats).toHaveProperty('totalResponses');
      expect(stats).toHaveProperty('correctResponses');
      expect(stats).toHaveProperty('correctRate');
      expect(stats).toHaveProperty('answerDistribution');

      // 個人情報が含まれていないことを確認
      expect(stats).not.toHaveProperty('studentIds');
      expect(stats).not.toHaveProperty('studentNames');
      expect(stats).not.toHaveProperty('studentEmails');
      expect(stats).not.toHaveProperty('individualResponses');

      // 集計値のみが含まれることを確認
      expect(typeof stats.totalResponses).toBe('number');
      expect(typeof stats.correctRate).toBe('number');
      expect(stats.correctRate).toBeGreaterThanOrEqual(0);
      expect(stats.correctRate).toBeLessThanOrEqual(100);
    });
  });

  describe('境界値テスト', () => {
    it('isPublishedが未定義の場合は公開として扱われる', async () => {
      if (!testLectureId) throw new Error('テスト講義が作成されていません');

      // isPublishedを指定せずにQAを作成
      const defaultQAId = await convex.mutation(api.qa.createQA, {
        lectureId: testLectureId,
        question: 'デフォルト公開設定の質問',
        questionType: 'short_answer',
        answer: '正解',
        difficulty: 'hard',
        explanation: 'デフォルト設定の解説',
        // isPublishedを指定しない
      });

      // 学生側で取得できることを確認
      const studentQAs = await convex.query(api.qa.listQA, { 
        lectureId: testLectureId 
      });

      const defaultQA = studentQAs.find(qa => qa._id === defaultQAId);
      expect(defaultQA).toBeDefined();
      expect(defaultQA?.question).toBe('デフォルト公開設定の質問');

      // クリーンアップ
      await convex.mutation(api.qa.deleteQA, { qaId: defaultQAId });
    });
  });
}); 