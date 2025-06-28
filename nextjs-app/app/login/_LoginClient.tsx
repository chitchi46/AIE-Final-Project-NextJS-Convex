"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

export default function LoginClient() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn("password", {
        email: formData.email,
        password: formData.password,
        flow: "signIn",
      });
      toast.success("ログインに成功しました");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ログイン</CardTitle>
          <CardDescription>
            講義内容確認QAシステムにログインしてください
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" type="email" placeholder="email@example.com" value={formData.email} onChange={(e)=>setFormData({...formData,email:e.target.value})} required disabled={isLoading}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={(e)=>setFormData({...formData,password:e.target.value})} required disabled={isLoading}/>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>ログイン中...</>) : "ログイン"}
            </Button>
            <p className="text-sm text-gray-600">アカウントをお持ちでない方は{" "}<Link href="/register" className="text-blue-600 hover:underline">新規登録</Link></p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 