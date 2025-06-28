#!/usr/bin/env ts-node

import { SecretsManagerClient, PutSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { spawn } from "child_process";

// コマンドライン引数の解析
const args = process.argv.slice(2);
const prevKeyIndex = args.indexOf("--prev");
const nextKeyIndex = args.indexOf("--next");

if (prevKeyIndex === -1 || nextKeyIndex === -1 || !args[prevKeyIndex + 1] || !args[nextKeyIndex + 1]) {
  console.error("Usage: npm run rotate-openai-key -- --prev <old-key> --next <new-key>");
  console.error("Example: npm run rotate-openai-key -- --prev sk-old123... --next sk-new456...");
  process.exit(1);
}

const prevKey = args[prevKeyIndex + 1];
const nextKey = args[nextKeyIndex + 1];

// APIキーの基本的な検証
if (!prevKey.startsWith("sk-") || !nextKey.startsWith("sk-")) {
  console.error("Error: OpenAI API keys should start with 'sk-'");
  process.exit(1);
}

async function rotateOpenAIKey() {
  console.log("🔄 Starting OpenAI API key rotation...");

  try {
    // 1. 新しいキーの有効性を確認
    console.log("✅ Validating new API key...");
    const testResult = await testOpenAIKey(nextKey);
    if (!testResult) {
      console.error("❌ New API key validation failed!");
      process.exit(1);
    }
    console.log("✅ New API key is valid");

    // 2. AWS Secrets Managerに新しいキーを保存
    const awsRegion = process.env.AWS_REGION || "us-east-1";
    const secretName = process.env.OPENAI_SECRET_NAME || "openai-api-key";
    
    console.log(`📦 Storing new key in AWS Secrets Manager (region: ${awsRegion})...`);
    
    const client = new SecretsManagerClient({ region: awsRegion });
    
    const command = new PutSecretValueCommand({
      SecretId: secretName,
      SecretString: JSON.stringify({
        apiKey: nextKey,
        rotatedAt: new Date().toISOString(),
        previousKey: prevKey.substring(0, 10) + "..." // 一部のみ保存
      })
    });

    try {
      await client.send(command);
      console.log("✅ New key stored in AWS Secrets Manager");
    } catch (error) {
      console.error("❌ Failed to store key in AWS Secrets Manager:", error);
      console.log("💡 Make sure you have AWS credentials configured and the secret exists");
      process.exit(1);
    }

    // 3. 旧キーの無効化（OpenAI APIを使用）
    console.log("🗑️  Revoking old API key...");
    // 注: OpenAI APIには直接キーを無効化するエンドポイントがないため、
    // ダッシュボードでの手動無効化を推奨
    console.log("⚠️  Please manually revoke the old key in OpenAI dashboard:");
    console.log("   https://platform.openai.com/api-keys");
    console.log(`   Old key: ${prevKey.substring(0, 10)}...`);

    // 4. ローカル環境変数ファイルの更新を促す
    console.log("\n📝 Next steps:");
    console.log("1. Update your .env.local file with the new key");
    console.log("2. Restart your application");
    console.log("3. Manually revoke the old key in OpenAI dashboard");
    
    console.log("\n✅ Key rotation completed successfully!");
    
  } catch (error) {
    console.error("❌ Key rotation failed:", error);
    process.exit(1);
  }
}

// OpenAI APIキーの有効性をテスト
async function testOpenAIKey(apiKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    const curlProcess = spawn("curl", [
      "-s",
      "-o", "/dev/null",
      "-w", "%{http_code}",
      "-H", `Authorization: Bearer ${apiKey}`,
      "https://api.openai.com/v1/models"
    ]);

    let output = "";
    curlProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    curlProcess.on("close", (code) => {
      const httpCode = parseInt(output.trim());
      resolve(httpCode === 200);
    });

    curlProcess.on("error", () => {
      resolve(false);
    });
  });
}

// スクリプトを実行
rotateOpenAIKey(); 