"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Zap, Brain, Target } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface QAGenerationFormProps {
  lectureId: Id<"lectures">;
  lectureTitle: string;
  onGenerateComplete?: () => void;
}

export function QAGenerationForm({ lectureId, lectureTitle, onGenerateComplete }: QAGenerationFormProps) {
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState({
    easy: 0.4,
    medium: 0.4,
    hard: 0.2,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateQAWithAI = useAction(api.actions.generateQA.generateQAWithAI);
  const lecture = useQuery(api.lectures.getLecture, { lectureId });
  const extractFileContent = useAction(api.actions.extractFileContent.extractFileContent);

  const handleGenerateQA = async () => {
    setIsGenerating(true);
    
    try {
      if (!lecture) {
        toast.error("講義情報が取得できません");
        setIsGenerating(false);
        return;
      }

      toast.success("Q&A生成を開始しました", {
        description: `${questionCount}問のQ&Aを生成中...`,
      });

      let content = "";

      // 講義にファイルが添付されている場合は内容を抽出
      if (lecture.files && lecture.files.length > 0) {
        for (const fileId of lecture.files) {
          try {
            const fileContent = await extractFileContent({ fileId });
            if (fileContent) {
              content += fileContent + "\n\n";
            }
          } catch (error) {
            console.error("ファイル内容の抽出エラー:", error);
          }
        }
      }

      // ファイルから内容が取得できない場合は、講義の説明を使用
      if (!content.trim()) {
        content = `講義タイトル: ${lecture.title}\n\n講義説明: ${lecture.description}`;
      }

      // Q&Aを生成
      const result = await generateQAWithAI({
        lectureId,
        content,
        difficulty,
        questionCount,
      });

      if (result.success) {
        toast.success("Q&A生成完了！", {
          description: `${result.generatedCount}問のQ&Aが生成されました`,
        });
        onGenerateComplete?.();
      } else {
        toast.error("Q&A生成に失敗しました", {
          description: result.message,
        });
      }
    } catch (error) {
      console.error("Q&A生成エラー:", error);
      toast.error("Q&A生成中にエラーが発生しました");
    } finally {
      setIsGenerating(false);
    }
  };

  // 難易度の合計を1.0に正規化
  const normalizeDifficulty = () => {
    const total = difficulty.easy + difficulty.medium + difficulty.hard;
    if (total === 0) return;
    
    setDifficulty({
      easy: difficulty.easy / total,
      medium: difficulty.medium / total,
      hard: difficulty.hard / total,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-600" />
          AI自動Q&A生成
        </CardTitle>
        <CardDescription>
          講義「{lectureTitle}」の内容から自動的にQ&Aを生成します
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 問題数設定 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">生成する問題数</Label>
            <span className="text-2xl font-bold text-purple-600">{questionCount}問</span>
          </div>
          <Slider
            value={[questionCount]}
            onValueChange={(value) => setQuestionCount(value[0])}
            min={5}
            max={30}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-500">
            <span>5問</span>
            <span>15問</span>
            <span>30問</span>
          </div>
        </div>

        {/* 難易度配分 */}
        <div className="space-y-4">
          <Label className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            難易度配分
          </Label>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="w-20 text-sm font-medium text-green-600">易しい</span>
              <Slider
                value={[difficulty.easy * 100]}
                onValueChange={(value) => {
                  setDifficulty(prev => ({ ...prev, easy: value[0] / 100 }));
                }}
                onValueCommit={normalizeDifficulty}
                min={0}
                max={100}
                step={10}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm">{Math.round(difficulty.easy * 100)}%</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="w-20 text-sm font-medium text-yellow-600">普通</span>
              <Slider
                value={[difficulty.medium * 100]}
                onValueChange={(value) => {
                  setDifficulty(prev => ({ ...prev, medium: value[0] / 100 }));
                }}
                onValueCommit={normalizeDifficulty}
                min={0}
                max={100}
                step={10}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm">{Math.round(difficulty.medium * 100)}%</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="w-20 text-sm font-medium text-red-600">難しい</span>
              <Slider
                value={[difficulty.hard * 100]}
                onValueChange={(value) => {
                  setDifficulty(prev => ({ ...prev, hard: value[0] / 100 }));
                }}
                onValueCommit={normalizeDifficulty}
                min={0}
                max={100}
                step={10}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm">{Math.round(difficulty.hard * 100)}%</span>
            </div>
          </div>
          
          {Math.abs((difficulty.easy + difficulty.medium + difficulty.hard) - 1.0) > 0.01 && (
            <p className="text-xs text-amber-600">
              ※ 合計が100%になるように自動調整されます
            </p>
          )}
        </div>

        {/* AIの説明 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-purple-900">AIが自動で生成する内容</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• 講義内容に基づいた質問と解答</li>
                <li>• 選択式・記述式・穴埋め式の多様な問題形式</li>
                <li>• 各問題に対する詳細な解説</li>
                <li>• 学習目標に沿った適切な難易度設定</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 生成ボタン */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleGenerateQA}
            disabled={isGenerating}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                生成中...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Q&Aを自動生成する
              </div>
            )}
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
} 