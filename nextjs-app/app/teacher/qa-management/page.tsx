"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Pencil, Trash, Eye, EyeOff, Plus, BarChart, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/auth-guard";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/hooks/useAuth";

export default function QAManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [selectedLecture, setSelectedLecture] = useState<Id<"lectures"> | null>(null);
  const [editingQA, setEditingQA] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedQAStats, setSelectedQAStats] = useState<Id<"qa_templates"> | null>(null);
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false);
  const [newQA, setNewQA] = useState({
    question: "",
    questionType: "multiple_choice" as "multiple_choice" | "short_answer" | "descriptive",
    options: ["", "", "", ""],
    answer: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
    explanation: "",
  });

  // 講義一覧を取得（認証状態を考慮）
  const lectures = useQuery(
    api.lectures.listLectures,
    !authLoading && user ? {} : "skip"
  );
  
  // 選択された講義のQA一覧を取得（非公開も含む）
  const qaList = useQuery(
    api.qa.listQA,
    selectedLecture && !authLoading && user 
      ? { lectureId: selectedLecture, includeUnpublished: true } 
      : "skip"
  );

  // QA統計情報を取得
  const qaStats = useQuery(
    api.qa.getQAStatistics,
    selectedQAStats ? { qaId: selectedQAStats } : "skip"
  );

  // Mutations
  const updateQA = useMutation(api.qa.updateQA);
  const deleteQA = useMutation(api.qa.deleteQA);
  const togglePublish = useMutation(api.qa.togglePublish);
  const createQA = useMutation(api.qa.createQA);

  const handleUpdateQA = async () => {
    if (!editingQA) return;
    
    try {
      await updateQA({
        qaId: editingQA._id,
        updates: {
          question: editingQA.question,
          options: editingQA.options,
          answer: editingQA.answer,
          difficulty: editingQA.difficulty,
          explanation: editingQA.explanation,
        },
      });
      
      toast({
        title: "更新成功",
        description: "QAが正常に更新されました。",
      });
      
      setIsEditDialogOpen(false);
      setEditingQA(null);
    } catch (error) {
      toast({
        title: "更新失敗",
        description: "QAの更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQA = async (qaId: Id<"qa_templates">) => {
    if (!confirm("このQAを削除してもよろしいですか？")) return;
    
    try {
      await deleteQA({ qaId });
      toast({
        title: "削除成功",
        description: "QAが削除されました。",
      });
    } catch (error) {
      toast({
        title: "削除失敗",
        description: "QAの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleTogglePublish = async (qaId: Id<"qa_templates">) => {
    try {
      const result = await togglePublish({ qaId });
      toast({
        title: result.isPublished ? "公開しました" : "非公開にしました",
        description: `QAが${result.isPublished ? "公開" : "非公開"}になりました。`,
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "公開状態の変更に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleCreateQA = async () => {
    if (!selectedLecture) return;
    
    try {
      await createQA({
        lectureId: selectedLecture,
        question: newQA.question,
        questionType: newQA.questionType,
        options: newQA.questionType === "multiple_choice" ? newQA.options.filter(o => o) : undefined,
        answer: newQA.answer,
        difficulty: newQA.difficulty,
        explanation: newQA.explanation,
      });
      
      toast({
        title: "作成成功",
        description: "新しいQAが作成されました。",
      });
      
      setIsCreateDialogOpen(false);
      setNewQA({
        question: "",
        questionType: "multiple_choice",
        options: ["", "", "", ""],
        answer: "",
        difficulty: "medium",
        explanation: "",
      });
    } catch (error) {
      toast({
        title: "作成失敗",
        description: "QAの作成に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_choice": return "選択式";
      case "short_answer": return "短答式";
      case "descriptive": return "記述式";
      default: return type;
    }
  };

  const handleViewStats = (qaId: Id<"qa_templates">) => {
    setSelectedQAStats(qaId);
    setIsStatsDialogOpen(true);
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
          <h1 className="text-3xl font-bold mb-2">QA管理</h1>
          <p className="text-gray-600">講義のQAを管理・編集できます</p>
        </div>

        {/* 講義選択 */}
        <Card className="mb-6 p-4">
          <Label htmlFor="lecture-select">講義を選択</Label>
          <Select
            value={selectedLecture || ""}
            onValueChange={(value) => setSelectedLecture(value as Id<"lectures">)}
          >
            <SelectTrigger id="lecture-select" className="w-full max-w-md mt-2">
              <SelectValue placeholder="講義を選択してください" />
            </SelectTrigger>
            <SelectContent>
              {lectures?.map((lecture) => (
                <SelectItem key={lecture._id} value={lecture._id}>
                  {lecture.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {selectedLecture && (
          <>
            {/* QA作成ボタン */}
            <div className="mb-4 flex justify-end">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新規QA作成
              </Button>
            </div>

            {/* QA一覧 */}
            <div className="space-y-4">
              {qaList && qaList.length === 0 && (
                <Card className="p-6 text-center text-gray-500">
                  まだQAが作成されていません。新規QA作成ボタンから作成してください。
                </Card>
              )}
              
              {qaList?.map((qa) => (
                <Card key={qa._id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getDifficultyColor(qa.difficulty)}>
                          {qa.difficulty}
                        </Badge>
                        <Badge variant="outline">
                          {getQuestionTypeLabel(qa.questionType)}
                        </Badge>
                        {qa.isPublished === false && (
                          <Badge variant="secondary">
                            <EyeOff className="mr-1 h-3 w-3" />
                            非公開
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{qa.question}</h3>
                      {qa.options && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-600 mb-1">選択肢:</p>
                          <ul className="list-disc list-inside text-sm">
                            {qa.options.map((option, index) => (
                              <li key={index} className={option === qa.answer ? "font-semibold text-green-600" : ""}>
                                {option}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">正解:</span> {qa.answer}
                      </p>
                      {qa.explanation && (
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">解説:</span> {qa.explanation}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewStats(qa._id)}
                        title="統計を表示"
                      >
                        <BarChart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingQA(qa);
                          setIsEditDialogOpen(true);
                        }}
                        title="編集"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePublish(qa._id)}
                        title={qa.isPublished !== false ? "非公開にする" : "公開する"}
                      >
                        {qa.isPublished !== false ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteQA(qa._id)}
                        title="削除"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* 編集ダイアログ */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>QA編集</DialogTitle>
              <DialogDescription>
                QAの内容を編集できます
              </DialogDescription>
            </DialogHeader>
            {editingQA && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-question">質問</Label>
                  <Textarea
                    id="edit-question"
                    value={editingQA.question}
                    onChange={(e) => setEditingQA({ ...editingQA, question: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                {editingQA.questionType === "multiple_choice" && (
                  <div>
                    <Label>選択肢</Label>
                    {editingQA.options?.map((option: string, index: number) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...editingQA.options];
                          newOptions[index] = e.target.value;
                          setEditingQA({ ...editingQA, options: newOptions });
                        }}
                        className="mt-1"
                        placeholder={`選択肢 ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
                
                <div>
                  <Label htmlFor="edit-answer">正解</Label>
                  <Input
                    id="edit-answer"
                    value={editingQA.answer}
                    onChange={(e) => setEditingQA({ ...editingQA, answer: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-difficulty">難易度</Label>
                  <Select
                    value={editingQA.difficulty}
                    onValueChange={(value) => setEditingQA({ ...editingQA, difficulty: value })}
                  >
                    <SelectTrigger id="edit-difficulty" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">易しい</SelectItem>
                      <SelectItem value="medium">普通</SelectItem>
                      <SelectItem value="hard">難しい</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-explanation">解説</Label>
                  <Textarea
                    id="edit-explanation"
                    value={editingQA.explanation || ""}
                    onChange={(e) => setEditingQA({ ...editingQA, explanation: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleUpdateQA}>
                更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 作成ダイアログ */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新規QA作成</DialogTitle>
              <DialogDescription>
                新しいQAを作成します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-type">問題形式</Label>
                <Select
                  value={newQA.questionType}
                  onValueChange={(value: "multiple_choice" | "short_answer" | "descriptive") => 
                    setNewQA({ ...newQA, questionType: value })
                  }
                >
                  <SelectTrigger id="new-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">選択式</SelectItem>
                    <SelectItem value="short_answer">短答式</SelectItem>
                    <SelectItem value="descriptive">記述式</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="new-question">質問</Label>
                <Textarea
                  id="new-question"
                  value={newQA.question}
                  onChange={(e) => setNewQA({ ...newQA, question: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              {newQA.questionType === "multiple_choice" && (
                <div>
                  <Label>選択肢</Label>
                  {newQA.options.map((option, index) => (
                    <Input
                      key={index}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...newQA.options];
                        newOptions[index] = e.target.value;
                        setNewQA({ ...newQA, options: newOptions });
                      }}
                      className="mt-1"
                      placeholder={`選択肢 ${index + 1}`}
                    />
                  ))}
                </div>
              )}
              
              <div>
                <Label htmlFor="new-answer">正解</Label>
                <Input
                  id="new-answer"
                  value={newQA.answer}
                  onChange={(e) => setNewQA({ ...newQA, answer: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="new-difficulty">難易度</Label>
                <Select
                  value={newQA.difficulty}
                  onValueChange={(value: "easy" | "medium" | "hard") => 
                    setNewQA({ ...newQA, difficulty: value })
                  }
                >
                  <SelectTrigger id="new-difficulty" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">易しい</SelectItem>
                    <SelectItem value="medium">普通</SelectItem>
                    <SelectItem value="hard">難しい</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="new-explanation">解説</Label>
                <Textarea
                  id="new-explanation"
                  value={newQA.explanation}
                  onChange={(e) => setNewQA({ ...newQA, explanation: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleCreateQA}>
                作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 統計ダイアログ */}
        <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>QA統計情報</DialogTitle>
              <DialogDescription>
                このQAの回答状況を確認できます
              </DialogDescription>
            </DialogHeader>
            {qaStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-gray-600">総回答数</p>
                    <p className="text-2xl font-bold">{qaStats.totalResponses}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600">正答率</p>
                    <p className="text-2xl font-bold">{qaStats.correctRate}%</p>
                  </Card>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-gray-600">正解数</p>
                    <p className="text-xl font-semibold text-green-600">{qaStats.correctResponses}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600">不正解数</p>
                    <p className="text-xl font-semibold text-red-600">{qaStats.incorrectResponses}</p>
                  </Card>
                </div>
                {Object.keys(qaStats.answerDistribution).length > 0 && (
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-2">回答分布</p>
                    {Object.entries(qaStats.answerDistribution).map(([answer, count]) => (
                      <div key={answer} className="flex justify-between items-center mb-1">
                        <span className="text-sm">{answer}</span>
                        <span className="text-sm font-semibold">{count}回</span>
                      </div>
                    ))}
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
} 