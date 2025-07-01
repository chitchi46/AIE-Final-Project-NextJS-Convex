"use client";

import { DifficultyFixer } from "@/components/admin/difficulty-fixer";

export default function DifficultyFixPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">管理者ツール</h1>
          <p className="text-gray-600">システムメンテナンス用の管理機能</p>
        </div>
        
        <DifficultyFixer />
      </div>
    </div>
  );
} 