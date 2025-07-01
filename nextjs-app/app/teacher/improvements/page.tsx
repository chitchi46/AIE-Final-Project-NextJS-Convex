"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/auth-guard";
import { LoadingSpinner } from "@/components/loading-spinner";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { showUndoToast } from "@/components/ui/undo-toast";
import { 
  Lightbulb, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Trash2,
  RefreshCw,
  BarChart,
  Target,
  BookOpen,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function ImprovementsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedLecture, setSelectedLecture] = useState<Id<"lectures"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<{ id: Id<"improvement_suggestions">; content: string } | null>(null);

  // 講義一覧を取得
  const lectures = useQuery(api.lectures.listLectures, {});
  
  // 選択された講義の改善提案を取得
  const suggestions = useQuery(
    api.improvements.getSuggestionsByLecture,
    selectedLecture ? { lectureId: selectedLecture } : "skip"
  );

  // 講義の統計情報を取得
  const lectureStats = useQuery(
    api.stats.statsByLecture,
    selectedLecture ? { lectureId: selectedLecture } : "skip"
  );

  // Mutations and Actions
  const deleteSuggestion = useMutation(api.improvements.deleteSuggestion);
  const generateSuggestions = useAction(api.actions.generateImprovements.generateImprovementSuggestions);

  const handleGenerateSuggestions = async () => {
    if (!selectedLecture) return;

    setIsGenerating(true);
    try {
      const result = await generateSuggestions({ lectureId: selectedLecture });
      
      if (result.success) {
        toast({
          title: "生成成功",
          description: result.message,
        });
      } else {
        toast({
          title: "生成失敗",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "改善提案の生成中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteSuggestion = async () => {
    if (!suggestionToDelete) return;

    try {
      await deleteSuggestion({ suggestionId: suggestionToDelete.id });
      
      // 削除確認ダイアログを閉じる
      setDeleteConfirmOpen(false);
      setSuggestionToDelete(null);
      
      // UNDOトーストを表示
      showUndoToast({
        title: "改善提案を削除しました",
        description: `改善提案を削除しました`,
        onUndo: async () => {
          toast({
            title: "復元機能は準備中です",
            description: "削除したデータの復元機能は今後実装予定です。",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "削除失敗",
        description: "改善提案の削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (suggestion: any) => {
    setSuggestionToDelete({ id: suggestion._id, content: suggestion.content });
    setDeleteConfirmOpen(true);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-600";
    if (accuracy >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 80) return { color: "bg-green-100 text-green-800", label: "良好" };
    if (accuracy >= 60) return { color: "bg-yellow-100 text-yellow-800", label: "要改善" };
    return { color: "bg-red-100 text-red-800", label: "要対策" };
  };

  return (
    <AuthGuard requiredRole="teacher">
      <div className="container mx-auto p-6">
        {/* ダッシュボードに戻るボタン */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ダッシュボードに戻る
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-yellow-500" />
            改善提案
          </h1>
          <p className="text-gray-600">講義内容の改善点を分析し、学習効果を向上させるための提案を確認できます</p>
        </div>

        {/* 講義選択 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">講義を選択</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="lecture-select">分析対象の講義</Label>
                <Select
                  value={selectedLecture || ""}
                  onValueChange={(value) => setSelectedLecture(value as Id<"lectures">)}
                >
                  <SelectTrigger id="lecture-select" className="w-full mt-2">
                    <SelectValue placeholder="講義を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {lectures?.map((lecture) => (
                      <SelectItem key={lecture._id} value={lecture._id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {lecture.title}
                          <Badge variant="outline" className="ml-2">
                            {lecture.qaCount} QA
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedLecture && (
                <Button 
                  onClick={handleGenerateSuggestions}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">生成中...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      改善提案を生成
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedLecture && (
          <Tabs defaultValue="suggestions" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suggestions">改善提案</TabsTrigger>
              <TabsTrigger value="statistics">統計情報</TabsTrigger>
            </TabsList>

            {/* 改善提案タブ */}
            <TabsContent value="suggestions" className="space-y-4">
              {suggestions && suggestions.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>改善提案がありません</AlertTitle>
                  <AlertDescription>
                    まだ改善提案が生成されていません。「改善提案を生成」ボタンをクリックして、AIによる分析を開始してください。
                  </AlertDescription>
                </Alert>
              )}

              <AnimatePresence>
                {suggestions?.map((suggestion, index) => (
                  <motion.div
                    key={suggestion._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Target className="h-5 w-5 text-orange-500" />
                              改善提案 #{index + 1}
                            </CardTitle>
                            <CardDescription>
                              平均正答率: {Math.round(suggestion.averageScore)}%
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(suggestion)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-gray-800">{suggestion.content}</p>
                        </div>

                        {suggestion.targetQAs && suggestion.targetQAs.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">対象のQ&A:</h4>
                            <div className="space-y-2">
                              {suggestion.targetQAs.map((qa) => (
                                <div key={qa._id} className="p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm font-medium">{qa.question}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {qa.difficulty}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      正解: {qa.answer}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </TabsContent>

            {/* 統計情報タブ */}
            <TabsContent value="statistics" className="space-y-4">
              {lectureStats && (
                <>
                  {/* 全体統計 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart className="h-5 w-5" />
                        全体統計
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">総回答数</p>
                          <p className="text-2xl font-bold">{lectureStats.overallStats.totalResponses}</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">平均正答率</p>
                          <p className={`text-2xl font-bold ${getAccuracyColor(lectureStats.overallStats.accuracy)}`}>
                            {Math.round(lectureStats.overallStats.accuracy)}%
                          </p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">参加学生数</p>
                          <p className="text-2xl font-bold">{(lectureStats as any).uniqueStudents || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 問題別統計 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>問題別パフォーマンス</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {lectureStats.questionStats?.map((stat, index) => {
                          const badge = getAccuracyBadge(stat.accuracy);
                          return (
                            <div key={stat.qaId} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex-1">
                                <p className="text-sm font-medium">問題 {index + 1}</p>
                                <p className="text-xs text-gray-500">回答数: {stat.totalResponses}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={badge.color}>
                                  {badge.label}
                                </Badge>
                                <span className={`font-semibold ${getAccuracyColor(stat.accuracy)}`}>
                                  {Math.round(stat.accuracy)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 難易度別統計 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>難易度別パフォーマンス</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(lectureStats.difficultyStats || {}).map(([difficulty, stats]) => (
                          <div key={difficulty} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{difficulty}</Badge>
                              <span className="text-sm text-gray-600">
                                {stats.count}問 / {stats.totalResponses}回答
                              </span>
                            </div>
                            <span className={`font-semibold ${getAccuracyColor(stats.accuracy || 0)}`}>
                              {Math.round(stats.accuracy || 0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* 削除確認ダイアログ */}
        <ConfirmationDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="改善提案を削除しますか？"
          description={suggestionToDelete ? `この改善提案を削除します。この操作は取り消せません。` : ""}
          variant="destructive"
          confirmText="削除する"
          cancelText="キャンセル"
          onConfirm={handleDeleteSuggestion}
        />
      </div>
    </AuthGuard>
  );
}
