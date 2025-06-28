"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function NewLiveSessionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const lectures = useQuery(api.lectures.listLectures, {});
  const createSession = useMutation(api.liveQuiz.createLiveSession);
  
  const [formData, setFormData] = useState({
    title: "",
    lectureId: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const generateAccessCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.lectureId) {
      toast.error("すべての項目を入力してください");
      return;
    }

    if (!user) {
      toast.error("ログインが必要です");
      return;
    }

    setIsCreating(true);
    
    try {
      const sessionId = await createSession({
        lectureId: formData.lectureId as any,
        hostId: user.id,
        title: formData.title,
      });
      
      toast.success("ライブセッションを作成しました！");
      router.push(`/live/host/${sessionId}`);
    } catch (error) {
      toast.error("セッションの作成に失敗しました");
    } finally {
      setIsCreating(false);
    }
  };

  if (!lectures) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              ダッシュボードに戻る
            </Link>
          </Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-2xl">ライブクイズセッション作成</CardTitle>
            </div>
            <CardDescription>
              リアルタイムで参加者と一緒にクイズを実施できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">セッションタイトル</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="例: 機械学習入門 - 第3回確認テスト"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={isCreating}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lecture">対象講義</Label>
                <Select
                  value={formData.lectureId}
                  onValueChange={(value) => setFormData({ ...formData, lectureId: value })}
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="講義を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {lectures.map((lecture) => (
                      <SelectItem key={lecture._id} value={lecture._id}>
                        {lecture.title} ({lecture.qaCount || 0}問)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-indigo-50 rounded-lg p-4">
                <h3 className="font-semibold text-sm mb-2">ライブクイズの特徴</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 参加者はアクセスコードで簡単に参加</li>
                  <li>• リアルタイムで回答状況を確認</li>
                  <li>• 自動採点とランキング表示</li>
                  <li>• 結果の即時フィードバック</li>
                </ul>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isCreating || lectures.length === 0}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    セッションを開始
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 