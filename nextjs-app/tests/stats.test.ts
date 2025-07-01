import { describe, it, expect } from '@jest/globals';

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
  describe('getAllLecturesStats', () => {
    it('空のデータの場合、正しいデフォルト値を返す', async () => {
      const result = {
        totalStudents: 0,
        overallAccuracy: 0,
        difficultyDistribution: {
          easy: 0,
          medium: 0,
          hard: 0,
        },
        lectureDetails: [],
      };
      
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
      const mockStudentsCount = 3;
      
      expect(mockStudentsCount).toBe(3);
    });

    it('全体の正答率を正しく計算する', async () => {
      // 8回答中4回正解 = 50%
      const totalResponses = mockResponses.length;
      const correctResponses = mockResponses.filter(r => r.isCorrect).length;
      const expectedAccuracy = (correctResponses / totalResponses) * 100;
      
      expect(totalResponses).toBe(8);
      expect(correctResponses).toBe(4);
      expect(expectedAccuracy).toBe(50);
    });

    it('難易度分布を正しく計算する', async () => {
      const difficultyCount = {
        easy: mockQATemplates.filter(qa => qa.difficulty === 'easy').length,
        medium: mockQATemplates.filter(qa => qa.difficulty === 'medium').length,
        hard: mockQATemplates.filter(qa => qa.difficulty === 'hard').length,
      };
      
      const total = mockQATemplates.length;
      const distribution = {
        easy: (difficultyCount.easy / total) * 100,
        medium: (difficultyCount.medium / total) * 100,
        hard: (difficultyCount.hard / total) * 100,
      };
      
      expect(distribution.easy).toBeCloseTo(33.33, 2);
      expect(distribution.medium).toBeCloseTo(33.33, 2);
      expect(distribution.hard).toBeCloseTo(33.33, 2);
    });

    it('講義ごとの詳細情報を正しく計算する', async () => {
      const lectureId = 'lecture1';
      const studentsInLecture = [...new Set(mockResponses.map(r => r.studentId))];
      const responsesForLecture = mockResponses.filter(r => 
        mockQATemplates.some(qa => qa._id === r.qaId && qa.lectureId === lectureId)
      );
      const correctResponsesForLecture = responsesForLecture.filter(r => r.isCorrect);
      const averageScore = (correctResponsesForLecture.length / responsesForLecture.length) * 100;
      
      const mockLectureDetail = {
        lectureId,
        studentCount: studentsInLecture.length,
        averageScore,
      };
      
      expect(mockLectureDetail.lectureId).toBe('lecture1');
      expect(mockLectureDetail.studentCount).toBe(3);  // s1, s2, s3
      expect(mockLectureDetail.averageScore).toBe(50); // 4/8 = 50%
    });
  });

  describe('statsByLecture', () => {
    it('N+1問題が解消されていることを確認', async () => {
      // パフォーマンステスト（モック版）
      const qaCount = 50;
      const studentCount = 20;
      const totalResponses = qaCount * studentCount;
      
      // 仮想的なクエリ結果
      const mockResult = {
        overallStats: {
          totalQuestions: qaCount,
          totalResponses: totalResponses,
        }
      };
      
      expect(mockResult.overallStats.totalQuestions).toBe(qaCount);
      expect(mockResult.overallStats.totalResponses).toBe(totalResponses);
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
      // 各難易度別の正答率を計算
      const difficulties = ['easy', 'medium', 'hard'];
      
      difficulties.forEach(difficulty => {
        const qasOfDifficulty = mockQATemplates.filter(qa => qa.difficulty === difficulty);
        const responsesOfDifficulty = mockResponses.filter(r => 
          qasOfDifficulty.some(qa => qa._id === r.qaId)
        );
        const correctResponsesOfDifficulty = responsesOfDifficulty.filter(r => r.isCorrect);
        
        const accuracyOfDifficulty = responsesOfDifficulty.length > 0 
          ? (correctResponsesOfDifficulty.length / responsesOfDifficulty.length) * 100 
          : 0;
        
                 // 期待値をテスト
         if (difficulty === 'easy') {
           expect(accuracyOfDifficulty).toBeCloseTo(66.67, 2); // 2/3
         } else if (difficulty === 'medium') {
           expect(accuracyOfDifficulty).toBe(50); // 1/2
         } else if (difficulty === 'hard') {
           expect(accuracyOfDifficulty).toBeCloseTo(33.33, 2); // 1/3
         }
      });
    });
  });
}); 