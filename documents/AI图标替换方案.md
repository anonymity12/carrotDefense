# AI 图标替换方案（熊猫主题）

## 1. 目标与范围
- 用 **可爱熊猫风格** 的 AI 生成图标替换现有的 `lucide-react` SVG 图标。
- 覆盖对象：塔防单位 4 个、敌人 4 个，以及 HUD 关键数值图标（预算、安全值、警报）。
- 输出格式：**透明背景 PNG (256×256)**，可同时另存一份 WebP 作为优化选项。

## 2. 生成工作流
1. **选择平台**：可使用 DALL·E 3、Gemini ImageFX、Midjourney、Stable Diffusion 等任意支持透明背景的模型。
2. **提示词模版**：
   ```
   high-resolution sticker icon, chibi panda [职业/角色描述], 
   midnight traffic enforcement theme, soft gradient background removed, 
   bold outline, transparent png, cute yet readable on mobile UI
   ```
3. **尺寸设置**：256×256 或 512×512（方便缩放）；导出 PNG 并确保背景透明。
4. **后期处理**：如需调整，可在 Photopea / Figma 中：
   - 统一裁剪为正方形
   - 加轻微内阴影以匹配 UI
   - 导出文件名遵循 `assets/iconManifest.ts` 中定义。
5. **落地**：将文件拷贝到 `public/assets/icons/`，保持命名一致。

## 3. 资源清单与提示词
> 所有规格记录在 [assets/iconManifest.ts](../assets/iconManifest.ts) 中，这里列出摘要：

| 分类 | 代号 | 文件名 | 建议提示词摘要 |
| --- | --- | --- | --- |
| 塔防 | AUXILIARY | `tower-auxiliary.png` | chibi panda auxiliary police blowing whistle, blue vest |
| 塔防 | TRAFFIC | `tower-traffic.png` | panda traffic cop with glowing stop sign, yellow vest |
| 塔防 | PATROL | `tower-patrol.png` | panda riot patrol on bike, siren lights |
| 塔防 | SWAT | `tower-swat.png` | panda SWAT officer with shield, heroic pose |
| 敌人 | SCOOTER | `enemy-scooter.png` | mischievous panda biker w/out helmet |
| 敌人 | DELIVERY | `enemy-delivery.png` | panda courier overloaded with boxes |
| 敌人 | RACER | `enemy-racer.png` | panda street racer, purple suit |
| 敌人 | MODIFIED | `enemy-modified.png` | armored boss panda biker with neon engine |
| HUD | BUDGET | `ui-budget.png` | panda coin pouch, gold coins |
| HUD | SAFETY | `ui-safety.png` | heart badge with panda face |
| HUD | WAVE | `ui-wave.png` | alert siren shaped like panda ears |

> 生成时附加统一风格说明：
> `soft rim lighting, gentle ambient occlusion, midnight blue palette, kawaii panda police theme`

## 4. 命名与版本
- 文件命名：`[类别]-[代号].png`，全部小写、连字符。
- 如果有多版本，使用 `@2x`、`@alt` 后缀存放在同目录，修改 manifest 对应路径即可。
- 建议保留原始 prompt 与模型参数，方便迭代；可在本文件后追加附录。

## 5. 代码接入说明
- 运行时代码读取 `public/assets/icons/*.png`（见 [components/Game.tsx](../components/Game.tsx)）。
- 若图像加载失败，前端会自动回退到原 `lucide-react` 图标，保障可用性。
- 替换流程：
  1. 将生成的 PNG 拷贝至 `public/assets/icons/`。
  2. 保证文件名与 manifest 匹配。
  3. 无需重启，Vite 会热更新资源。

## 6. 维护建议
- 新增单位或敌人时，先在 `assets/iconManifest.ts` 中定义规格，再生成图像。
- 若需多语言/主题版本，可在 manifest 中添加不同 `category` 或 `styleNotes`。
- 为便于协作，可在版本库中保留源图与许可信息（若模型要求标注）。

---
**最后更新**：2025-12-16
