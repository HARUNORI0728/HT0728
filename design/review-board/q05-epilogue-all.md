# Q-05 エピローグ集合 一次候補

`art-samples/q05-ev_epilogue_all.png`。1回生成、1672×941 RGB PNG、約16:9。新しい木の門、春の花と遠い丘の添え木付き若木を目視確認。武器・文字なし。

## 人数と識別（一次目視）

顔は17人（前4・中7・後6）。前列のルーデウス、シルフィエット、エリス、アリエルは参照絵から識別できる。中列は左からロキシー、パウロらしい茶髪男性、ルイジェルド（額の赤い石）、ギレーヌ（褐色肌・獣耳・眼帯）、エリナリーゼらしい金髪エルフ、ルークらしい金髪の騎士、サラらしい金髪の女性。後列は左からザノバとして指示した体格の大きい男性、クリフらしい眼鏡の男性、リニア（短髪・立ち耳）、プルセナ（長髪・垂れ耳）、イゾルテとして指示した黒髪の鎧の女性、ペルギウスらしい銀髪の男性。

人数上の欠員は見当たらないが、参照を与えていない後方13人のうち特にザノバ、クリフ、パウロ、サラ、ルーク、イゾルテは既存の立ち絵との厳密な一致を確認できず、仮の識別。顔や衣装が一部重なり、17名全員の正確な同一性は未達・要照合。ルーデウスは画面中央よりやや左。ゲーム内での切り抜き・会話枠は未確認。合成・追加生成なし。

## 生成プロンプト全文

```text
Create one 16:9 all-ages Japanese fantasy RPG epilogue group illustration, a bright spring afternoon before a newly built wooden village gate; green hill and a small young sapling in the distance. Exactly 17 distinct adult characters, no children or unnamed extras, arranged in three staggered rows with unobstructed faces, all unarmed. The four supplied portraits define the central front row identities and outfits: center Rudeus short light brown hair, dark cloak; near him Sylphiette short white hair and pointed ears in dark teal; Eris long crimson hair in black and white; Ariel long blonde hair in white with red bow. Arrange the other 13 as distinct people, left to right: middle row Roxy blue braided hair and brown witch hat; Paul adult brown-haired man; Ruijerd bald man with red forehead jewel; Ghislaine dark-skinned muscular cat-eared woman with eyepatch; Elinalise long blonde elf woman; Luke blond knight; Sara blonde archer woman. Back row Zanoba large brown-haired man; Cliff short auburn-haired bespectacled man; Linia short gray-haired upright cat-eared woman; Pursena long gray-haired floppy dog-eared woman; Isolte dark-haired woman knight; Perugius tall silver-haired man in elaborate white clothing. Count exactly 17 unique people: four front, seven middle, six back. Every face visible, cheerful and warm, no weapons, no text or UI. Polished anime fantasy group painting, room around the whole group.
```

参照 `assets/portraits/rudeus_normal.png`、`sylphiette_normal.png`、`eris_normal.png`、`ariel_normal.png`。`transparent_background=false`。

## ザノバ・クリフ修正（1回）

初稿を `art-samples/q05-ev_epilogue_all-v1.png` に退避。後列左端を細面・おかっぱ・丸眼鏡・白い服のザノバに、隣を短い暗褐色髪・眼鏡なし・白赤の襟と黒い外套のクリフに修正。各正常立ち絵を参照。17人の顔と他の配置・背景は目視で維持され、2人の一致は初稿より改善。その他の人物の厳密な同一性は引き続き未照合。修正版1672×941 RGB、ゲーム内表示未確認。

```text
Edit image 1, the group illustration. Change ONLY the two men in the back row at upper left. Replace the far-left round-faced heavyset man with Zanoba as in image 2: a slim long-faced adult man with light-brown bowl-cut hair, round glasses, white high-collared robe with narrow red trim. Replace the adjacent red-haired man with glasses with Cliff as in image 3: a slim young adult man with short dark brown tousled hair and a cowlick, NO glasses, white high-collar outfit with red stripe and dark cloak. Keep them in their exact positions and same approximate scale, with natural friendly expressions. Preserve every other person and their appearances, all 17 faces, placement, background, gate, sapling, lighting, crop, style and composition. Do not add or remove anyone. No text, no weapons, 16:9.
```

参照：初稿、`assets/portraits/zanoba_normal.png`、`assets/portraits/cliff_normal.png`。`transparent_background=false`。

## サラ・イゾルテ修正（1回）

修正前を `art-samples/q05-ev_epilogue_all-v2.png` に退避。中列右端のサラは短い金髪、青い目、白い毛皮縁の短マントへ変更。後列右から2番のイゾルテは藍色の直毛とぱっつん、白黒の服へ変更。既存の各normalを参照。17人の顔、他の配置・背景は目視で維持。修正版1672×941 RGB。その他の人物の厳密照合とゲーム表示は未確認。

```text
Edit image 1 only. Change only two women on the right side of the group, using images 2 and 3 as identity references. The middle-row far-right blonde woman is Sara: replace her ponytail and green eyes with the short blonde bob and blue eyes of image 2, and replace green mantle with her white fur-edged short cape and dark brown outfit. No bow or weapons. The back-row second from the right is Isolte: replace the dark hair bun and silver armor with image 3's long straight deep indigo-blue hair with blunt bangs, blue eyes and white-and-black clothing. No sword. Keep both in their exact positions and scales, smiling naturally. Preserve all other fifteen people, every face, positions, gate, sapling, lighting and composition exactly. Exactly 17 people, no text, 16:9.
```

参照：v2、`assets/portraits/sara_normal.png`、`assets/portraits/isolde_normal.png`。`transparent_background=false`。
