"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function RegisterClient(){
 const router = useRouter();
 const { signIn } = useAuthActions();
 const [isLoading,setIsLoading]=useState(false);
 const [formData,setFormData]=useState({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "student" as "student" | "teacher" | "admin"
 });

 const registerUser = useMutation(api.auth.registerUser);
 const checkNameAvailability = useQuery(api.auth.checkNameAvailability, 
   formData.name.length > 0 ? { name: formData.name } : "skip"
 );

 const handleSubmit=async(e:React.FormEvent)=>{
  e.preventDefault();
  
  if(formData.password !== formData.confirmPassword){
   toast.error("パスワードが一致しません");
   return;
  }

  // 名前重複チェック
  if (checkNameAvailability && !checkNameAvailability.available) {
    toast.error(checkNameAvailability.message);
    return;
  }

  setIsLoading(true);
  
  try {
    // カスタム登録関数を使用
    const result = await registerUser({
      email: formData.email,
      name: formData.name,
      password: formData.password,
      role: formData.role,
    });

    if (result.success) {
      // 登録成功後、自動ログイン
      await signIn("password", {
        email: formData.email,
        password: formData.password,
      });
      
      toast.success("登録に成功しました");
      router.push("/dashboard");
    }
  } catch (error: any) {
    console.error("Registration error:", error);
    if (error?.message) {
      toast.error(error.message);
    } else {
      toast.error("登録に失敗しました");
    }
  } finally {
    setIsLoading(false);
  }
 };

 return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">新規登録</CardTitle>
          <CardDescription>
            講義内容確認QAシステムのアカウントを作成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">名前</Label>
              <Input
                id="name"
                type="text"
                placeholder="名前"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
              {checkNameAvailability && !checkNameAvailability.available && (
                <p className="text-sm text-red-600">{checkNameAvailability.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">ロール</Label>
              <Select value={formData.role} onValueChange={(value: "student" | "teacher" | "admin") => setFormData({...formData, role: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="ロールを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">学生</SelectItem>
                  <SelectItem value="teacher">教師</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">パスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || (checkNameAvailability && !checkNameAvailability.available)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登録
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-sm text-muted-foreground">
            既にアカウントをお持ちの方は{" "}
            <Link href="/login" className="underline">
              ログイン
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
 );
} 