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

export default function RegisterClient(){
 const router = useRouter();
 const { signIn } = useAuthActions();
 const [isLoading,setIsLoading]=useState(false);
 const [formData,setFormData]=useState({name:"",email:"",password:"",confirmPassword:"",role:"student"});
 const handleSubmit=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(formData.password!==formData.confirmPassword){toast.error("パスワードが一致しません");return;}
  setIsLoading(true);
  try{
   await signIn("password",{email:formData.email,password:formData.password,name:formData.name,role:formData.role,flow:"signUp"});
   toast.success("登録に成功しました");
   router.push("/");
  }catch(err){console.error(err);toast.error("登録に失敗しました");}
  finally{setIsLoading(false);} };
 return(
 <div className="flex min-h-screen items-center justify-center bg-gray-50">
  <Card className="w-full max-w-md">
   <CardHeader>
    <CardTitle>新規登録</CardTitle>
    <CardDescription>講義内容確認QAシステムのアカウントを作成します</CardDescription>
   </CardHeader>
   <form onSubmit={handleSubmit}>
    <CardContent className="space-y-4">
     <div className="space-y-2"><Label htmlFor="name">名前</Label><Input id="name" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} required disabled={isLoading}/></div>
     <div className="space-y-2"><Label htmlFor="email">メールアドレス</Label><Input id="email" type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} required disabled={isLoading}/></div>
     <div className="space-y-2"><Label htmlFor="role">ロール</Label><Select value={formData.role} onValueChange={v=>setFormData({...formData,role:v})} disabled={isLoading}><SelectTrigger><SelectValue placeholder="ロール選択"/></SelectTrigger><SelectContent><SelectItem value="student">学生</SelectItem><SelectItem value="teacher">教師</SelectItem></SelectContent></Select></div>
     <div className="space-y-2"><Label htmlFor="pw">パスワード</Label><Input id="pw" type="password" value={formData.password} onChange={e=>setFormData({...formData,password:e.target.value})} required disabled={isLoading} minLength={6}/></div>
     <div className="space-y-2"><Label htmlFor="pw2">パスワード（確認）</Label><Input id="pw2" type="password" value={formData.confirmPassword} onChange={e=>setFormData({...formData,confirmPassword:e.target.value})} required disabled={isLoading} minLength={6}/></div>
    </CardContent>
    <CardFooter className="flex flex-col space-y-2"><Button type="submit" className="w-full" disabled={isLoading}>{isLoading?(<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>登録中...</>):"登録"}</Button><p className="text-sm text-gray-600">既にアカウントをお持ちの方は <Link href="/login" className="text-blue-600 hover:underline">ログイン</Link></p></CardFooter>
   </form>
  </Card>
 </div>);
} 