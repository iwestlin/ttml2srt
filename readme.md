convert ttml to srt
---

copied from https://github.com/seiya-npm/ttml2srt
with two modifications:

- decode html entities
- if next line beginning time(b) is earlier than current line endding time(a), change a to b

for example:
```text
1
00:00:01,140 --> 00:00:06,640
[Music]

2
00:00:04,560 --> 00:00:06,640
hello and welcome to the first live
```
will change to:
```text
1
00:00:01,140 --> 00:00:04,560
[Music]

2
00:00:04,560 --> 00:00:06,640
hello and welcome to the first live
```
