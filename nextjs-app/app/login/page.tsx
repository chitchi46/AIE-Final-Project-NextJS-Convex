"use client";
import dynamic from "next/dynamic";
const Login = dynamic(()=>import("./_LoginClient"), { ssr: false });
export default Login; 