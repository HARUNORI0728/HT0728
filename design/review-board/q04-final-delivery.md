# Q-04 最終便と納品完了

2026-11-16 JST / Codex・SOL。white_void / rebuilt_village / home_inside をSOL、boreas_memorialを別SOL、camp_sunset / camp_dawnをCodexが制作し、Codexが全点を目視・ファイル照合した。

6点を `assets/backgrounds/<ID>.png` に保存。全点内蔵画像生成の無加工1672×941 RGB原本。合意済みの幅1600以上・およそ16:9に適合。WebPは1280×720。Q-04計15点、既存6点を合わせ会話背景は21点になった。ビルド・型検査成功。`tools/check-background-assets.py --planned camp_dawn --integrated white_void rebuilt_village home_inside camp_sunset camp_dawn boreas_memorial` は終了0、未納0・未登録0・仕様外0・整合性エラー0。

原本を目視し、白い空間の微かな亀裂、再建村の新しい木造家屋・麦畑・水車・玩具、家の暖炉・家族の食卓・本・杖、無銘の慰霊石と野花、同じキャンプの朝夕差分を確認。慰霊石は低めに置かれており、台詞枠との重なりは場面確認の対象。全21点の全場面・全端末のブラウザー確認は未実施。素材納品として完了し、朝版の台本への切り替えはClaude担当へ依頼する。

## 朝夕のプロンプト

camp_sunsetの参照：既存camp_day.png。

```text
Use case: lighting-weather. Asset type camp_sunset.png VN background. Input is the same refugee camp, preserve its patched tents, well, laundry, makeshift furnishings, place identity and painterly anime style. A refugee camp at sunset seen from a small rise, long shadows, orange sky, smoke rising from supper fires. View into camp from the shallow rise at its entrance, quiet evening with no people. Warm amber-orange sunset from right side, long soft shadows toward left, smoke over supper cookfires. No characters people text letters frame logo. Keep lower third simpler and a little darker for portraits/dialogue overlay. Wide16:9, 2048x1152 requested, fullbleed. Do not add elaborate buildings or change humble refugee setting.
```

camp_dawnの編集対象：生成したcamp_sunset。

```text
Use case: lighting-weather. Asset type camp_dawn.png for chapter10 predawn departure. Edit target is same refugee camp as image. Preserve exact composition, positions of tents, well, tree, mountain, furnishings, painterly anime style; change time and lighting only. Winter dawn BEFORE sunrise, cool blue-gray air and pale silver blush at LEFT eastern horizon. Sun not visible. Residual low embers at cooking fire, very faint smoke, most camp quiet and asleep with no people. The right-side sunset orange and visible sun must be completely removed. Ambient blue light with faint early light from left, no vivid orange sky or sunny afternoon. Lowerthird simpleanddark for portraits/dialogue. No characters people letters text logosframes. Wide16:9 fullbleed2048x1152 requested.
```

生成原本名：夕景exec-7d0eee85-2f1c-4327-83b6-4657936bb7d0.png、朝景exec-c7bab93c-27e6-420c-a548-240a753f7cd3.png。夕景は右側の暖かな夕陽と炊事煙、朝景は左の淡い夜明けと青灰色・残り火で区別した。

他4点の全文プロンプト・確認は `q04-ending-backgrounds.md` と `q04-memorial-delivery.md`。6点の寸法・ハッシュは `q04-final-qa.json`。
