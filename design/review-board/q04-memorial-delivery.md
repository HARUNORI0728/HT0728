# Q-04 第9章幕間「慰霊の石」

[boreas_memorial.png](../../assets/backgrounds/boreas_memorial.png) を納品。第9章幕間の既存背景IDに対応する。

- 画像生成ツールで制作。画風の参照に [廃村](../../play/assets/backgrounds/ruined_village.webp) と [夜の難民キャンプ](../../play/assets/backgrounds/camp_night.webp) を使用。
- 変換・拡大前の元画像は1672×941、RGB PNG、2,475,693バイト。デコード確認済み。16:9に近く、今回の横幅1600px以上の受け入れ条件を満たす。発注書の1920×1080には届かない。
- 崩れたアーチ、折れた柱、冷たい月光、星、無銘の石と野花を目視確認。人物と文字はない。画面下は暗い草地が中心で、石と野花は下3分の1との境界をまたぐ。台詞枠と重なったときの見え方はゲーム内で確認する。

## 生成プロンプト

```text
Use case: illustration-story. Asset: opaque wide 16:9 anime background painting for a visual-novel conversation scene in a medieval-fantasy tactical RPG. Request native 2048×1152 if supported. Image 1 ruined_village and Image 2 camp_night are style references only: follow their clean painterly anime environment painting, natural materials, softly painted contours, muted colors, and sense of depth. Paint an entirely different setting.
The collapsed stone ruins of a grand noble mansion at night, broken columns and a fallen archway overgrown with grass, a small plain memorial stone in the foreground with a few wildflowers placed on it, cold blue moonlight and stars, quiet and solemn.
Show the damaged doorway stone steps beside one unadorned, completely blank small human-placed stone. Absolutely no letters, marks, relief or inscription on the stone. Keep the stone and the few pale wildflowers centered horizontally and visible just above the lower-third dialogue area, with the framing wide enough that the stone stays modest compared with the derelict mansion and columns. Keep the entire lower third dark and simple with quiet grassy ground and subdued detail for the dialogue box. Cold natural moonlight on stone edges and a restrained starry indigo sky. No people, figures, silhouettes, readable text, frames, borders, user interface or watermarks.
```
