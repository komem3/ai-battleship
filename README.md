# AI にバトルシップゲームを作らせている

## Claude

- websocket周りでつまったので、playwright の mcp を導入したところ突破できた。
- 色を変更するロジックのバグを直せなかったが、簡単なロジックだったので手で直ししたりした。
- spec.md に質問をしろと書いたが基本的には質問をしなかった。
- ただ、最初は砲撃できる範囲がとても大きかったり、移動が不可能だったりとバトルシップのルールは満たしていなかった。
- 水しぶきなどもなかった。
- webRTC による P2P を作らせようとしたが、webRTC だけ入れて、結局 websocket による通信でゲームの進行を行うようにしていた。
- p2p にしようとしたが、難しそうだったため、spec.md を変更し、以降は websocket オンリーにんするように変更。
- 一度 webRTC のコードを削除後、再度 webRTC を実装させたら上手くいった。そのため、最初から webRTC は難しかったよう。

全体的に動作確認して気付いたバグを直せと言っても直せないことが殆んどだった。MCPの playwright を使うことで、コンソールログなどを確認し正確にバグの位置を特定して解決することはできた。
最終的に出きたものは問題なくできた感じはする。

https://battleship-1b4f8.web.app/
