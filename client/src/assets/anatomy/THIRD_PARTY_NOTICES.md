# Third-Party Notices

This package's anatomical path data (`src/data/bodyRegions.generated.ts`) is derived from
**react-native-body-highlighter** by ELABBASSI Hicham (npm: `HichamELBSI`), an MIT-licensed
package.

Specifically: this package's SVG fragment paths and skin-outline paths are extracted, split into
finer-grained addressable pieces, and re-serialized from `react-native-body-highlighter`'s
bundled SVG path data (see `scripts/generate-body-regions.mjs` for the extraction process). No
code from `react-native-body-highlighter` is executed at runtime by this package — it is only a
build-time input, temporarily installed as a dev dependency when regenerating the data.

Because the resulting path data is a derivative of `react-native-body-highlighter`'s copyrighted
SVG assets, its original MIT license and copyright notice are reproduced below, as required by
the MIT license's terms.

---

## react-native-body-highlighter — MIT License

MIT License

Copyright (c) 2022 ELABBASSI Hicham

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
