"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Trash2, BarChart, FileText, Eye, EyeOff, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { QAGenerationForm } from "@/components/qa-generation-form";
import { useAction } from "convex/react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { showUndoToast } from "@/components/ui/undo-toast";

function LectureDetailContent() {
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const lectureId = params.id as Id<"lectures">;

  const lecture = useQuery(api.lectures.getLecture, lectureId ? { lectureId } : "skip");
  const qas = useQuery(api.qa.listQA, lectureId ? { lectureId, includeUnpublished: true } : "skip");
  const stats = useQuery(api.stats.statsByLecture, lectureId ? { lectureId } : "skip");
  const deleteQA = useMutation(api.qa.deleteQA);
  const updateQA = useMutation(api.qa.updateQA);
  const togglePublish = useMutation(api.qa.togglePublish);
  const createQA = useMutation(api.qa.createQA);
  const generateQAWithAI = useAction(api.actions.generateQA.generateQAWithAI);
  const extractFileContent = useAction(api.actions.extractFileContent.extractFileContent);
  const updateLecture = useMutation(api.lectures.updateLecture);

  const [editingQA, setEditingQA] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qaToDelete, setQaToDelete] = useState<{ id: Id<"qa_templates">; question: string } | null>(null);
  const [isLectureEditDialogOpen, setIsLectureEditDialogOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState({ title: "", description: "" });
  const [newQA, setNewQA] = useState({
    question: "",
    questionType: "multiple_choice" as const,
    options: ["", "", "", ""],
    answer: "",
    difficulty: "medium" as const,
    explanation: "",
  });

  if (!mounted) {
    return null;
  }

  if (!lecture || !qas || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const handleDeleteQA = async () => {
    if (!qaToDelete) return;

    try {
      await deleteQA({ qaId: qaToDelete.id });
      
      // 削除確認ダイアログを閉じる
      setDeleteConfirmOpen(false);
      setQaToDelete(null);
      
      // UNDOトーストを表示
      showUndoToast({
        title: "Q&Aを削除しました",
        description: `「${qaToDelete.question.substring(0, 30)}...」を削除しました`,
        onUndo: async () => {
          toast.error("復元機能は準備中です");
        },
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Q&Aの削除に失敗しました");
    }
  };

  const handleDeleteClick = (qa: any) => {
    setQaToDelete({ id: qa._id, question: qa.question });
    setDeleteConfirmOpen(true);
  };

  const handleTogglePublish = async (qaId: Id<"qa_templates">) => {
    const result = await togglePublish({ qaId });
    toast.success(result.isPublished ? "Q&Aを公開しました" : "Q&Aを非公開にしました");
  };

  const handleEditQA = (qa: any) => {
    setEditingQA({
      ...qa,
      options: qa.options || ["", "", "", ""],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateQA = async () => {
    if (!editingQA) return;

    try {
      await updateQA({
        qaId: editingQA._id,
        updates: {
          question: editingQA.question,
          options: editingQA.questionType === "multiple_choice" ? editingQA.options : undefined,
          answer: editingQA.answer,
          difficulty: editingQA.difficulty,
          explanation: editingQA.explanation,
        },
      });
      toast.success("Q&Aを更新しました");
      setIsEditDialogOpen(false);
      setEditingQA(null);
    } catch (error) {
      toast.error("更新に失敗しました");
    }
  };

  const handleCreateQA = async () => {
    try {
      await createQA({
        lectureId,
        ...newQA,
        options: newQA.questionType === "multiple_choice" ? newQA.options.filter(o => o) : undefined,
      });
      toast.success("Q&Aを作成しました");
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
      toast.error("作成に失敗しました");
    }
  };

  const handleEditLecture = () => {
    setEditingLecture({
      title: lecture.title,
      description: lecture.description,
    });
    setIsLectureEditDialogOpen(true);
  };

  const handleUpdateLecture = async () => {
    try {
      await updateLecture({
        lectureId,
        updates: {
          title: editingLecture.title,
          description: editingLecture.description,
        },
      });
      toast.success("講義情報を更新しました");
      setIsLectureEditDialogOpen(false);
    } catch (error) {
      toast.error("更新に失敗しました");
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ダッシュボードに戻る
          </Link>
        </Button>
      </div>

      {/* 講義情報 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{lecture.title}</CardTitle>
              <CardDescription className="mt-2">{lecture.description}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleEditLecture}>
              <Edit className="mr-2 h-4 w-4" />
              編集
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold">{lecture.stats.qaCount}</div>
              <div className="text-sm text-gray-600">Q&A数</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold">{lecture.stats.totalResponses}</div>
              <div className="text-sm text-gray-600">総回答数</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold">{lecture.stats.correctResponses}</div>
              <div className="text-sm text-gray-600">正解数</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-2xl font-bold">
                {(lecture.stats.accuracy * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">正答率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブ */}
      <Tabs defaultValue="qa" className="space-y-4">
        <TabsList>
          <TabsTrigger value="qa">
            <FileText className="mr-2 h-4 w-4" />
            Q&A一覧
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart className="mr-2 h-4 w-4" />
            統計情報
          </TabsTrigger>
        </TabsList>

        {/* Q&A一覧 */}
        <TabsContent value="qa" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Q&A一覧</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setIsGenerateDialogOpen(true)}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border-purple-200"
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                    AI自動生成
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    手動作成
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>質問</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>難易度</TableHead>
                    <TableHead>回答数</TableHead>
                    <TableHead>正答率</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qas.map((qa) => {
                    const qaStats = stats.questionStats.find(s => s.qaId === qa._id);
                    return (
                      <TableRow key={qa._id}>
                        <TableCell className="font-medium">{qa.question}</TableCell>
                        <TableCell>
                          {qa.questionType === "multiple_choice" && "選択式"}
                          {qa.questionType === "short_answer" && "短答式"}
                          {qa.questionType === "descriptive" && "記述式"}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            qa.difficulty === "easy" ? "bg-green-100 text-green-800" :
                            qa.difficulty === "medium" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {qa.difficulty === "easy" && "易"}
                            {qa.difficulty === "medium" && "中"}
                            {qa.difficulty === "hard" && "難"}
                          </span>
                        </TableCell>
                        <TableCell>{qaStats?.totalResponses || 0}</TableCell>
                        <TableCell>
                          {qaStats ? `${(qaStats.accuracy * 100).toFixed(1)}%` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={qa.isPublished !== false ? "default" : "secondary"}>
                            {qa.isPublished !== false ? "公開中" : "非公開"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePublish(qa._id)}
                            >
                              {qa.isPublished !== false ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditQA(qa)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(qa)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 統計情報 */}
        <TabsContent value="stats">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 難易度別統計 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">難易度別正答率</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">易</span>
                    <span className="text-sm font-medium">
                      {stats.difficultyStats.easy.averageAccuracy.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={stats.difficultyStats.easy.averageAccuracy} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">中</span>
                    <span className="text-sm font-medium">
                      {stats.difficultyStats.medium.averageAccuracy.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={stats.difficultyStats.medium.averageAccuracy} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">難</span>
                    <span className="text-sm font-medium">
                      {stats.difficultyStats.hard.averageAccuracy.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={stats.difficultyStats.hard.averageAccuracy} />
                </div>
              </CardContent>
            </Card>

            {/* 低正答率のQ&A */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">要改善Q&A（正答率50%以下）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.questionStats
                    .filter(q => q.accuracy < 0.5 && q.totalResponses > 0)
                    .sort((a, b) => a.accuracy - b.accuracy)
                    .slice(0, 5)
                    .map(q => (
                      <div key={q.qaId} className="p-3 bg-red-50 rounded">
                        <div className="font-medium text-sm">{q.question}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          正答率: {(q.accuracy * 100).toFixed(1)}% ({q.correctResponses}/{q.totalResponses})
                        </div>
                      </div>
                    ))}
                  {stats.questionStats.filter(q => q.accuracy < 0.5 && q.totalResponses > 0).length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      低正答率のQ&Aはありません
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 編集ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Q&Aを編集</DialogTitle>
            <DialogDescription>
              質問と回答の内容を編集できます
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
                  rows={3}
                />
              </div>
              
              {editingQA.questionType === "multiple_choice" && (
                <div className="space-y-2">
                  <Label>選択肢</Label>
                  {editingQA.options.map((option: string, index: number) => (
                    <Input
                      key={index}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editingQA.options];
                        newOptions[index] = e.target.value;
                        setEditingQA({ ...editingQA, options: newOptions });
                      }}
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
                />
              </div>
              
              <div>
                <Label htmlFor="edit-difficulty">難易度</Label>
                <Select
                  value={editingQA.difficulty}
                  onValueChange={(value) => setEditingQA({ ...editingQA, difficulty: value })}
                >
                  <SelectTrigger>
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
                <Label htmlFor="edit-explanation">解説（オプション）</Label>
                <Textarea
                  id="edit-explanation"
                  value={editingQA.explanation || ""}
                  onChange={(e) => setEditingQA({ ...editingQA, explanation: e.target.value })}
                  rows={2}
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

      {/* 新規作成ダイアログ */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Q&Aを新規作成</DialogTitle>
            <DialogDescription>
              新しい質問と回答を作成します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-type">質問タイプ</Label>
              <Select
                value={newQA.questionType}
                onValueChange={(value: any) => setNewQA({ ...newQA, questionType: value })}
              >
                <SelectTrigger>
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
                rows={3}
                placeholder="質問を入力してください"
              />
            </div>
            
            {newQA.questionType === "multiple_choice" && (
              <div className="space-y-2">
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
                placeholder="正解を入力してください"
              />
            </div>
            
            <div>
              <Label htmlFor="new-difficulty">難易度</Label>
              <Select
                value={newQA.difficulty}
                onValueChange={(value: any) => setNewQA({ ...newQA, difficulty: value })}
              >
                <SelectTrigger>
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
              <Label htmlFor="new-explanation">解説（オプション）</Label>
              <Textarea
                id="new-explanation"
                value={newQA.explanation}
                onChange={(e) => setNewQA({ ...newQA, explanation: e.target.value })}
                rows={2}
                placeholder="解説を入力してください（任意）"
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

      {/* AI自動生成ダイアログ */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI自動Q&A生成</DialogTitle>
            <DialogDescription>
              講義内容から自動的にQ&Aを生成します
            </DialogDescription>
          </DialogHeader>
          <QAGenerationForm
            lectureId={lectureId}
            lectureTitle={lecture.title}
            onGenerateComplete={async () => {
              setIsGenerateDialogOpen(false);
              // Q&Aリストを再読み込み
              window.location.reload();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Q&Aを削除しますか？"
        description={qaToDelete ? `「${qaToDelete.question.substring(0, 50)}...」を削除します。この操作は取り消せません。` : ""}
        variant="destructive"
        confirmText="削除する"
        cancelText="キャンセル"
        onConfirm={handleDeleteQA}
      />

      {/* 講義編集ダイアログ */}
      <Dialog open={isLectureEditDialogOpen} onOpenChange={setIsLectureEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>講義情報を編集</DialogTitle>
            <DialogDescription>
              講義のタイトルと説明を編集できます
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">講義タイトル</Label>
              <Input
                id="edit-title"
                value={editingLecture.title}
                onChange={(e) => setEditingLecture({ ...editingLecture, title: e.target.value })}
                placeholder="講義タイトルを入力してください"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-description">講義の説明</Label>
              <Textarea
                id="edit-description"
                value={editingLecture.description}
                onChange={(e) => setEditingLecture({ ...editingLecture, description: e.target.value })}
                rows={4}
                placeholder="講義の説明を入力してください"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLectureEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdateLecture}>
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LectureDetailPageWrapper() {
  return <LectureDetailContent />;
}

export default function LectureDetailPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return <LectureDetailPageWrapper />;
} 