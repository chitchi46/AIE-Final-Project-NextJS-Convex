"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { Pencil, Trash, Eye, EyeOff, Plus, BarChart, ArrowLeft, Search, Filter, ChevronLeft, ChevronRight, FileText, Activity, AlertCircle, CheckCircle2, CheckSquare, Square } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/auth-guard";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { showUndoToast } from "@/components/ui/undo-toast";
import { qaFormSchema, validateField, getFieldError, type QAFormData } from "@/lib/validations/qa";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qaToDelete, setQaToDelete] = useState<{ id: Id<"qa_templates">; question: string } | null>(null);
  
  // 一括操作用のstate
  const [selectedQAs, setSelectedQAs] = useState<Set<Id<"qa_templates">>>(new Set());
  const [isBulkActionConfirmOpen, setIsBulkActionConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"publish" | "unpublish" | "delete" | null>(null);
  const [newQA, setNewQA] = useState<Partial<QAFormData>>({
    question: "",
    questionType: "multiple_choice" as "multiple_choice" | "short_answer" | "descriptive",
    options: ["", "", "", ""],
    answer: "",
    difficulty: "easy" as "easy" | "medium" | "hard",
    explanation: "",
  });
  
  const [isAIGenerateDialogOpen, setIsAIGenerateDialogOpen] = useState(false);
  const [aiGeneratePrompt, setAiGeneratePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // バリデーション関連のstate
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isValidating, setIsValidating] = useState(false);

  // 検索・フィルタ・ページネーション用のstate
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");
  const [filterType, setFilterType] = useState<"all" | "multiple_choice" | "short_answer" | "descriptive">("all");
  const [filterPublished, setFilterPublished] = useState<"all" | "published" | "unpublished">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // フィルタリングされたQAリスト
  const filteredQAList = useMemo(() => {
    if (!qaList) return [];

    let filtered = [...qaList];

    // 検索フィルタ
    if (searchQuery) {
      filtered = filtered.filter(qa => 
        qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        qa.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (qa.explanation && qa.explanation.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // 難易度フィルタ
    if (filterDifficulty !== "all") {
      filtered = filtered.filter(qa => qa.difficulty === filterDifficulty);
    }

    // 問題タイプフィルタ
    if (filterType !== "all") {
      filtered = filtered.filter(qa => qa.questionType === filterType);
    }

    // 公開状態フィルタ
    if (filterPublished !== "all") {
      const isPublished = filterPublished === "published";
      filtered = filtered.filter(qa => (qa.isPublished !== false) === isPublished);
    }

    return filtered;
  }, [qaList, searchQuery, filterDifficulty, filterType, filterPublished]);

  // ページネーション
  const totalPages = Math.ceil(filteredQAList.length / itemsPerPage);
  const paginatedQAList = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQAList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQAList, currentPage, itemsPerPage]);

  // フィルタが変更されたらページを1に戻す
  const resetPage = () => {
    setCurrentPage(1);
  };
  
  // フィールドのバリデーション
  const validateFormField = useCallback((fieldName: keyof QAFormData, value: any) => {
    const error = validateField(fieldName, value, newQA);
    setFieldErrors(prev => {
      if (error) {
        return { ...prev, [fieldName]: error };
      } else {
        const { [fieldName]: removed, ...rest } = prev;
        return rest;
      }
    });
    return !error;
  }, [newQA]);
  
  // フォーム全体のバリデーション
  const validateForm = useCallback(() => {
    try {
      let schemaToUse;
      switch (newQA.questionType) {
        case 'multiple_choice':
          schemaToUse = qaFormSchema.parse({ ...newQA, options: newQA.options?.filter(o => o) });
          break;
        case 'short_answer':
          schemaToUse = qaFormSchema.parse({ ...newQA, options: [] });
          break;
        case 'descriptive':
          schemaToUse = qaFormSchema.parse({ ...newQA, options: [] });
          break;
      }
      setFieldErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          const path = err.path.join('.');
          errors[path] = err.message;
        });
        setFieldErrors(errors);
      }
      return false;
    }
  }, [newQA]);
  
  // 難易度と問題タイプの連携
  const handleDifficultyChange = useCallback((difficulty: "easy" | "medium" | "hard") => {
    const questionTypeMap = {
      easy: "multiple_choice" as const,
      medium: "short_answer" as const,
      hard: "descriptive" as const
    };
    
    setNewQA(prev => ({
      ...prev,
      difficulty,
      questionType: questionTypeMap[difficulty],
      // 問題タイプが変わった場合は選択肢をリセット
      options: questionTypeMap[difficulty] === "multiple_choice" ? ["", "", "", ""] : []
    }));
  }, []);

  // フィールド変更ハンドラー
  const handleFieldChange = useCallback((fieldName: keyof QAFormData, value: any) => {
    setNewQA(prev => ({ ...prev, [fieldName]: value }));
    
    // タッチされたフィールドをマーク
    if (!touchedFields[fieldName]) {
      setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    }
    
    // デバウンスされたバリデーション
    setTimeout(() => {
      validateFormField(fieldName, value);
    }, 300);
  }, [touchedFields, validateFormField]);
  
  // フィールドのブラー時にバリデーション
  const handleFieldBlur = useCallback((fieldName: keyof QAFormData) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    validateFormField(fieldName, (newQA as any)[fieldName]);
  }, [newQA, validateFormField]);

  // Mutations
  const updateQA = useMutation(api.qa.updateQA);
  const deleteQA = useMutation(api.qa.deleteQA);
  const togglePublish = useMutation(api.qa.togglePublish);
  const createQA = useMutation(api.qa.createQA);
  const generateQAWithAI = useMutation(api.qa.generateQAWithAI);
  const bulkTogglePublish = useMutation(api.qa.bulkTogglePublish);
  const bulkDeleteQA = useMutation(api.qa.bulkDeleteQA);

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

  const handleDeleteQA = async () => {
    if (!qaToDelete) return;
    
    try {
      await deleteQA({ qaId: qaToDelete.id });
      
      // 削除確認ダイアログを閉じる
      setDeleteConfirmOpen(false);
      setQaToDelete(null);
      
      // UNDOトーストを表示
      showUndoToast({
        title: "QAを削除しました",
        description: `「${qaToDelete.question.substring(0, 30)}...」を削除しました`,
        onUndo: async () => {
          // 実際の復元処理はサーバー側での実装が必要
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
        description: "QAの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (qa: any) => {
    setQaToDelete({ id: qa._id, question: qa.question });
    setDeleteConfirmOpen(true);
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
    
    // バリデーション実行
    setIsValidating(true);
    const isValid = validateForm();
    setIsValidating(false);
    
    if (!isValid) {
      toast({
        title: "入力エラー",
        description: "入力内容に誤りがあります。エラーメッセージを確認してください。",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createQA({
        lectureId: selectedLecture,
        question: newQA.question!,
        questionType: newQA.questionType!,
        options: newQA.questionType === "multiple_choice" ? newQA.options?.filter(o => o) : undefined,
        answer: newQA.answer!,
        difficulty: newQA.difficulty!,
        explanation: newQA.explanation || "",
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
      setFieldErrors({});
      setTouchedFields({});
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

  const handleAIGenerate = async () => {
    if (!aiGeneratePrompt.trim() || !selectedLecture) {
      toast({
        title: "エラー",
        description: "生成指示を入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateQAWithAI({
        lectureId: selectedLecture,
        prompt: aiGeneratePrompt,
      });

      if (result.success) {
        toast({
          title: "成功",
          description: `${result.qaList.length}件のQAを生成しました`,
        });
        setIsAIGenerateDialogOpen(false);
        setAiGeneratePrompt("");
      } else {
        throw new Error(result.error || "AI生成に失敗しました");
      }
    } catch (error) {
      console.error("AI生成エラー:", error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "AI生成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 一括操作のハンドラー
  const handleSelectAll = useCallback(() => {
    if (selectedQAs.size === paginatedQAList.length) {
      setSelectedQAs(new Set());
    } else {
      setSelectedQAs(new Set(paginatedQAList.map(qa => qa._id)));
    }
  }, [selectedQAs, paginatedQAList]);

  const handleSelectQA = useCallback((qaId: Id<"qa_templates">) => {
    const newSelected = new Set(selectedQAs);
    if (newSelected.has(qaId)) {
      newSelected.delete(qaId);
    } else {
      newSelected.add(qaId);
    }
    setSelectedQAs(newSelected);
  }, [selectedQAs]);

  const handleBulkAction = useCallback((action: "publish" | "unpublish" | "delete") => {
    if (selectedQAs.size === 0) {
      toast({
        title: "エラー",
        description: "QAを選択してください",
        variant: "destructive",
      });
      return;
    }
    setBulkAction(action);
    setIsBulkActionConfirmOpen(true);
  }, [selectedQAs, toast]);

  const executeBulkAction = async () => {
    if (!bulkAction || selectedQAs.size === 0) return;

    try {
      if (bulkAction === "delete") {
        const result = await bulkDeleteQA({
          qaIds: Array.from(selectedQAs),
        });

        if (result.success) {
          showUndoToast({
            title: "QAを削除しました",
            description: `${result.summary.succeeded}件のQAを削除しました`,
            onUndo: async () => {
              toast({
                title: "復元機能は準備中です",
                description: "削除したデータの復元機能は今後実装予定です。",
                variant: "destructive",
              });
            },
          });
        }
      } else {
        const isPublished = bulkAction === "publish";
        const result = await bulkTogglePublish({
          qaIds: Array.from(selectedQAs),
          isPublished,
        });

        if (result.success) {
          toast({
            title: "成功",
            description: result.message,
          });
        }
      }

      // 選択をクリア
      setSelectedQAs(new Set());
      setIsBulkActionConfirmOpen(false);
      setBulkAction(null);
    } catch (error) {
      console.error("一括操作エラー:", error);
      toast({
        title: "エラー",
        description: "一括操作に失敗しました",
        variant: "destructive",
      });
    }
  };

  // フィルタ変更時に選択をクリア
  useEffect(() => {
    setSelectedQAs(new Set());
  }, [searchQuery, filterDifficulty, filterType, filterPublished, currentPage]);

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
            {/* 検索・フィルタセクション */}
            <Card className="mb-6 p-4">
              <div className="space-y-4">
                {/* 検索バー */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="質問、回答、解説を検索..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      resetPage();
                    }}
                    className="pl-10"
                  />
                </div>

                {/* フィルタ */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">フィルタ:</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Select 
                      value={filterDifficulty} 
                      onValueChange={(value: any) => {
                        setFilterDifficulty(value);
                        resetPage();
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="難易度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべての難易度</SelectItem>
                        <SelectItem value="easy">易しい</SelectItem>
                        <SelectItem value="medium">普通</SelectItem>
                        <SelectItem value="hard">難しい</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select 
                      value={filterType} 
                      onValueChange={(value: any) => {
                        setFilterType(value);
                        resetPage();
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="問題形式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべての形式</SelectItem>
                        <SelectItem value="multiple_choice">選択式</SelectItem>
                        <SelectItem value="short_answer">短答式</SelectItem>
                        <SelectItem value="descriptive">記述式</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select 
                      value={filterPublished} 
                      onValueChange={(value: any) => {
                        setFilterPublished(value);
                        resetPage();
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="公開状態" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="published">公開中</SelectItem>
                        <SelectItem value="unpublished">非公開</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterDifficulty("all");
                        setFilterType("all");
                        setFilterPublished("all");
                        resetPage();
                      }}
                      className="w-full sm:w-auto"
                    >
                      フィルタをクリア
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* QA作成ボタンと統計情報 */}
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {filteredQAList.length}件のQA
                    {qaList && filteredQAList.length !== qaList.length && 
                      ` (全{qaList.length}件中)`
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push('/teacher/audit-logs')}
                    className="text-sm p-0"
                  >
                    操作履歴を見る
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {selectedQAs.size > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction("publish")}
                      className="text-green-600"
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      一括公開 ({selectedQAs.size}件)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction("unpublish")}
                      className="text-orange-600"
                    >
                      <EyeOff className="mr-1 h-4 w-4" />
                      一括非公開 ({selectedQAs.size}件)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction("delete")}
                      className="text-red-600"
                    >
                      <Trash className="mr-1 h-4 w-4" />
                      一括削除 ({selectedQAs.size}件)
                    </Button>
                  </div>
                )}
                <Button 
                  onClick={() => setIsAIGenerateDialogOpen(true)}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  AI自動生成
                </Button>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  手動作成
                </Button>
              </div>
            </div>

            {/* 一括選択バー */}
            {paginatedQAList.length > 0 && (
              <Card className="mb-4 p-2">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedQAs.size === paginatedQAList.length && paginatedQAList.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="すべて選択"
                  />
                  <span className="text-sm text-gray-600">
                    {selectedQAs.size === 0 
                      ? "このページのQAをすべて選択" 
                      : `${selectedQAs.size}件選択中`}
                  </span>
                  {selectedQAs.size > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSelectedQAs(new Set())}
                      className="text-sm p-0 text-gray-500"
                    >
                      選択をクリア
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* QA一覧 */}
            <div className="space-y-4">
              {filteredQAList.length === 0 && (
                <Card className="p-6 text-center text-gray-500">
                  {qaList && qaList.length > 0 
                    ? "検索条件に一致するQAが見つかりませんでした。"
                    : "まだQAが作成されていません。新規QA作成ボタンから作成してください。"
                  }
                </Card>
              )}
              
              {paginatedQAList.map((qa) => (
                <Card key={qa._id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedQAs.has(qa._id)}
                      onCheckedChange={() => handleSelectQA(qa._id)}
                      aria-label={`${qa.question}を選択`}
                      className="mt-1"
                    />
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 flex-1">
                      <div className="flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
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
                        <h3 className="text-base sm:text-lg font-semibold mb-2 break-words">{qa.question}</h3>
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
                      <div className="flex flex-col sm:flex-row gap-2 ml-0 sm:ml-4 mt-3 sm:mt-0 min-w-fit">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewStats(qa._id)}
                            title="統計を表示"
                            className="h-8 px-2"
                          >
                            <BarChart className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs hidden sm:inline">統計</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingQA(qa);
                              setIsEditDialogOpen(true);
                            }}
                            title="編集"
                            className="h-8 px-2"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs hidden sm:inline">編集</span>
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePublish(qa._id)}
                            title={qa.isPublished !== false ? "非公開にする" : "公開する"}
                            className="h-8 px-2"
                          >
                            {qa.isPublished !== false ? (
                              <>
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                <span className="text-xs hidden sm:inline">公開中</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3.5 w-3.5 mr-1" />
                                <span className="text-xs hidden sm:inline">非公開</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(qa)}
                            title="削除"
                            className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs hidden sm:inline">削除</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // 現在のページの前後2ページ、最初と最後のページを表示
                      return page === 1 || 
                             page === totalPages || 
                             Math.abs(page - currentPage) <= 2;
                    })
                    .map((page, index, array) => {
                      // ページ番号の間に省略記号を表示
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && <span className="px-2">...</span>}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon"
                            onClick={() => setCurrentPage(page)}
                            className="w-10 h-10"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
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
                <Label htmlFor="new-question" className="flex items-center gap-2">
                  質問
                  {touchedFields.question && !fieldErrors.question && newQA.question && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                </Label>
                <Textarea
                  id="new-question"
                  value={newQA.question}
                  onChange={(e) => handleFieldChange('question', e.target.value)}
                  onBlur={() => handleFieldBlur('question')}
                  className={cn(
                    "mt-1",
                    touchedFields.question && fieldErrors.question && "border-red-500"
                  )}
                  aria-invalid={touchedFields.question && !!fieldErrors.question}
                  aria-describedby={fieldErrors.question ? "question-error" : undefined}
                />
                {touchedFields.question && fieldErrors.question && (
                  <p id="question-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.question}
                  </p>
                )}
              </div>
              
              {newQA.questionType === "multiple_choice" && (
                <div>
                  <Label className="flex items-center gap-2">
                    選択肢
                    {touchedFields.options && !fieldErrors.options && ((newQA.options?.filter(o => o).length ?? 0) >= 2) && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </Label>
                  {newQA.options?.map((option, index) => (
                    <Input
                      key={index}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(newQA.options || [])];
                        newOptions[index] = e.target.value;
                        handleFieldChange('options', newOptions);
                      }}
                      onBlur={() => handleFieldBlur('options')}
                      className={cn(
                        "mt-1",
                        touchedFields.options && fieldErrors.options && "border-red-500"
                      )}
                      placeholder={`選択肢 ${index + 1}`}
                      aria-describedby={fieldErrors.options ? "options-error" : undefined}
                    />
                  ))}
                  {touchedFields.options && fieldErrors.options && (
                    <p id="options-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.options}
                    </p>
                  )}
                </div>
              )}
              
              <div>
                <Label htmlFor="new-answer" className="flex items-center gap-2">
                  正解
                  {touchedFields.answer && !fieldErrors.answer && newQA.answer && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                </Label>
                <Input
                  id="new-answer"
                  value={newQA.answer}
                  onChange={(e) => handleFieldChange('answer', e.target.value)}
                  onBlur={() => handleFieldBlur('answer')}
                  className={cn(
                    "mt-1",
                    touchedFields.answer && fieldErrors.answer && "border-red-500"
                  )}
                  aria-invalid={touchedFields.answer && !!fieldErrors.answer}
                  aria-describedby={fieldErrors.answer ? "answer-error" : undefined}
                />
                {touchedFields.answer && fieldErrors.answer && (
                  <p id="answer-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldErrors.answer}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="new-difficulty">難易度</Label>
                <Select
                  value={newQA.difficulty}
                  onValueChange={handleDifficultyChange}
                >
                  <SelectTrigger id="new-difficulty" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">易 (選択式)</SelectItem>
                    <SelectItem value="medium">中 (短答式)</SelectItem>
                    <SelectItem value="hard">難 (記述式)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  難易度に応じて問題形式が自動設定されます
                </p>
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

        {/* AI自動生成ダイアログ */}
        <Dialog open={isAIGenerateDialogOpen} onOpenChange={setIsAIGenerateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>AI Q&A自動生成</DialogTitle>
              <DialogDescription>
                講義内容に基づいてAIがQ&Aを自動生成します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ai-prompt">生成指示</Label>
                <Textarea
                  id="ai-prompt"
                  value={aiGeneratePrompt}
                  onChange={(e) => setAiGeneratePrompt(e.target.value)}
                  placeholder="どのような問題を生成したいか指示してください。例：「基本概念について易しい選択式問題を5問」「応用問題を3問」など"
                  className="mt-1 min-h-[100px]"
                />
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">生成のヒント</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 問題数を指定すると、その数だけ生成されます</li>
                  <li>• 難易度（易・中・難）を指定できます</li>
                  <li>• 特定のトピックや概念を指定できます</li>
                  <li>• 問題形式は難易度に応じて自動選択されます</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsAIGenerateDialogOpen(false)}
                disabled={isGenerating}
              >
                キャンセル
              </Button>
              <Button 
                onClick={handleAIGenerate}
                disabled={isGenerating || !aiGeneratePrompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner size="sm" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Activity className="mr-2 h-4 w-4" />
                    生成する
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <ConfirmationDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="QAを削除しますか？"
          description={qaToDelete ? `「${qaToDelete.question.substring(0, 50)}...」を削除します。この操作は取り消せません。` : ""}
          variant="destructive"
          confirmText="削除する"
          cancelText="キャンセル"
          onConfirm={handleDeleteQA}
        />

        {/* 一括操作確認ダイアログ */}
        <ConfirmationDialog
          open={isBulkActionConfirmOpen}
          onOpenChange={setIsBulkActionConfirmOpen}
          title={
            bulkAction === "delete" 
              ? `${selectedQAs.size}件のQAを削除しますか？`
              : bulkAction === "publish"
              ? `${selectedQAs.size}件のQAを公開しますか？`
              : `${selectedQAs.size}件のQAを非公開にしますか？`
          }
          description={
            bulkAction === "delete"
              ? "選択したQAがすべて削除されます。この操作は取り消せません。"
              : bulkAction === "publish"
              ? "選択したQAがすべて公開され、学生が回答できるようになります。"
              : "選択したQAがすべて非公開となり、学生には表示されなくなります。"
          }
          variant={bulkAction === "delete" ? "destructive" : "default"}
          confirmText={
            bulkAction === "delete" 
              ? "削除する"
              : bulkAction === "publish"
              ? "公開する"
              : "非公開にする"
          }
          cancelText="キャンセル"
          onConfirm={executeBulkAction}
        />
      </div>
    </AuthGuard>
  );
} 