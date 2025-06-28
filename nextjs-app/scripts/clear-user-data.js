const { ConvexHttpClient } = require("convex/browser");

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://hip-warbler-598.convex.cloud";
const client = new ConvexHttpClient(convexUrl);

async function clearUserData() {
  console.log("🧹 ユーザーデータのクリアを開始します...");
  console.log("Using Convex URL:", convexUrl);
  
  try {
    // 1. usersテーブルのデータを取得して削除
    console.log("\n📋 usersテーブルをクリア中...");
    const users = await client.query("users:list");
    for (const user of users) {
      await client.mutation("users:deleteUser", { userId: user._id });
      console.log(`  ✓ ユーザー削除: ${user.email} (${user.name})`);
    }
    
    // 2. studentsテーブルのデータを取得して削除
    console.log("\n📋 studentsテーブルをクリア中...");
    const students = await client.query("students:list");
    for (const student of students) {
      await client.mutation("students:deleteStudent", { studentId: student._id });
      console.log(`  ✓ 学生データ削除: ${student.email} (${student.name})`);
    }
    
    // 3. authAccountsテーブルを手動でクリア
    console.log("\n📋 認証アカウント（authAccounts）をクリア中...");
    const authAccounts = await client.query("auth:getAllAuthAccounts");
    for (const account of authAccounts) {
      await client.mutation("auth:deleteAuthAccount", { accountId: account._id });
      console.log(`  ✓ 認証アカウント削除: ${account.providerAccountId} (${account.provider})`);
    }
    
    // 4. responsesテーブル（学習履歴）をクリア
    console.log("\n📋 学習履歴（responses）をクリア中...");
    const responses = await client.query("qa:getAllResponses");
    for (const response of responses) {
      await client.mutation("qa:deleteResponse", { responseId: response._id });
      console.log(`  ✓ 回答履歴削除: ${response._id}`);
    }
    
    // 5. personalization_dataテーブルをクリア
    console.log("\n📋 個人化データをクリア中...");
    try {
      const personalizations = await client.query("personalization:getAllPersonalizationData");
      for (const data of personalizations) {
        await client.mutation("personalization:deletePersonalizationData", { dataId: data._id });
        console.log(`  ✓ 個人化データ削除: ${data._id}`);
      }
    } catch (error) {
      console.log("  ⚠️ 個人化データのクリアをスキップ（データが存在しないかクエリが無効）");
    }
    
    console.log("\n🎉 ユーザーデータのクリアが完了しました！");
    console.log("\n📊 保持されたデータ:");
    console.log("  - 講義データ (lectures)");
    console.log("  - 問題テンプレート (qa_templates)");
    console.log("  - ファイルデータ (files)");
    console.log("  - その他システムデータ");
    
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    console.log("\n🔧 トラブルシューティング:");
    console.log("1. Convex開発サーバーが起動していることを確認");
    console.log("2. 環境変数 NEXT_PUBLIC_CONVEX_URL が正しく設定されていることを確認");
    console.log("3. 必要な関数がconvexディレクトリに定義されていることを確認");
  }
}

// スクリプト実行の確認
if (require.main === module) {
  console.log("⚠️  警告: このスクリプトはユーザーデータを削除します");
  console.log("システムデータ（講義、問題等）は保持されます");
  console.log("\n続行するには 'y' を入力してください:");
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('> ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      clearUserData().finally(() => {
        rl.close();
        process.exit(0);
      });
    } else {
      console.log("キャンセルされました");
      rl.close();
      process.exit(0);
    }
  });
}

module.exports = { clearUserData }; 