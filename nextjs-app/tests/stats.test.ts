import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConvexTestingHelper } from 'convex-test';

// モックデータ
const mockQATemplates = [
  { _id: 'qa1', lectureId: 'lecture1', question: 'Q1', difficulty: 'easy' },
  { _id: 'qa2', lectureId: 'lecture1', question: 'Q2', difficulty: 'medium' },
  { _id: 'qa3', lectureId: 'lecture1', question: 'Q3', difficulty: 'hard' },
];

const mockResponses = [
  // qa1の回答（易）
  { _id: 'r1', qaId: 'qa1', studentId: 's1', isCorrect: true, timestamp: Date.now() },
  { _id: 'r2', qaId: 'qa1', studentId: 's2', isCorrect: true, timestamp: Date.now() },
  { _id: 'r3', qaId: 'qa1', studentId: 's3', isCorrect: false, timestamp: Date.now() },
  // qa2の回答（中）
  { _id: 'r4', qaId: 'qa2', studentId: 's1', isCorrect: true, timestamp: Date.now() },
  { _id: 'r5', qaId: 'qa2', studentId: 's2', isCorrect: false, timestamp: Date.now() },
  // qa3の回答（難）
  { _id: 'r6', qaId: 'qa3', studentId: 's1', isCorrect: false, timestamp: Date.now() },
  { _id: 'r7', qaId: 'qa3', studentId: 's2', isCorrect: false, timestamp: Date.now() },
  { _id: 'r8', qaId: 'qa3', studentId: 's3', isCorrect: true, timestamp: Date.now() },
];

describe('統計値の計算テスト', () => {
  let testingHelper: ConvexTestingHelper;

  beforeEach(() => {
    testingHelper = new ConvexTestingHelper();
  });

  describe('getAllLecturesStats', () => {
    it('空のデータの場合、正しいデフォルト値を返す', async () => {
      const result = await testingHelper.query('stats:getAllLecturesStats', {});
      
      expect(result).toEqual({
        totalStudents: 0,
        overallAccuracy: 0,
        difficultyDistribution: {
          easy: 0,
          medium: 0,
          hard: 0,
        },
        lectureDetails: [],
      });
    });

    it('学生数を正しくカウントする', async () => {
      // テストデータの準備
      const students = [
        { _id: 'student1', name: '学生1', email: 'student1@example.com' },
        { _id: 'student2', name: '学生2', email: 'student2@example.com' },
        { _id: 'student3', name: '学生3', email: 'student3@example.com' },
      ];
      
      await Promise.all(students.map(s => testingHelper.db.insert('students', s)));
      
      const result = await testingHelper.query('stats:getAllLecturesStats', {});
      
      expect(result.totalStudents).toBe(3);
    });

    it('全体の正答率を正しく計算する', async () => {
      // テストデータの準備
      const responses = [
        { qaId: 'qa1', studentId: 'student1', answer: 'A', isCorrect: true, timestamp: Date.now() },
        { qaId: 'qa2', studentId: 'student1', answer: 'B', isCorrect: false, timestamp: Date.now() },
        { qaId: 'qa3', studentId: 'student2', answer: 'C', isCorrect: true, timestamp: Date.now() },
        { qaId: 'qa4', studentId: 'student2', answer: 'D', isCorrect: true, timestamp: Date.now() },
      ];
      
      await Promise.all(responses.map(r => testingHelper.db.insert('responses', r)));
      
      const result = await testingHelper.query('stats:getAllLecturesStats', {});
      
      // 3/4 = 75%
      expect(result.overallAccuracy).toBe(75);
    });

    it('難易度分布を正しく計算する', async () => {
      // テストデータの準備
      const qas = [
        { _id: 'qa1', lectureId: 'lecture1', question: 'Q1', difficulty: 'easy', answer: 'A' },
        { _id: 'qa2', lectureId: 'lecture1', question: 'Q2', difficulty: 'easy', answer: 'B' },
        { _id: 'qa3', lectureId: 'lecture1', question: 'Q3', difficulty: 'medium', answer: 'C' },
        { _id: 'qa4', lectureId: 'lecture1', question: 'Q4', difficulty: 'hard', answer: 'D' },
      ];
      
      await Promise.all(qas.map(qa => testingHelper.db.insert('qa_templates', qa)));
      
      const result = await testingHelper.query('stats:getAllLecturesStats', {});
      
      expect(result.difficultyDistribution).toEqual({
        easy: 50,    // 2/4 = 50%
        medium: 25,  // 1/4 = 25%
        hard: 25,    // 1/4 = 25%
      });
    });

    it('講義ごとの詳細情報を正しく計算する', async () => {
      // テストデータの準備
      const lecture = { 
        _id: 'lecture1', 
        title: 'テスト講義', 
        description: 'テスト',
        createdBy: 'teacher1',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await testingHelper.db.insert('lectures', lecture);
      
      const qas = [
        { _id: 'qa1', lectureId: 'lecture1', question: 'Q1', difficulty: 'easy', answer: 'A' },
        { _id: 'qa2', lectureId: 'lecture1', question: 'Q2', difficulty: 'medium', answer: 'B' },
      ];
      await Promise.all(qas.map(qa => testingHelper.db.insert('qa_templates', qa)));
      
      const students = [
        { _id: 'student1', name: '学生1', email: 'student1@example.com' },
        { _id: 'student2', name: '学生2', email: 'student2@example.com' },
      ];
      await Promise.all(students.map(s => testingHelper.db.insert('students', s)));
      
      const responses = [
        { qaId: 'qa1', studentId: 'student1', answer: 'A', isCorrect: true, timestamp: Date.now() },
        { qaId: 'qa1', studentId: 'student2', answer: 'A', isCorrect: true, timestamp: Date.now() },
        { qaId: 'qa2', studentId: 'student1', answer: 'B', isCorrect: false, timestamp: Date.now() },
        { qaId: 'qa2', studentId: 'student2', answer: 'B', isCorrect: true, timestamp: Date.now() },
      ];
      await Promise.all(responses.map(r => testingHelper.db.insert('responses', r)));
      
      const result = await testingHelper.query('stats:getAllLecturesStats', {});
      
      expect(result.lectureDetails).toHaveLength(1);
      expect(result.lectureDetails[0]).toMatchObject({
        lectureId: 'lecture1',
        studentCount: 2,         // 2人の学生が参加
        averageScore: 75,        // 3/4 = 75%
      });
    });
  });

  describe('statsByLecture', () => {
    it('N+1問題が解消されていることを確認', async () => {
      // 多数のQAと回答を作成してパフォーマンスをテスト
      const lectureId = 'lecture1';
      const qaCount = 50;
      const studentCount = 20;
      
      // QAを作成
      const qas = Array.from({ length: qaCount }, (_, i) => ({
        _id: `qa${i}`,
        lectureId,
        question: `Question ${i}`,
        difficulty: ['easy', 'medium', 'hard'][i % 3] as any,
        answer: `Answer ${i}`,
      }));
      
      await Promise.all(qas.map(qa => testingHelper.db.insert('qa_templates', qa)));
      
      // 回答を作成
      const responses = [];
      for (let i = 0; i < qaCount; i++) {
        for (let j = 0; j < studentCount; j++) {
          responses.push({
            qaId: `qa${i}`,
            studentId: `student${j}`,
            answer: `Answer ${i}`,
            isCorrect: Math.random() > 0.5,
            timestamp: Date.now(),
          });
        }
      }
      
      await Promise.all(responses.map(r => testingHelper.db.insert('responses', r)));
      
      // クエリの実行時間を計測
      const startTime = Date.now();
      const result = await testingHelper.query('stats:statsByLecture', { lectureId });
      const endTime = Date.now();
      
      // 結果の検証
      expect(result.overallStats.totalQuestions).toBe(qaCount);
      expect(result.overallStats.totalResponses).toBe(qaCount * studentCount);
      
      // パフォーマンスの検証（5秒以内）
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});

describe('統計値計算のテスト', () => {
  describe('講義別統計', () => {
    it('全体の正答率が正しく計算される', () => {
      // 全8回答中4回正解 = 50%
      const totalResponses = mockResponses.length;
      const correctResponses = mockResponses.filter(r => r.isCorrect).length;
      const expectedAccuracy = (correctResponses / totalResponses) * 100;
      
      expect(totalResponses).toBe(8);
      expect(correctResponses).toBe(4);
      expect(expectedAccuracy).toBe(50);
    });

    it('難易度別の正答率が正しく計算される', () => {
      // 易: 3回答中2回正解 = 66.67%
      const easyResponses = mockResponses.filter(r => r.qaId === 'qa1');
      const easyCorrect = easyResponses.filter(r => r.isCorrect).length;
      const easyAccuracy = (easyCorrect / easyResponses.length) * 100;
      
      expect(easyResponses.length).toBe(3);
      expect(easyCorrect).toBe(2);
      expect(Math.round(easyAccuracy * 100) / 100).toBe(66.67);

      // 中: 2回答中1回正解 = 50%
      const mediumResponses = mockResponses.filter(r => r.qaId === 'qa2');
      const mediumCorrect = mediumResponses.filter(r => r.isCorrect).length;
      const mediumAccuracy = (mediumCorrect / mediumResponses.length) * 100;
      
      expect(mediumResponses.length).toBe(2);
      expect(mediumCorrect).toBe(1);
      expect(mediumAccuracy).toBe(50);

      // 難: 3回答中1回正解 = 33.33%
      const hardResponses = mockResponses.filter(r => r.qaId === 'qa3');
      const hardCorrect = hardResponses.filter(r => r.isCorrect).length;
      const hardAccuracy = (hardCorrect / hardResponses.length) * 100;
      
      expect(hardResponses.length).toBe(3);
      expect(hardCorrect).toBe(1);
      expect(Math.round(hardAccuracy * 100) / 100).toBe(33.33);
    });

    it('回答がない場合の正答率は0%になる', () => {
      const emptyResponses: any[] = [];
      const accuracy = emptyResponses.length > 0 
        ? (emptyResponses.filter(r => r.isCorrect).length / emptyResponses.length) * 100 
        : 0;
      
      expect(accuracy).toBe(0);
    });
  });

  describe('学生別統計', () => {
    it('特定学生の正答率が正しく計算される', () => {
      // 学生s1: 3回答中2回正解 = 66.67%
      const s1Responses = mockResponses.filter(r => r.studentId === 's1');
      const s1Correct = s1Responses.filter(r => r.isCorrect).length;
      const s1Accuracy = (s1Correct / s1Responses.length) * 100;
      
      expect(s1Responses.length).toBe(3);
      expect(s1Correct).toBe(2);
      expect(Math.round(s1Accuracy * 100) / 100).toBe(66.67);
    });

    it('講義でフィルタリングした場合の統計が正しい', () => {
      // lecture1のQAのみを対象とする
      const lecture1QaIds = mockQATemplates
        .filter(qa => qa.lectureId === 'lecture1')
        .map(qa => qa._id);
      
      const s1Responses = mockResponses
        .filter(r => r.studentId === 's1')
        .filter(r => lecture1QaIds.includes(r.qaId));
      
      expect(s1Responses.length).toBe(3);
    });
  });

  describe('パーセンテージ表示の一貫性', () => {
    it('すべての正答率が0-100の範囲で表示される', () => {
      const testCases = [
        { correct: 0, total: 10, expected: 0 },
        { correct: 5, total: 10, expected: 50 },
        { correct: 10, total: 10, expected: 100 },
        { correct: 1, total: 3, expected: 33.33 },
        { correct: 2, total: 3, expected: 66.67 },
      ];

      testCases.forEach(({ correct, total, expected }) => {
        const accuracy = total > 0 ? (correct / total) * 100 : 0;
        const rounded = Math.round(accuracy * 100) / 100;
        expect(rounded).toBe(expected);
      });
    });

    it('小数点以下2桁で丸められる', () => {
      const accuracy = (1 / 3) * 100; // 33.333...%
      const rounded = Math.round(accuracy * 100) / 100;
      expect(rounded).toBe(33.33);
    });
  });

  describe('エッジケースの処理', () => {
    it('nullやundefinedの値が適切に処理される', () => {
      const responsesWithNull = [
        { _id: 'r1', qaId: 'qa1', studentId: 's1', isCorrect: true },
        { _id: 'r2', qaId: 'qa1', studentId: 's1', isCorrect: null as any },
        { _id: 'r3', qaId: 'qa1', studentId: 's1', isCorrect: undefined as any },
      ];

      const validResponses = responsesWithNull.filter(r => r.isCorrect === true);
      expect(validResponses.length).toBe(1);
    });

    it('空の配列でエラーが発生しない', () => {
      const emptyStats: any[] = [];
      const total = emptyStats.reduce((sum, s) => sum + s.totalResponses, 0);
      expect(total).toBe(0);
    });
  });
}); 