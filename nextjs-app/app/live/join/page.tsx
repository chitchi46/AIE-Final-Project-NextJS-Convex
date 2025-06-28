"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";

export default function LiveJoinPage() {
  const router = useRouter();
  const joinSession = useMutation(api.liveQuiz.joinSession);
  
  const [accessCode, setAccessCode] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode || !participantName) {
      toast.error("すべての項目を入力してください");
      return;
    }

    setIsJoining(true);
    
    try {
      const participantId = `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sessionId = await joinSession({
        accessCode: accessCode.toUpperCase(),
        participantId,
        participantName,
      });
      
      // 参加者情報をセッションストレージに保存
      sessionStorage.setItem("liveQuizParticipant", JSON.stringify({
        id: participantId,
        name: participantName,
        sessionId,
      }));
      
      toast.success("セッションに参加しました！");
      router.push(`/live/play/${sessionId}`);
    } catch (error: any) {
      toast.error(error.message || "参加に失敗しました");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">ライブクイズに参加</CardTitle>
            <CardDescription>
              アクセスコードを入力してセッションに参加しましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode">アクセスコード</Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="例: ABC123"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="text-center text-2xl font-mono"
                  maxLength={6}
                  required
                  disabled={isJoining}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">あなたの名前</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="表示名を入力"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  required
                  disabled={isJoining}
                />
              </div>
              
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isJoining}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    参加中...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    参加する
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-600">
            先生からアクセスコードを教えてもらってください
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
} 