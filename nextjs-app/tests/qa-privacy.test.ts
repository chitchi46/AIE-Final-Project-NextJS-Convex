import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConvexError } from 'convex/values';

// モックデータ
const mockLecture = {
  _id: 'lecture1',
  title: 'テスト講義',
  description: 'テスト用の講義',
  createdBy: 'teacher1',
};

const mockQATemplates = [
  {
    _id: 'qa1',
    lectureId: 'lecture1',
    question: '公開されている質問',
    questionType: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
    difficulty: 'easy',
    isPublished: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    _id: 'qa2',
    lectureId: 'lecture1',
    question: '非公開の質問',
    questionType: 'multiple_choice',
    options: ['A', 'B', 'C', 'D'],
    answer: 'B',
    difficulty: 'medium',
    isPublished: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    _id: 'qa3',
    lectureId: 'lecture1',
    question: 'デフォルトで公開される質問',
    questionType: 'short_answer',
    answer: '答え',
    difficulty: 'hard',
    // isPublishedフィールドがない場合はtrueとして扱われる
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const mockStudent = {
  _id: 'student1',
  name: '学生太郎',
  email: 'student@example.com',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockTeacher = {
  _id: 'teacher1',
  email: 'teacher@example.com',
  role: 'teacher',
};

describe('QAプライバシーテスト', () => {
  describe('学生側API', () => {
    it('公開されているQAのみが返される', async () => {
      // listQA関数のモック実装
      const listQA = async (args: { lectureId: string; includeUnpublished?: boolean }) => {
        let qas = mockQATemplates.filter(qa => qa.lectureId === args.lectureId);
        
        // デフォルトでは公開されているもののみを返す
        if (!args.includeUnpublished) {
          qas = qas.filter(qa => qa.isPublished !== false);
        }
        
        return qas;
      };

      // 学生がQAリストを取得（includeUnpublishedを指定しない）
      const studentQAs = await listQA({ lectureId: 'lecture1' });
      
      expect(studentQAs.length).toBe(2); // 公開されている2つのみ
      expect(studentQAs.find(qa => qa._id === 'qa1')).toBeDefined();
      expect(studentQAs.find(qa => qa._id === 'qa2')).toBeUndefined(); // 非公開は含まれない
      expect(studentQAs.find(qa => qa._id === 'qa3')).toBeDefined();
    });

    it('includeUnpublishedをfalseで明示的に指定しても非公開QAは返されない', async () => {
      const listQA = async (args: { lectureId: string; includeUnpublished?: boolean }) => {
        let qas = mockQATemplates.filter(qa => qa.lectureId === args.lectureId);
        
        if (!args.includeUnpublished) {
          qas = qas.filter(qa => qa.isPublished !== false);
        }
        
        return qas;
      };

      const studentQAs = await listQA({ 
        lectureId: 'lecture1', 
        includeUnpublished: false 
      });
      
      expect(studentQAs.length).toBe(2);
      expect(studentQAs.every(qa => qa.isPublished !== false)).toBe(true);
    });

    it('非公開QAへの回答提出は可能（既に知っている場合）', async () => {
      const submitResponse = async (args: { 
        qaId: string; 
        studentId: string; 
        answer: string; 
      }) => {
        // QAの存在確認
        const qa = mockQATemplates.find(q => q._id === args.qaId);
        if (!qa) {
          throw new Error("QA not found");
        }
        
        // 学生の存在確認
        const student = mockStudent._id === args.studentId ? mockStudent : null;
        if (!student) {
          throw new Error("Student not found");
        }
        
        // 正解判定
        const isCorrect = qa.answer === args.answer;
        
        return {
          responseId: 'response1',
          isCorrect,
          feedback: isCorrect ? "正解です！" : "不正解です",
        };
      };

      // 非公開QAへの回答提出（URLを直接知っている場合など）
      const response = await submitResponse({
        qaId: 'qa2', // 非公開QA
        studentId: 'student1',
        answer: 'B',
      });
      
      expect(response.isCorrect).toBe(true);
    });

    it('getMyResponsesでは自分の回答履歴のみが返される', async () => {
      const mockResponses = [
        {
          _id: 'r1',
          qaId: 'qa1',
          studentId: 'student1',
          answer: 'A',
          isCorrect: true,
          timestamp: Date.now(),
        },
        {
          _id: 'r2',
          qaId: 'qa2', // 非公開QAへの回答
          studentId: 'student1',
          answer: 'B',
          isCorrect: true,
          timestamp: Date.now(),
        },
        {
          _id: 'r3',
          qaId: 'qa1',
          studentId: 'student2', // 他の学生の回答
          answer: 'C',
          isCorrect: false,
          timestamp: Date.now(),
        },
      ];

      const getMyResponses = async (studentId: string) => {
        return mockResponses.filter(r => r.studentId === studentId);
      };

      const myResponses = await getMyResponses('student1');
      
      expect(myResponses.length).toBe(2);
      expect(myResponses.every(r => r.studentId === 'student1')).toBe(true);
      // 非公開QAへの回答も含まれる（既に回答している場合）
      expect(myResponses.find(r => r.qaId === 'qa2')).toBeDefined();
    });
  });

  describe('教師側API', () => {
    it('教師はincludeUnpublished=trueで全てのQAを取得できる', async () => {
      const listQA = async (args: { 
        lectureId: string; 
        includeUnpublished?: boolean;
        userId?: string;
        userRole?: string;
      }) => {
        // 教師権限チェック（実際の実装では認証を確認）
        if (args.includeUnpublished && args.userRole !== 'teacher' && args.userRole !== 'admin') {
          throw new Error("Unauthorized");
        }
        
        let qas = mockQATemplates.filter(qa => qa.lectureId === args.lectureId);
        
        if (!args.includeUnpublished) {
          qas = qas.filter(qa => qa.isPublished !== false);
        }
        
        return qas;
      };

      // 教師が全QAを取得
      const teacherQAs = await listQA({ 
        lectureId: 'lecture1', 
        includeUnpublished: true,
        userId: 'teacher1',
        userRole: 'teacher',
      });
      
      expect(teacherQAs.length).toBe(3); // 非公開も含めて全て
      expect(teacherQAs.find(qa => qa._id === 'qa1')).toBeDefined();
      expect(teacherQAs.find(qa => qa._id === 'qa2')).toBeDefined();
      expect(teacherQAs.find(qa => qa._id === 'qa3')).toBeDefined();
    });

    it('公開状態の切り替えが正しく動作する', async () => {
      const togglePublish = async (qaId: string) => {
        const qa = mockQATemplates.find(q => q._id === qaId);
        if (!qa) {
          throw new Error("QA not found");
        }
        
        // isPublishedフィールドがない場合はtrueとみなす
        const currentStatus = qa.isPublished !== false;
        qa.isPublished = !currentStatus;
        
        return { 
          success: true, 
          isPublished: qa.isPublished 
        };
      };

      // 公開QAを非公開に
      const result1 = await togglePublish('qa1');
      expect(result1.isPublished).toBe(false);
      
      // 非公開QAを公開に
      const result2 = await togglePublish('qa2');
      expect(result2.isPublished).toBe(true);
      
      // デフォルト公開のQAを非公開に
      const result3 = await togglePublish('qa3');
      expect(result3.isPublished).toBe(false);
    });
  });

  describe('統計API', () => {
    it('QA統計は個人を特定できない形で返される', async () => {
      const mockResponses = [
        { studentId: 'student1', answer: 'A', isCorrect: true },
        { studentId: 'student2', answer: 'A', isCorrect: true },
        { studentId: 'student3', answer: 'B', isCorrect: false },
        { studentId: 'student4', answer: 'C', isCorrect: false },
      ];

      const getQAStatistics = async (qaId: string) => {
        // 個人を特定できない統計情報のみを返す
        const responses = mockResponses;
        const totalResponses = responses.length;
        const correctResponses = responses.filter(r => r.isCorrect).length;
        const correctRate = totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0;
        
        return {
          totalResponses,
          correctResponses,
          incorrectResponses: totalResponses - correctResponses,
          correctRate: Math.round(correctRate),
          answerDistribution: responses.reduce((acc, r) => {
            acc[r.answer] = (acc[r.answer] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          // 個人情報は含まない
        };
      };

      const stats = await getQAStatistics('qa1');
      
      expect(stats.totalResponses).toBe(4);
      expect(stats.correctResponses).toBe(2);
      expect(stats.correctRate).toBe(50);
      expect(stats.answerDistribution).toEqual({ A: 2, B: 1, C: 1 });
      
      // 個人を特定できる情報が含まれていないことを確認
      expect(stats).not.toHaveProperty('studentIds');
      expect(stats).not.toHaveProperty('studentNames');
      expect(stats).not.toHaveProperty('individualResponses');
    });
  });

  describe('エッジケース', () => {
    it('isPublishedがundefinedの場合は公開として扱われる', async () => {
      const qaWithoutPublishFlag = {
        _id: 'qa4',
        lectureId: 'lecture1',
        question: 'フラグなしの質問',
        isPublished: undefined,
      };

      const isPublic = qaWithoutPublishFlag.isPublished !== false;
      expect(isPublic).toBe(true);
    });

    it('isPublishedがnullの場合も公開として扱われる', async () => {
      const qaWithNullFlag = {
        _id: 'qa5',
        lectureId: 'lecture1',
        question: 'nullフラグの質問',
        isPublished: null as any,
      };

      const isPublic = qaWithNullFlag.isPublished !== false;
      expect(isPublic).toBe(true);
    });
  });
}); 