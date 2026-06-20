# Repository 結構重整設計

## 目標

重新整理 Bitget Trading Agents repository，使產品文件、Hackathon 資料、開發規格、功能模組與外部整合各自具有清楚位置。本次只調整檔案結構與相關引用，不修改產品功能、資料契約或 UI 行為。

## 目標結構

```text
bitget-trading-agents/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
├── tsconfig.typecheck.json
├── vitest.config.ts
├── eslint.config.mjs
├── .env.example
├── .gitignore
├── docs/
│   ├── product/
│   │   └── PROJECT_SPEC.md
│   ├── hackathon/
│   │   └── OFFICIAL_HACKATHON_REQUIREMENTS.md
│   └── development/
│       ├── specs/
│       └── plans/
├── public/
├── playbooks/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── dashboard/
│   │   └── ui/
│   ├── features/
│   │   ├── market-analysis/
│   │   ├── decision/
│   │   ├── paper-trading/
│   │   ├── strategy-lab/
│   │   └── playbook-evidence/
│   ├── integrations/
│   │   ├── bitget/
│   │   ├── agent-hub/
│   │   └── llm/
│   └── shared/
│       ├── schemas/
│       ├── types/
│       └── utils/
└── tests/
    ├── unit/
    ├── integration/
    ├── fixtures/
    └── e2e/
```

只建立包含實際檔案的目錄。`public/`、`playbooks/`、尚未使用的 integration、component、shared 與 test 子目錄不加入 `.gitkeep`。

## 檔案移動

| 現有路徑 | 新路徑 |
| --- | --- |
| `docs/PROJECT_SPEC.md` | `docs/product/PROJECT_SPEC.md` |
| `docs/OFFICIAL_HACKATHON_REQUIREMENTS.md` | `docs/hackathon/OFFICIAL_HACKATHON_REQUIREMENTS.md` |
| `docs/superpowers/specs/*` | `docs/development/specs/*` |
| `docs/superpowers/plans/*` | `docs/development/plans/*` |

目前 `src/features/*`、`src/app/*` 與 `tests/unit/*` 已符合目標責任，保留原位。本次不建立尚無實作內容的 `src/integrations/*`、`src/components/*` 或 `src/shared/*`。

## 引用與設定

- 更新 `AGENTS.md` 的產品規格及官方活動文件路徑。
- 更新 `README.md` 的文件索引與 repository 結構說明。
- 搜尋整個 repository，修正所有指向舊 `docs/` 路徑的 Markdown links 或純文字引用。
- 若 TypeScript、Vitest 或 Next.js 設定引用被移動檔案，按新路徑同步修改；預期目前沒有此類引用。
- 不改變 package scripts、runtime dependencies 或 public contracts。

## 生成內容

- 刪除 root 的 `tsconfig.tsbuildinfo` 與 `tsconfig.typecheck.tsbuildinfo`；它們可由 TypeScript 重新產生且已被 Git 忽略。
- `.next/` 與 `node_modules/` 保留在本機原位，不納入 repository 結構，也不移動進其他資料夾。
- 確認 `.gitignore` 持續排除 build、cache、coverage、環境變數及本地 evidence。

## 驗證

完成移動與引用更新後執行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

另外檢查：

- repository 內不存在指向舊文件位置的引用。
- `git status` 只包含本次結構重整相關變更。
- 應用程式首頁與測試仍能找到文件連結。
- repository 不包含 secrets 或自動生成檔案。

## 非本次範圍

- 不實作市場資料、decision engine、paper trading、Strategy Lab 或 Playbook。
- 不增加 dependency、UI framework、database 或 deployment 設定。
- 不重構既有 contracts、測試內容或頁面視覺。
